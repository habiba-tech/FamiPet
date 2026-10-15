// =========================================================
// Appointment time helpers (single source of truth)
// ---------------------------------------------------------
// An appointment is stored as a `date` (a Date) + a free-text `time`
// string. This module is the ONLY definition of "this appointment's
// moment has passed", shared by the REST response (appointment
// controller) and PetGPT (ai/pet-context.js) so the two never disagree.
//
// Everything is computed in UTC: `date` is persisted at UTC midnight of
// the chosen calendar day (the UI sends "YYYY-MM-DD" into `new Date()`),
// so combining it with the time in the same frame is the one unambiguous
// interpretation available. No local-timezone data exists to do better.
// =========================================================

// "14:30", "2:30 PM", "9am", "9" -> minutes past midnight, or null if the
// string cannot be understood. A bare hour is accepted (legacy/AI input).
function parseTimeOfDay(time) {
  const match = String(time || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3] ? match[3].toLowerCase() : null;

  if (meridiem) {
    if (hour === 12) hour = 0;
    if (meridiem === "pm") hour += 12;
  }
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

// The UTC instant an appointment with this date + time starts. Returns null
// when the date is missing/unparseable. An unparseable TIME is treated as
// midnight so the appointment still ages out with its day.
function appointmentDateTime(date, time) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const minutes = parseTimeOfDay(time) ?? 0;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(minutes / 60), minutes % 60, 0, 0)
  );
}

function isAppointmentPast(date, time, now = new Date()) {
  const at = appointmentDateTime(date, time);
  return at !== null && at.getTime() < now.getTime();
}

// A pending/confirmed appointment whose moment has passed is history, not
// "upcoming". Terminal states (completed/cancelled/no-show) and any future
// appointment are returned unchanged.
function effectiveAppointmentStatus(status, date, time, now = new Date()) {
  if (status === "pending" || status === "confirmed") {
    return isAppointmentPast(date, time, now) ? "completed" : status;
  }
  return status;
}

module.exports = { parseTimeOfDay, appointmentDateTime, isAppointmentPast, effectiveAppointmentStatus };
