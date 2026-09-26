const mongoose = require("mongoose");
const Veterinarian = require("../models/Veterinarian");
const logger = require("../utils/logger");
const { str, searchStr } = require("../utils/querySafe");

// ========================================
// Get All Veterinarians
// ========================================
exports.getAllVeterinarians = async (req, res) => {
  try {
    const { search, specialization, city } = req.query;

    const query = {
      isActive: true,
    };

    const s = searchStr(search);
    if (s) {
      query.$or = [
        { name: new RegExp(s, "i") },
        { clinic: new RegExp(s, "i") },
        { city: new RegExp(s, "i") },
      ];
    }

    const spec = str(specialization);
    if (spec) {
      query.specialization = new RegExp(searchStr(specialization), "i");
    }

    const c = str(city);
    if (c) {
      query.city = new RegExp(searchStr(city), "i");
    }

    const veterinarians = await Veterinarian.find(query)
      .sort({ rating: -1, name: 1 });

    res.status(200).json({
      success: true,
      count: veterinarians.length,
      veterinarians,
    });
  } catch (error) {
    logger.error("Get Veterinarians Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ========================================
// Get Veterinarian By ID
// ========================================
exports.getVeterinarianById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid veterinarian ID.",
      });
    }

    const veterinarian = await Veterinarian.findById(req.params.id);

    if (!veterinarian) {
      return res.status(404).json({
        success: false,
        message: "Veterinarian not found",
      });
    }

    res.status(200).json({
      success: true,
      veterinarian,
    });
  } catch (error) {
    logger.error("Get Veterinarian Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ========================================
// Create Veterinarian
// ========================================
exports.createVeterinarian = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      specialization,
      qualifications,
      experience,
      clinic,
      address,
      city,
      image,
      rating,
      availability,
      consultationFee,
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required.",
      });
    }

    const veterinarian = await Veterinarian.create({
      name,
      email,
      phone,
      specialization,
      qualifications,
      experience,
      clinic,
      address,
      city,
      image,
      rating,
      availability,
      consultationFee,
    });

    res.status(201).json({
      success: true,
      message: "Veterinarian created successfully.",
      veterinarian,
    });
  } catch (error) {
    logger.error("Create Veterinarian Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// Update Veterinarian
// ========================================
exports.updateVeterinarian = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid veterinarian ID." });
    }

    const allowed = ["name", "email", "phone", "specialization", "qualifications", "experience", "clinic", "address", "city", "image", "rating", "availability", "isActive", "consultationFee"];
    const payload = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    });

    const veterinarian = await Veterinarian.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!veterinarian) {
      return res.status(404).json({
        success: false,
        message: "Veterinarian not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Veterinarian updated successfully.",
      veterinarian,
    });
  } catch (error) {
    logger.error("Update Veterinarian Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ========================================
// Delete Veterinarian
// ========================================
exports.deleteVeterinarian = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid veterinarian ID." });
    }

    const veterinarian = await Veterinarian.findByIdAndDelete(req.params.id);

    if (!veterinarian) {
      return res.status(404).json({
        success: false,
        message: "Veterinarian not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Veterinarian deleted successfully.",
    });
  } catch (error) {
    logger.error("Delete Veterinarian Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};