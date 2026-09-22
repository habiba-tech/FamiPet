// =========================================================
// PetGPT tools (Phase 5) — entry point
// ---------------------------------------------------------
// Registers all tool implementations and exposes the registry surface
// used by the tool-calling loop and tests.
// =========================================================

const { registerReadTools } = require("./read-tools");

registerReadTools();

module.exports = {
  ...require("./registry"),
  registerReadTools,
};