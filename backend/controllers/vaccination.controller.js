const mongoose = require("mongoose");
const Vaccination = require("../models/Vaccination");
const Pet = require("../models/Pet");

exports.getVaccinations = async (req, res) => {
  try {
    const vaccinations = await Vaccination.find({ user: req.user._id })
      .populate("pet", "name species images")
      .sort({ vaccinationDate: -1 });

    res.json({ success: true, count: vaccinations.length, vaccinations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUpcomingVaccinations = async (req, res) => {
  try {
    const upcoming = await Vaccination.find({
      user: req.user._id,
      nextDueDate: { $gte: new Date() },
      status: "Pending",
    })
      .populate("pet", "name species images")
      .sort({ nextDueDate: 1 });

    res.json({ success: true, count: upcoming.length, upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createVaccination = async (req, res) => {
  try {
    const { pet, vaccineName, vaccinationDate, nextDueDate } = req.body;

    if (!pet || !vaccineName || !vaccinationDate || !nextDueDate) {
      return res.status(400).json({
        success: false,
        message: "Pet, vaccine name, vaccination date and next due date are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(pet)) {
      return res.status(400).json({ success: false, message: "Invalid pet ID." });
    }

    const petExists = await Pet.findOne({ _id: pet, owner: req.user._id });
    if (!petExists) {
      return res.status(404).json({
        success: false,
        message: "Pet not found or not owned by you.",
      });
    }

    const vaccination = await Vaccination.create({
      pet,
      vaccineName,
      vaccinationDate,
      nextDueDate,
      doseNumber: req.body.doseNumber,
      veterinarian: req.body.veterinarian || "",
      hospital: req.body.hospital || "",
      notes: req.body.notes || "",
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Vaccination added successfully.",
      vaccination,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateVaccination = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid vaccination ID." });
    }

    const vaccination = await Vaccination.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!vaccination) {
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found.",
      });
    }

    const allowed = ["vaccineName", "doseNumber", "vaccinationDate", "nextDueDate", "veterinarian", "hospital", "notes"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) vaccination[field] = req.body[field];
    });
    await vaccination.save();

    res.json({
      success: true,
      message: "Vaccination updated successfully.",
      vaccination,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteVaccination = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid vaccination ID." });
    }

    const vaccination = await Vaccination.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!vaccination) {
      return res.status(404).json({
        success: false,
        message: "Vaccination record not found.",
      });
    }

    res.json({ success: true, message: "Vaccination deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
