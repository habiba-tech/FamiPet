const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const { AI_CONFIG, outOfScopeResponse } = require("../config/ai");
const { generatePetGPTResponse } = require("../ai");

function fallbackAnswer(question) {
  const q = question.toLowerCase();
  let answer = "I'm PetGPT 🐾. Please provide more details about your pet so I can help you better.";

  if (q.includes("dog")) {
    answer = "For dogs, provide fresh water, balanced food, regular exercise, grooming, and routine veterinary checkups.";
  } else if (q.includes("cat")) {
    answer = "For cats, provide fresh water, suitable food, a clean litter box, playtime, and regular veterinary checkups.";
  } else if (q.includes("vaccin")) {
    answer = "Vaccination schedules depend on species, age, and health history. Consult a veterinarian for a proper schedule.";
  } else if (q.includes("food") || q.includes("diet")) {
    answer = "A pet's diet should match its species, age, size, and health needs. Avoid foods known to be unsafe for pets.";
  } else if (q.includes("exercise") || q.includes("walk")) {
    answer = "Exercise needs depend on species, age, breed, and health. Regular appropriate activity supports good health.";
  }

  return answer;
}

exports.askPetGPT = async (req, res) => {
  try {
    const raw = req.body && req.body.question;
    const question = String(raw === undefined || raw === null ? "" : raw).trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    if (question.length > AI_CONFIG.maxQuestionLength) {
      return res.status(400).json({
        success: false,
        message: `Question is too long. Maximum length is ${AI_CONFIG.maxQuestionLength} characters.`,
      });
    }

    const scope = outOfScopeResponse(question);
    if (scope) {
      console.log(`PetGPT: out-of-scope question blocked for user ${req.user._id}.`);
      return res.json({ success: true, question, answer: scope });
    }

    let petContext = [];
    try {
      const pets = await Pet.find({ owner: req.user._id })
        .select("name species breed")
        .populate("breed", "name")
        .limit(5)
        .lean();

      petContext = pets.map((p) => ({
        name: p.name,
        species: p.species,
        breed: p.breed && p.breed.name ? p.breed.name : undefined,
      }));
    } catch (error) {
      petContext = [];
    }

    let answer = await generatePetGPTResponse(question, petContext);
    if (!answer) answer = fallbackAnswer(question);

    res.json({ success: true, question, answer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPetAdvice = async (req, res) => {
  try {
    const { petId } = req.body;

    if (!petId || !mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ success: false, message: "Valid pet ID is required." });
    }

    const pet = await Pet.findOne({
      _id: petId,
      owner: req.user._id,
    }).populate("breed", "name species");

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found or not owned by you.",
      });
    }

    const advice = [];

    if (!pet.vaccinated) advice.push("Your pet is marked as not vaccinated. Consult a veterinarian about required vaccinations.");
    if (pet.age < 1) advice.push("Your pet is young. Pay special attention to nutrition, vaccination, and veterinary visits.");
    if (pet.weight === undefined || pet.weight === null || pet.weight <= 0) advice.push("Weight information is missing. Consider recording your pet's current weight.");
    if (!advice.length) advice.push("Continue regular veterinary checkups, proper nutrition, exercise, and preventive care.");

    res.json({
      success: true,
      pet: {
        id: pet._id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight,
        vaccinated: pet.vaccinated,
      },
      advice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};