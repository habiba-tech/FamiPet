// =========================================================
// PetGPT durable generation worker (Phase 4)
// ---------------------------------------------------------
// In-process polling worker. Calls the ORIGINAL business reply
// path — none of it tied to an HTTP request — so a generation
// survives page refresh, navigation, focus loss, disconnects,
// and closed tabs. The database preserves the persisted state;
// the request that queued a job may already be gone.
//
//   queued ──claim──▶ processing ──generate──▶ completed
//     ▲                    │
//     └──reap (stale)──────┘
//                          └──bounded retries exhausted──▶ failed
//
// Concurrency: claims use a single atomic status-conditioned
// findOneAndUpdate (queued -> processing); two workers or loops
// can never both claim the same job.
//
// ponytail: single in-process poller, one job at a time, no
// durable queue. Durability ceiling: jobs are stored in Mongo but
// the loop lives in the API process — a process restart requires
// the reaper to re-enqueue stale jobs, and long provider calls
// stall newer jobs until they finish. Upgrade path: a separate
// worker process/container, or an external queue, only when
// throughput or process isolation actually matters.
// =========================================================

const { AI_CONFIG, buildSystemPrompt } = require("../config/ai");
const GenerationJob = require("../models/GenerationJob");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const {
  resolveActiveProviderConfig,
  generatePetGPTResponse,
  buildProviderRequest,
  getActiveProvider,
} = require("../ai");
const {
  buildConversationContext,
  buildProviderMessages,
  updateConversationMetadata,
} = require("../ai/context");
const { canUseTools, runToolCallingLoop } = require("../ai/tool-calling");

const POLL_MS = AI_CONFIG.worker.pollMs;
const STALE_MS = AI_CONFIG.worker.staleMs;
const MAX_ATTEMPTS = AI_CONFIG.worker.maxAttempts;

const SAFE_ERRORS = Object.freeze({
  PROVIDER: { code: "provider", message: "AI generation failed. Please try again." },
  CONVERSATION: { code: "conversation", message: "The conversation is no longer available." },
  MESSAGE: { code: "message", message: "The message is no longer available." },
  TIMEOUT: { code: "timeout", message: "The generation attempt timed out." },
  INTERNAL: { code: "internal", message: "Something went wrong." },
});

let timer = null;
let busy = false;

// Claim the oldest queued job. Atomic queued -> processing; returns
// null when nothing was claimable (e.g. another worker won the race).
async function claimNext() {
  return GenerationJob.findOneAndUpdate(
    { status: "queued" },
    { $set: { status: "processing", startedAt: new Date() }, $inc: { attemptCount: 1 } },
    { sort: { createdAt: 1, _id: 1 }, new: true }
  );
}

// Recover jobs a crashed/long-gone process left in processing.
// Bounded retry: re-enqueues while attemptCount < maxAttempts,
// otherwise fails them. Never an infinite retry loop.
async function reapStale() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await GenerationJob.find({ status: "processing", startedAt: { $lte: cutoff } }).lean();
  for (const job of stale) {
    if (job.attemptCount >= MAX_ATTEMPTS) {
      await fail(job._id, SAFE_ERRORS.TIMEOUT);
      console.error(`PetGPT: job ${job._id} failed after ${job.attemptCount} attempt(s) left it stalled (timeout).`);
    } else {
      await GenerationJob.updateOne(
        { _id: job._id, status: "processing" },
        { $set: { status: "queued", startedAt: null } }
      );
      console.warn(`PetGPT: job ${job._id} re-enqueued after being left in processing (attempt ${job.attemptCount + 1}/${MAX_ATTEMPTS}).`);
    }
  }
}

async function fail(jobId, safeError) {
  await GenerationJob.findOneAndUpdate(
    { _id: jobId, status: { $in: ["processing", "queued"] } },
    { $set: { status: "failed", error: { code: safeError.code, message: safeError.message }, failedAt: new Date() } }
  );
}

