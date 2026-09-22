// =========================================================
// PetGPT per-user generation quota (Phase 6)
// ---------------------------------------------------------
// Backend-enforced fixed-window cap on durable generations. Every
// in-scope exchange — normal chat AND the tool-calling path — creates
// exactly one GenerationJob, so counting the authenticated user's jobs
// inside the current window IS the usage ledger. No second counting
// system, no in-memory counters that reset on restart: the durable DB
// and the quota share one source of truth.
//
// The controller calls enforceGenerationQuota() BEFORE persisting the
// user message / creating a job, so an exceeded limit returns a
// deterministic 429 and never creates an orphan message or job.
// Out-of-scope (no provider) exchanges create no job and are therefore
// never counted — they cost nothing.
//
// Config: AI_CONFIG.rateLimit { max, windowMs } (env PETGPT_RATE_LIMIT_MAX
// and PETGPT_RATE_LIMIT_WINDOW_MS).
// =========================================================

const { AI_CONFIG } = require("../config/ai");
const GenerationJob = require("../models/GenerationJob");

// Returns { allowed: true } or { allowed: false, count, max, windowMs }.
async function enforceGenerationQuota(userId) {
  const { max, windowMs } = AI_CONFIG.rateLimit;
  if (!userId) return { allowed: true };
  const since = new Date(Date.now() - windowMs);
  const count = await GenerationJob.countDocuments({
    owner: userId,
    createdAt: { $gte: since },
  });
  return { allowed: count < max, count, max, windowMs };
}

module.exports = { enforceGenerationQuota };