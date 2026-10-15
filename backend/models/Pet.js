const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    // Pet owner
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Breed reference
    breed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Breed",
      required: true,
    },

    // Basic information
    name: {
      type: String,
      required: true,
      trim: true,
    },

    species: {
      type: String,
      required: true,
      enum: ["dog", "cat", "bird", "rabbit", "fish", "other"],
      lowercase: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female"],
    },

    age: {
      type: Number,
      required: true,
      min: 0,
    },

    // Unit for `age`. Stored so a 2-month-old pet is not displayed as 2 years.
    // Legacy records without a unit are read as "years".
    ageUnit: {
      type: String,
      enum: ["months", "years"],
      default: "years",
    },

    weight: {
      type: Number,
      default: 0,
      min: 0,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    // Health information
    vaccinated: {
      type: Boolean,
      default: false,
    },

    // Adoption information
    adopted: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["available", "adopted", "lost", "inactive"],
      // "available" means "listed in the public adoption gallery", so a
      // newly created pet must NOT start there. Owners explicitly list a pet
      // via PUT /pets/:id/status (see pet.controller.updatePetStatus).
      default: "inactive",
    },

    // Pet images
    images: {
      type: [String],
      default: [],
    },

    // Pet description
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Number of times the pet profile is viewed
    views: {
      type: Number,
      default: 0,
    },

    // Digital Pet ID / QR Code
    qrCode: {
      type: String,
      default: "",
    },

    // Unique digital pet ID (used in QR code / Pet ID card)
    petUid: {
      type: String,
      default: "",
      unique: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Pet", petSchema);