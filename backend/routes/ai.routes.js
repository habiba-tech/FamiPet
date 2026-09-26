const express = require("express");

const router = express.Router();

const {
  askPetGPT,
  getPetAdvice,
} = require("../controllers/ai.controller");

const { protect } = require("../middleware/auth");

// Ask PetGPT
router.post("/ask", protect, askPetGPT);

// Get advice for a pet
router.post("/advice", protect, getPetAdvice);

// Persistent conversations (Phase 2), mounted under /api/ai/conversations
router.use("/conversations", require("./conversation.routes"));

// User-owned provider/API-key configuration (Phase 3)
router.use("/providers", require("./provider.routes"));

// Durable generation job status (Phase 4)
router.use("/jobs", require("./job.routes"));

module.exports = router;