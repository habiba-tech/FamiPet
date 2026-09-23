// =========================================================
// PetGPT pet-aware context service (Phase 5)
// ---------------------------------------------------------
// The single place that turns the authenticated user's own FamiPet
// data into bounded, normalized objects for the AI. Every function
// here is owner-scoped: data is only ever queried through the
// authenticated userId — never through a pet ID supplied by the
// model/client. pet IDs supplied by the model are treated as untrusted
// input and re-checked against ownership before any data is read.
//
// Normalization rules (enforced and asserted by tests):
//   - only the data the AI actually needs is kept;
//   - no MongoDB documents are dumped into prompts or tool results;
//   - sensitive/unnecessary fields are dropped (pet images, QR codes,
//     petUid, view counters, owner refs, appointment fees/payment);
//   - every list is bounded (AI_CONFIG.tools.*).
// =========================================================

const mongoose = require("mongoose");
const { AI_CONFIG } = require("../config/ai");
const Pet = require("../models/Pet");
const HealthRecord = require("../models/HealthRecord");
const Vaccination = require("../models/Vaccination");
const Appointment = require("../models/Appointment");
const Reminder = require("../models/Reminder");

// ------------------------------------------------
// Normalized shapes (bounded, no sensitive fields)
// ------------------------------------------------

function normalizePet(pet) {
  if (!pet) return null;
  return {
    id: pet._id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed && pet.breed.name ? pet.breed.name : undefined,
    gender: pet.gender,
    age: pet.age,
    weight: pet.weight === undefined || pet.weight === null ? undefined : pet.weight,
    color: pet.color || undefined,
    vaccinated: !!pet.vaccinated,
    status: pet.status,
    description: pet.description || undefined,
  };
}

function normalizeHealth(record) {
  if (!record) return null;
  return {
    diagnosis: record.diagnosis,
    treatment: record.treatment || undefined,
    doctor: record.doctor || undefined,
    hospital: record.hospital || undefined,
    visitDate: record.visitDate,
    nextVisit: record.nextVisit || undefined,
    notes: record.notes || undefined,
  };
}

function normalizeVaccination(v) {
  if (!v) return null;
  return {
    vaccineName: v.vaccineName,
    doseNumber: v.doseNumber,
    vaccinationDate: v.vaccinationDate,
    nextDueDate: v.nextDueDate,
    veterinarian: v.veterinarian || undefined,
    hospital: v.hospital || undefined,
    status: v.status,
    notes: v.notes || undefined,
  };
}

function normalizeAppointment(a) {
  if (!a) return null;
  return {
    date: a.date,
    time: a.time,
    type: a.type,
    status: a.status,
    symptoms: a.symptoms || undefined,
    notes: a.notes || undefined,
    prescription: a.prescription || undefined,
    diagnosis: a.diagnosis || undefined,
    veterinarian:
      a.veterinarian && (a.veterinarian.name || a.veterinarian.clinic)
        ? {
            name: a.veterinarian.name || undefined,
            clinic: a.veterinarian.clinic || undefined,
            specialization: a.veterinarian.specialization || undefined,
          }
        : undefined,
  };
}

function normalizeReminder(r) {
  if (!r) return null;
  return {
    title: r.title,
    type: r.type,
    description: r.description || undefined,
    date: r.date,
    time: r.time,
    frequency: r.frequency,
    isActive: !!r.isActive,
    isCompleted: !!r.isCompleted,
  };
}

// ------------------------------------------------
// Ownership gate — the model can never bypass this.
// ------------------------------------------------

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Returns the normalized owned pet for (userId, petId), or null when the
// id is invalid, unknown, or owned by someone else. Callers treat null as
// "not found OR not owned" (no existence leak on cross-tenant ids).
async function requireOwnedPet(userId, petId) {
  if (!petId || !isValidObjectId(petId)) return null;
  const pet = await Pet.findOne({ _id: petId, owner: userId })
    .populate("breed", "name")
    .lean();
  return normalizePet(pet);
}

// ------------------------------------------------
// Context builders
// ------------------------------------------------

// Thin owner-scoped pet list (name/species/breed only) for prompt
// injection on the legacy /ask path and the Phase 2/4 chat flow.
// Bounded at AI_CONFIG.tools.maxContextPets. Kept small on purpose.
async function loadPetContext(userId) {
  try {
    const pets = await Pet.find({ owner: userId })
      .select("name species breed")
      .populate("breed", "name")
      .limit(AI_CONFIG.tools.maxContextPets)
      .lean();
    return pets.map((p) => ({
      name: p.name,
      species: p.species,
      breed: p.breed && p.breed.name ? p.breed.name : undefined,
    }));
  } catch (error) {
    return [];
  }
}

const MAX = () => AI_CONFIG.tools.maxResults;

async function loadPetRecords(userId, petId) {
  const [healthRecords, vaccinations, appointments, reminders] = await Promise.all([
    HealthRecord.find({ user: userId, pet: petId })
      .sort({ visitDate: -1 })
      .limit(MAX())
      .lean(),
    Vaccination.find({ user: userId, pet: petId })
      .sort({ vaccinationDate: -1 })
      .limit(MAX())
      .lean(),
    Appointment.find({ user: userId, pet: petId })
      .populate("veterinarian", "name clinic specialization")
      .sort({ date: 1, time: 1 })
      .limit(MAX())
      .lean(),
    Reminder.find({ user: userId, pet: petId })
      .sort({ date: 1, time: 1 })
      .limit(MAX())
      .lean(),
  ]);
  return {
    healthRecords: healthRecords.map(normalizeHealth).filter(Boolean),
    vaccinations: vaccinations.map(normalizeVaccination).filter(Boolean),
    appointments: appointments.map(normalizeAppointment).filter(Boolean),
    reminders: reminders.map(normalizeReminder).filter(Boolean),
  };
}

// Rich but bounded context for the authenticated user's own pets: identity
// plus compact recent health/vaccination/appointment/reminder data per pet.
// Optional categories simply come back empty (no invented data). This feeds
// the tool-calling flow's initial context and is available to chat-only
// providers. Ownership is always enforced via `owner: userId`.
async function buildPetContext(userId) {
  const pets = await Pet.find({ owner: userId })
    .populate("breed", "name")
    .limit(AI_CONFIG.tools.maxContextPets)
    .sort({ createdAt: -1 })
    .lean();

  const context = [];
  for (const pet of pets) {
    const base = normalizePet(pet);
    const records = await loadPetRecords(userId, pet._id);
    context.push({ ...base, ...records });
  }
  return context;
}

module.exports = {
  normalizePet,
  normalizeHealth,
  normalizeVaccination,
  normalizeAppointment,
  normalizeReminder,
  isValidObjectId,
  requireOwnedPet,
  loadPetContext,
  buildPetContext,
  loadPetRecords,
};