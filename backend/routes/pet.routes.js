const express = require("express");

const router = express.Router();

const petController = require("../controllers/pet.controller");
const { protect } = require("../middleware/auth");

// =====================================================
// PUBLIC ROUTES
// =====================================================

// Get all pets
// GET /api/pets
router.get("/", petController.getAllPets);

// Get featured pets
// GET /api/pets/featured
router.get("/featured", petController.getFeaturedPets);

// =====================================================
// PROTECTED USER ROUTES
// =====================================================

// Get logged-in user's pets
// GET /api/pets/my
router.get("/my", protect, petController.getMyPets);

// Create a new pet
// POST /api/pets
router.post("/", protect, petController.createPet);

// =====================================================
// PET ID ROUTES
// =====================================================

// Get single pet by ID (owner or admin only, enforced in the controller)
// GET /api/pets/:id
router.get("/:id", protect, petController.getPetById);

// Update pet
// PUT /api/pets/:id
router.put("/:id", protect, petController.updatePet);

// Delete pet
// DELETE /api/pets/:id
router.delete("/:id", protect, petController.deletePet);

// =====================================================
// DIGITAL PET ID / QR CODE
// =====================================================

// Generate QR code for pet
// GET /api/pets/:id/qr
router.get("/:id/qr", protect, petController.generateQRCode);

// =====================================================

module.exports = router;