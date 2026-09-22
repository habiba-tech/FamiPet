// =========================================================
// PetGPT mutation tools (Phase 6)
// ---------------------------------------------------------
// The ONLY way the model can change FamiPet data, and deliberately
// limited to low-risk, clearly authorized actions:
//
//   create_reminder    — create a reminder on the authenticated user's
//                        own pet (additive, never overwrites anything).
//   complete_reminder  — mark one of the user's own reminders completed
//                        (a reversible status flag; nothing is deleted).
//
// Destructive/high-risk mutations (delete, hard update of existing
// records, booking confirmations, payments) are intentionally NOT
// implemented: there is no confirmation UX for them, so they stay out
// (product rule 5 + petGPT.md §20). The model's requested action is
// reported as success ONLY after the backend write is verified
// (Reminder.create/findOneAndUpdate), and a retried job replays the
// recorded result instead of executing twice (registry + MutationEffect
// ledger). Provider-neutral: no provider knowledge lives here.
// =========================================================

const { registerTool, ToolError, TOOL_ERRORS } = require("./registry");
const { requireOwnedPet, isValidObjectId } = require("../pet-context");
const Reminder = require("../../models/Reminder");

const REMINDER_TYPES = ["feeding", "medicine", "vaccination", "grooming", "appointment", "exercise", "custom"];
const REMINDER_FREQUENCIES = ["once", "daily", "weekly", "monthly"];

function normalizeCreatedReminder(r) {
  return {
    id: r._id,
    title: r.title,
    type: r.type,
    description: r.description || undefined,
    date: r.date,
    time: r.time,
    frequency: r.frequency,
    petId: r.pet,
    isActive: !!r.isActive,
    isCompleted: !!r.isCompleted,
  };
}

// Ownership gate for pet-scoped mutations. Unlike the read-tool gate
// this returns the FULL validated args (minus none), so the caller keeps
// every field it needs after the ownership check passed. Foreign/invalid
// pet ids fail identically ("not found or not owned").
async function authorizePetMutation({ args, userId }) {
  const pet = await requireOwnedPet(userId, args && args.petId);
  if (!pet) {
    throw new ToolError(TOOL_ERRORS.FORBIDDEN, "Pet not found or not owned by you.");
  }
  return { ...args, petId: args.petId };
}

function registerMutationTools() {
  registerTool({
    name: "create_reminder",
    description:
      "Create a reminder for one of the authenticated user's own pets (e.g. feeding, medicine, vaccination). Requires petId, title, a valid date (YYYY-MM-DD) and time (HH:MM). Confirms with the user first, then reports the created reminder exactly as returned.",
    readOnly: false,
    schema: {
      type: "object",
      properties: {
        petId: { type: "string", description: "The authenticated user's pet ID." },
        title: { type: "string", description: "Short reminder title." },
        type: { type: "string", description: "One of: feeding, medicine, vaccination, grooming, appointment, exercise, custom." },
        description: { type: "string", description: "Optional reminder notes." },
        date: { type: "string", description: "Reminder date in YYYY-MM-DD format." },
        time: { type: "string", description: "Reminder time in HH:MM format." },
        frequency: { type: "string", description: "Optional: once, daily, weekly or monthly. Defaults to once." },
      },
      required: ["petId", "title", "type", "date", "time"],
    },
    authorize: authorizePetMutation,
    execute: async ({ args, userId }) => {
      if (!REMINDER_TYPES.includes(args.type)) {
        throw new ToolError(TOOL_ERRORS.ARGS, `Argument "type" must be one of: ${REMINDER_TYPES.join(", ")}.`);
      }
      if (args.frequency && !REMINDER_FREQUENCIES.includes(args.frequency)) {
        throw new ToolError(TOOL_ERRORS.ARGS, `Argument "frequency" must be one of: ${REMINDER_FREQUENCIES.join(", ")}.`);
      }
      if (typeof args.title !== "string" || !args.title.trim()) {
        throw new ToolError(TOOL_ERRORS.ARGS, 'Argument "title" must be a non-empty string.');
      }
      if (typeof args.time !== "string" || !args.time.trim()) {
        throw new ToolError(TOOL_ERRORS.ARGS, 'Argument "time" must be a non-empty string.');
      }
      const date = new Date(args.date);
      if (Number.isNaN(date.getTime())) {
        throw new ToolError(TOOL_ERRORS.ARGS, 'Argument "date" must be a valid YYYY-MM-DD date.');
      }

      if (!userId) {
        throw new ToolError(TOOL_ERRORS.FORBIDDEN, "Authenticated user is required.");
      }
      const reminder = await Reminder.create({
        user: userId,
        pet: args.petId,
        title: String(args.title).trim(),
        type: args.type,
        description: args.description ? String(args.description).trim() : "",
        date,
        time: String(args.time).trim(),
        frequency: args.frequency || "once",
      });

      // Return the normalized, bounded record — success is only claimed
      // now that the backend write actually succeeded.
      return { reminder: normalizeCreatedReminder(reminder) };
    },
  });

  registerTool({
    name: "complete_reminder",
    description:
      "Mark one of the authenticated user's own reminders as completed by its reminder ID. Confirms with the user first, then reports the completed reminder exactly as returned.",
    readOnly: false,
    schema: {
      type: "object",
      properties: {
        reminderId: { type: "string", description: "The user's own reminder ID." },
      },
      required: ["reminderId"],
    },
    execute: async ({ args, userId }) => {
      if (!userId) {
        throw new ToolError(TOOL_ERRORS.FORBIDDEN, "Authenticated user is required.");
      }
      if (!isValidObjectId(args.reminderId)) {
        throw new ToolError(TOOL_ERRORS.ARGS, 'Argument "reminderId" must be a valid reminder ID.');
      }
      const reminder = await Reminder.findOneAndUpdate(
        { _id: args.reminderId, user: userId },
        { isCompleted: true },
        { new: true, runValidators: true }
      );
      if (!reminder) {
        // Foreign or unknown reminder ids fail identically (no existence oracle).
        throw new ToolError(TOOL_ERRORS.FORBIDDEN, "Reminder not found or not owned by you.");
      }
      return { reminder: normalizeCreatedReminder(reminder) };
    },
  });
}

module.exports = { registerMutationTools, normalizeCreatedReminder, REMINDER_TYPES, REMINDER_FREQUENCIES };