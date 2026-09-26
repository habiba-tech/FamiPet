// =========================================================
// PetGPT read-only tools (Phase 5)
// ---------------------------------------------------------
// Each tool maps to an actual FamiPet data model/capability that already
// exists in the backend (Pet, HealthRecord, Vaccination, Appointment,
// Reminder). Nothing here invents functionality: if a category has no
// backing model, it has no tool (e.g. no diet model -> no diet tool).
//
// Authorization: every pet-scoped tool first calls requireOwnedPet(userId,
// petId). A model-supplied pet ID is untrusted input; ownership is
// re-checked in backend code on every call. Foreign/invalid/missing pets
// fail identically ("not found or not owned"), so the model cannot probe
// other users' data.
//
// Mutation policy (Phase 5): all tools here are read-only. Mutating
// FamiPet features (create reminders, book appointments, update health
// records) are deferred to a later phase — see petGPT.md §19.
// =========================================================

const { registerTool, ToolError, TOOL_ERRORS } = require("./registry");
const {
  requireOwnedPet,
  normalizePet,
  normalizeHealth,
  normalizeVaccination,
  normalizeAppointment,
  normalizeReminder,
} = require("../pet-context");
const Pet = require("../../models/Pet");
const HealthRecord = require("../../models/HealthRecord");
const Vaccination = require("../../models/Vaccination");
const Appointment = require("../../models/Appointment");
const Reminder = require("../../models/Reminder");
const { AI_CONFIG } = require("../../config/ai");

// Shared per-pet authorization gate used by every pet-scoped tool.
// Returns the scoped arguments after a positive ownership check, or
// throws FORBIDDEN (identical outcome for foreign/missing/invalid ids).
async function authorizeOwnedPet({ args, userId }) {
  const pet = await requireOwnedPet(userId, args && args.petId);
  if (!pet) {
    throw new ToolError(TOOL_ERRORS.FORBIDDEN, "Pet not found or not owned by you.");
  }
  return { petId: args.petId };
}

function petIdSchema() {
  return {
    type: "object",
    properties: { petId: { type: "string", description: "The authenticated user's pet ID." } },
    required: ["petId"],
  };
}

const MAX = () => AI_CONFIG.tools.maxResults;

function registerReadTools() {
  registerTool({
    name: "get_my_pets",
    description:
      "List the authenticated user's own pets (id, name, species, breed, gender, age, weight, color, vaccinated, description). Returns an empty list when the user has no pets.",
    readOnly: true,
    schema: { type: "object", properties: {}, required: [] },
    execute: async ({ userId }) => {
      const pets = await Pet.find({ owner: userId })
        .populate("breed", "name")
        .sort({ createdAt: -1 })
        .limit(MAX())
        .lean();
      return { pets: pets.map(normalizePet).filter(Boolean) };
    },
  });

  registerTool({
    name: "get_pet_details",
    description:
      "Get details of one of the authenticated user's own pets by its id (identity, species, breed, gender, age, weight, status).",
    readOnly: true,
    schema: petIdSchema(),
    authorize: authorizeOwnedPet,
    execute: async ({ args, userId }) => {
      const pet = await requireOwnedPet(userId, args.petId);
      return { pet };
    },
  });

  registerTool({
    name: "get_pet_health",
    description:
      "Get the most recent health records of one of the user's own pets (diagnosis, treatment, doctor, hospital, visit date, next visit). Empty array when none exist.",
    readOnly: true,
    schema: petIdSchema(),
    authorize: authorizeOwnedPet,
    execute: async ({ args, userId }) => {
      const records = await HealthRecord.find({ user: userId, pet: args.petId })
        .sort({ visitDate: -1 })
        .limit(MAX())
        .lean();
      return { healthRecords: records.map(normalizeHealth).filter(Boolean) };
    },
  });

  registerTool({
    name: "get_pet_vaccinations",
    description:
      "Get the vaccination history of one of the user's own pets (vaccine name, dose, vaccination date, next due date, status). Empty array when none exist.",
    readOnly: true,
    schema: petIdSchema(),
    authorize: authorizeOwnedPet,
    execute: async ({ args, userId }) => {
      const vaccinations = await Vaccination.find({ user: userId, pet: args.petId })
        .sort({ vaccinationDate: -1 })
        .limit(MAX())
        .lean();
      return { vaccinations: vaccinations.map(normalizeVaccination).filter(Boolean) };
    },
  });

  registerTool({
    name: "get_pet_appointments",
    description:
      "Get the appointments of one of the user's own pets (date, time, type, status, symptoms, notes, veterinarian). Empty array when none exist.",
    readOnly: true,
    schema: petIdSchema(),
    authorize: authorizeOwnedPet,
    execute: async ({ args, userId }) => {
      const appointments = await Appointment.find({ user: userId, pet: args.petId })
        .populate("veterinarian", "name clinic specialization")
        .sort({ date: 1, time: 1 })
        .limit(MAX())
        .lean();
      return { appointments: appointments.map(normalizeAppointment).filter(Boolean) };
    },
  });

  registerTool({
    name: "get_pet_reminders",
    description:
      "Get the reminders set for one of the user's own pets (title, type, date, time, frequency, active/completed). Empty array when none exist.",
    readOnly: true,
    schema: petIdSchema(),
    authorize: authorizeOwnedPet,
    execute: async ({ args, userId }) => {
      const reminders = await Reminder.find({ user: userId, pet: args.petId })
        .sort({ date: 1, time: 1 })
        .limit(MAX())
        .lean();
      return { reminders: reminders.map(normalizeReminder).filter(Boolean) };
    },
  });
}

module.exports = { registerReadTools, petIdSchema, authorizeOwnedPet };