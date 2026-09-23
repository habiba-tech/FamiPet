const express = require("express");
const { protect } = require("../middleware/auth");
const { getJob } = require("../controllers/job.controller");

const router = express.Router();

// Job status API is ownership-scoped (authenticated user only).
router.use(protect);

// Get the state of a durable generation job (and its persisted
// assistant message when the job completed).
router.get("/:id", getJob);

module.exports = router;