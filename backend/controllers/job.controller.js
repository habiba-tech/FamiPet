// =========================================================
// PetGPT job status controller (Phase 4)
// ---------------------------------------------------------
// Read-only status endpoint for durable generation jobs. Every
// lookup is scoped { _id, owner: req.user._id }; foreign or
// unknown ids return 404 (identical to each other, no existence
// leak). Responses expose the lifecycle state plus, on success,
// the persisted assistant message — never internal errors, API
// keys, or provider credentials.
// =========================================================

const mongoose = require("mongoose");
const GenerationJob = require("../models/GenerationJob");
const Message = require("../models/Message");
const { publicMessage } = require("../ai/context");

// Safe job shape shared by the message-submit response and this API.
function publicJob(job) {
  return {
    id: job._id,
    status: job.status,
    provider: job.provider || null,
    model: job.model || null,
    attemptCount: job.attemptCount || 0,
    conversationId: job.conversation,
    userMessageId: job.userMessage,
    assistantMessageId: job.assistantMessage || null,
    error: job.error && job.error.code ? { code: job.error.code, message: job.error.message } : null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    failedAt: job.failedAt || null,
  };
}

// GET /api/ai/jobs/:id — ownership-scoped generation status.
exports.getJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid job ID." });
    }

    const job = await GenerationJob.findOne({ _id: id, owner: req.user._id }).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found or not owned by you." });
    }

    const [userMessage, assistantMessage] = await Promise.all([
      Message.findById(job.userMessage).lean(),
      job.assistantMessage ? Message.findById(job.assistantMessage).lean() : Promise.resolve(null),
    ]);

    res.json({
      success: true,
      job: publicJob(job),
      userMessage: publicMessage(userMessage),
      assistantMessage: publicMessage(assistantMessage),
    });
  } catch (error) {
    console.error("PetGPT: get job failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

module.exports = { getJob: exports.getJob, publicJob };