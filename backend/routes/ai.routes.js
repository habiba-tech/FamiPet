const express = require("express");

const router = express.Router();

const {
  askPetGPT,
  getPetAdvice,
} = require("../controllers/ai.controller");

const { protect } = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");

// AI endpoints are externally metered (Gemini API); throttle
// to prevent quota exhaustion / abuse.
const aiLimiter = rateLimiter({ windowMs: 60 * 1000, max: 30 });

// Ask PetGPT
router.post("/ask", protect, aiLimiter, askPetGPT);

// Get advice for a pet
router.post("/advice", protect, aiLimiter, getPetAdvice);

// Persistent conversations (Phase 2), mounted under /api/ai/conversations
router.use("/conversations", require("./conversation.routes"));

// User-owned provider/API-key configuration (Phase 3)
router.use("/providers", require("./provider.routes"));

// Durable generation job status (Phase 4)
router.use("/jobs", require("./job.routes"));

module.exports = router;