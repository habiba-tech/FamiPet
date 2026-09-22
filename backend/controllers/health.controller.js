const mongoose = require("mongoose");
const HealthRecord = require("../models/HealthRecord");
const Pet = require("../models/Pet");

exports.getHealthRecords = async (req, res) => {
  try {
    const records = await HealthRecord.find({ user: req.user._id })
      .populate("pet", "name species images")
      .sort({ visitDate: -1 });

    res.json({ success: true, count: records.length, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHealthRecordById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid health record ID." });
    }

    const record = await HealthRecord.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("pet", "name species images");

    if (!record) {
      return res.status(404).json({ success: false, message: "Health record not found." });
    }

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createHealthRecord = async (req, res) => {
  try {
    const { pet, diagnosis } = req.body;

    if (!pet || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: "Pet and diagnosis are required.",
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

    const record = await HealthRecord.create({
      pet,
      diagnosis,
      treatment: req.body.treatment || "",
      doctor: req.body.doctor || "",
      hospital: req.body.hospital || "",
      prescription: req.body.prescription || "",
      visitDate: req.body.visitDate,
      nextVisit: req.body.nextVisit,
      notes: req.body.notes || "",
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Health record created successfully.",
      record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateHealthRecord = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid health record ID." });
    }

    const record = await HealthRecord.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "Health record not found." });
    }

    const allowed = ["diagnosis", "treatment", "doctor", "hospital", "prescription", "visitDate", "nextVisit", "notes"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) record[field] = req.body[field];
    });
    await record.save();

    res.json({
      success: true,
      message: "Health record updated successfully.",
      record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteHealthRecord = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid health record ID." });
    }

    const record = await HealthRecord.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "Health record not found." });
    }

    res.json({ success: true, message: "Health record deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
