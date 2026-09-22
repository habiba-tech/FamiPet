// =========================================================
// PetGPT structured logging (Phase 6)
// ---------------------------------------------------------
// One JSON object per line, tagged by level + event, so diagnostics
// are greppable by event without any logging dependency.
//
// What may be logged: ids, statuses, counts, durations, provider/
// model labels, tool names + ok flags. What must NEVER be logged:
// API keys, Authorization headers, encrypted provider secrets
// (apiKeyEnc), raw provider request/response payloads, or full
// sensitive pet data. Tool results/arguments are deliberately not
// logged here — the bounded tool-call metadata persisted on
// assistant messages is the audit record.
// =========================================================

function logEvent(level, event, fields = {}) {
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

module.exports = { logEvent };