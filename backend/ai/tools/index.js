// =========================================================
// PetGPT tools (Phase 5) — entry point
// ---------------------------------------------------------
// Registers all tool implementations and exposes the registry surface
// used by the tool-calling loop and tests.
// =========================================================

const { registerReadTools } = require("./read-tools");
const { registerMutationTools } = require("./mutation-tools");

// Read tools (Phase 5) + mutation tools (Phase 6) — all registered at
// load time, exactly once, so the worker/loop/tests share one registry.
registerReadTools();
registerMutationTools();

module.exports = {
  ...require("./registry"),
  registerReadTools,
  registerMutationTools,
};