// Run the provider exchange for one job — tool-calling path or legacy
// generate() — entirely inside the durable worker lifecycle. Returns
// { answer, toolLog } on success, or { error: SAFE_ERRORS.* }. No tool
// execution ever happens inside the HTTP request that queued the job.
async function generateJobAnswer({ providerConfig, providerType, userId, userMessage, context }) {
  // Phase 5 tool path: ONLY for providers that declared tool calling.
  // Others (e.g. Gemini) keep the legacy single-turn path unchanged.
  if (canUseTools(providerType)) {
    let request;
    try {
      // Stored user config: decrypt the key here, immediately before the
      // request (fail closed on a missing encryption secret). Env config:
      // the active adapter + the system-level OpenAI-compatible config.
      request = providerConfig
        ? buildProviderRequest(providerConfig)
        : { adapter: getActiveProvider(), config: AI_CONFIG.openai };
    } catch (error) {
      console.error(`PetGPT: tool path provider resolution failed (${providerType}): ${error.message}`);
      return { error: SAFE_ERRORS.PROVIDER };
    }

    const messages = buildProviderMessages({
      system: buildSystemPrompt(),
      history: context.history,
      petContext: context.petContext,
      question: userMessage.content,
    });

    const result = await runToolCallingLoop({
      adapter: request.adapter,
      config: request.config,
      messages,
      userId,
    });

    // Transport/HTTP provider failure mid-loop: safe client error, never
    // a fabricated answer. Bounded-exhaustion and clean finishes carry
    // real model text (may be null when the model never produced any).
    if (result.reason === "error") {
      return { error: SAFE_ERRORS.PROVIDER };
    }
    return { answer: result.text || null, toolLog: result.toolLog || [] };
  }

  const answer = await generatePetGPTResponse(
    userMessage.content,
    context.petContext,
    context.history,
    providerConfig
  );
  return { answer };
}

// Run one claimed job to completion/failure.
async function runJob(job) {
  try {
    const conversation = await Conversation.findOne({ _id: job.conversation, owner: job.owner });
    if (!conversation) {
      // Conversation cleared/deleted while the job was queued.
      return await fail(job._id, SAFE_ERRORS.CONVERSATION);
    }

    const userMessage = await Message.findOne({ _id: job.userMessage, conversation: job.conversation, role: "user" }).lean();
    if (!userMessage) {
      return await fail(job._id, SAFE_ERRORS.MESSAGE);
    }

    // Provider resolution happens here, in the worker, owner-scoped
    // (Phase 3 rules): the authenticated owner's active provider, or
    // the system env configuration. Never another user's provider.
    const providerConfig = await resolveActiveProviderConfig(job.owner);
    const providerType = providerConfig ? providerConfig.provider : AI_CONFIG.provider;
    const provider = providerConfig ? providerConfig.name || providerConfig.provider : "env";
    const model = providerConfig ? providerConfig.model : "";
    await GenerationJob.updateOne(
      { _id: job._id, status: "processing" },
      { $set: { provider, model } }
    );

    // Shared Phase 2 context assembly: bounded history + own pets.
    const context = await buildConversationContext({
      conversationId: job.conversation,
      userId: job.owner,
      excludeMessageId: job.userMessage,
    });

    const result = await generateJobAnswer({
      providerConfig,
      providerType,
      userId: job.owner,
      userMessage,
      context,
    });

    if (result.error) {
      return await fail(job._id, result.error);
    }

    const answer = result.answer;
    if (!answer) {
      // Provider failed with no real text (generatePetGPTResponse already
      // logged the normalized code server-side). No fabricated success, no
      // fallback posing as an AI answer.
      return await fail(job._id, SAFE_ERRORS.PROVIDER);
    }

    // Persist bounded, secret-free tool metadata when the tool path ran.
    const assistantMessage = await Message.create({
      conversation: job.conversation,
      role: "assistant",
      content: answer,
      ...(result.toolLog && result.toolLog.length ? { toolCalls: result.toolLog } : {}),
    });

    // Terminal transition processing -> completed. If the job was
    // deleted concurrently (clear-chat), this no-ops safely.
    await GenerationJob.findOneAndUpdate(
      { _id: job._id, status: "processing" },
      { $set: { status: "completed", assistantMessage: assistantMessage._id, completedAt: new Date() } }
    );

    await updateConversationMetadata(conversation, userMessage.content, answer);
    const toolNote = result.toolLog && result.toolLog.length ? `, ${result.toolLog.length} tool call(s)` : "";
    console.log(`PetGPT: job ${job._id} completed via provider "${provider}" (${assistantMessage.content.length} chars${toolNote}).`);
  } catch (error) {
    console.error(`PetGPT: job ${job._id} failed unexpectedly:`, error.message);
    await fail(job._id, SAFE_ERRORS.INTERNAL);
  }
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    await reapStale();
    const job = await claimNext();
    if (job) await runJob(job);
  } catch (error) {
    console.error("PetGPT: worker tick failed:", error.message);
  } finally {
    busy = false;
  }
}

function startWorker() {
  if (timer) return timer;
  timer = setInterval(() => { tick().catch(() => {}); }, POLL_MS);
  if (timer.unref) timer.unref();
  console.log(`PetGPT: durable generation worker started (poll ${POLL_MS}ms, stale ${STALE_MS}ms, maxAttempts ${MAX_ATTEMPTS}).`);
  return timer;
}

function stopWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startWorker, stopWorker, claimNext, reapStale, POLL_MS, STALE_MS, MAX_ATTEMPTS };