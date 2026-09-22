const express = require("express");
const { protect } = require("../middleware/auth");
const {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
} = require("../controllers/provider.controller");

const router = express.Router();

// Every provider configuration route requires an authenticated user.
router.use(protect);

// List the user's provider configurations (safe fields only).
router.get("/", listProviders);

// Create a provider configuration.
router.post("/", createProvider);

// Test a provider configuration with its stored credentials (no persistence).
router.post("/:id/test", testProvider);

// Update a provider configuration.
router.patch("/:id", updateProvider);

// Delete a provider configuration.
router.delete("/:id", deleteProvider);

module.exports = router;