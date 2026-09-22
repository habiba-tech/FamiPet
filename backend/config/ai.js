// =========================================================
// PetGPT core configuration and product rules
// ---------------------------------------------------------
// The seam between the AI controller and whatever provider
// is configured. Nothing in this module depends on a vendor
// (Google/Gemini today; OmniRoute or any OpenAI-compatible
// endpoint later). Provider-specific HTTP details belong in
// the controller's callGemini adapter today and move behind
// a provider interface in Phase 1.
// =========================================================

const AI_CONFIG = Object.freeze({
  // Which provider is active. Only "google" is implemented.
  // Phase 1 adds an OpenAI-compatible adapter (incl. OmniRoute).
  provider: process.env.PETGPT_PROVIDER || "google",
  model: process.env.PETGPT_MODEL || "gemini-1.5-flash",
  timeoutMs: Number(process.env.PETGPT_TIMEOUT_MS) || 25000,
  maxQuestionLength: Number(process.env.PETGPT_MAX_QUESTION_LENGTH) || 2000,
});

// =========================================================
// System prompt — encodes the non-negotiable product rules
// (see petGPT.md §Product rules). Provider-agnostic.
// =========================================================

function buildSystemPrompt() {
  return [
    "You are PetGPT, the AI pet-care assistant inside the FamiPet app.",

    "Scope:",
    "- You are NOT a general-purpose chatbot. Only answer about pet care and FamiPet features that actually exist.",
    "- If a request is clearly unrelated to pet care or FamiPet, reply with a short, concise message stating it is outside your scope.",

    "Honesty:",
    "- Never fabricate information. If you do not know or lack reliable information, say so explicitly.",
    "- Never invent pet records, FamiPet data, capabilities, actions, tools, or results.",
    "- Never pretend an unavailable FamiPet feature exists. If a requested feature is not implemented, state clearly that it is currently unavailable. Do not simulate successful execution.",
    "- Never claim to have performed an action you cannot actually perform.",

    "Competitors:",
    "- Never recommend competing pet-management or pet-care applications in place of FamiPet. If FamiPet lacks a capability, say it is currently unavailable.",
    "- Real-world safety guidance is always allowed and encouraged: direct the user to a veterinarian, emergency veterinary service, animal hospital, or another qualified professional when appropriate.",

    "Privacy and ownership:",
    "- Only reference the authenticated user and their own pets. Never mention or imply another user's pets or records.",

    "Health safety:",
    "- Do not present diagnoses as fact. Offer only careful, non-diagnostic guidance.",
    "- Never invent medical records, test results, or treatments.",
    "- Clearly escalate emergencies and anything requiring professional attention to a veterinarian or emergency veterinary service.",

    "Respond concisely and helpfully in 2-4 sentences.",
  ].join("\n");
}

// =========================================================
// Scope gate — conservative keyword safety net.
// Requests that are clearly unrelated to pet care / FamiPet
// get a fixed scope response instead of a Gemini call.
// Deliberately high-precision (few false positives); the
// model prompt above handles the cases this misses.
// =========================================================
// ponytail: keyword heuristic, not a classifier. Ceiling:
// let the provider/moderator judge scope (Phase 1/7), or swap
// for a small intent model when false negatives matter.

const OFF_TOPIC_KEYWORDS = [
  "stock market",
  "bitcoin",
  "crypto",
  "cryptocurrency",
  "trading",
  "write a program",
  "write code",
  "programming",
  "solve this math",
  "math problem",
  "homework",
  "translate this",
  "translate to",
  "book a flight",
  "book a hotel",
  "rent a car",
  "order food for me",
  "cover letter",
  "resume",
  "write an essay",
  "capital of",
  "weather forecast",
  "who won the",
  "celebrity",
  "politics",
  "election",
  "movie review",
];

const PET_CARE_KEYWORDS = [
  "pet",
  "dog",
  "cat",
  "puppy",
  "kitten",
  "bird",
  "rabbit",
  "fish",
  "parrot",
  "hamster",
  "vet",
  "veterinar",
  "vaccin",
  "health",
  "food",
  "feed",
  "diet",
  "nutrition",
  "groom",
  "breed",
  "weigh",
  "train",
  "exercise",
  "walk",
  "litter",
  "adopt",
  "medic",
  "sick",
  "symptom",
  "fever",
  "fur",
  "paw",
];

const SCOPE_RESPONSE =
  "I'm PetGPT, FamiPet's pet-care assistant. That question is outside what I do — I only help with pet care and FamiPet features. Ask me about your pet's health, nutrition, behavior, training, or anything inside FamiPet.";

function outOfScopeResponse(question) {
  const q = " " + String(question || "").toLowerCase() + " ";
  const offTopic = OFF_TOPIC_KEYWORDS.some((k) => q.includes(k));
  if (!offTopic) return null;

  const petCare = PET_CARE_KEYWORDS.some((k) => q.includes(k));
  if (petCare) return null;

  return SCOPE_RESPONSE;
}

module.exports = { AI_CONFIG, buildSystemPrompt, outOfScopeResponse };