const mongoose = require("mongoose");
const LostFound = require("../models/LostFound");
const logger = require("../utils/logger");

// =====================================================
// GET ALL LOST & FOUND REPORTS
// =====================================================

exports.getAllReports = async (req, res) => {
  try {
    const { type, status, species, search } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (species) {
      query.species = species;
    }

    if (search) {
      query.$or = [
        { petName: new RegExp(search, "i") },
        { location: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { breed: new RegExp(search, "i") },
      ];
    }

    const reports = await LostFound.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    logger.error("Get All Reports Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// GET SINGLE REPORT
// =====================================================

exports.getReportById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID.",
      });
    }

    const report = await LostFound.findById(req.params.id).populate(
      "user",
      "name email phone"
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error("Get Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// CREATE LOST / FOUND REPORT
// =====================================================

exports.createReport = async (req, res) => {
  try {
    const {
      type,
      petName,
      species,
      breed,
      gender,
      color,
      description,
      location,
      date,
      contactName,
      contactPhone,
      images,
    } = req.body;

    // Required fields
    if (
      !type ||
      !petName ||
      !species ||
      !description ||
      !location ||
      !date ||
      !contactName ||
      !contactPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type, pet name, species, description, location, date, contact name and contact phone are required.",
      });
    }

    const report = await LostFound.create({
      user: req.user.id,
      type,
      petName,
      species,
      breed,
      gender,
      color,
      description,
      location,
      date,
      contactName,
      contactPhone,
      images:
        req.file
          ? [`${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`]
          : images,
    });

    res.status(201).json({
      success: true,
      message: "Lost & Found report created successfully.",
      report,
    });
  } catch (error) {
    logger.error("Create Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// UPDATE REPORT
// =====================================================

exports.updateReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID.",
      });
    }

    const report = await LostFound.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    // Only report owner can update
    if (report.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this report.",
      });
    }

    // Whitelist updatable fields. The reporter is allowed to resolve their
    // own report (e.g. a lost pet found again), but never change who owns it.
    const updatable = [
      "petName",
      "species",
      "breed",
      "gender",
      "color",
      "description",
      "location",
      "date",
      "contactName",
      "contactPhone",
      "images",
    ];

    if (req.body.status !== undefined) {
      if (["active", "resolved"].includes(req.body.status)) {
        report.status = req.body.status;
      } else {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'active' or 'resolved'.",
        });
      }
    }

    updatable.forEach((key) => {
      if (req.body[key] !== undefined) {
        report[key] = req.body[key];
      }
    });

    if (req.file) {
      const uploadedImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      if (Array.isArray(report.images)) {
        report.images.push(uploadedImage);
      } else {
        report.images = [uploadedImage];
      }
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: "Report updated successfully.",
      report,
    });
  } catch (error) {
    logger.error("Update Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// DELETE REPORT
// =====================================================

exports.deleteReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID.",
      });
    }

    const report = await LostFound.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    // Owner OR admin can delete
    const isOwner =
      report.user.toString() === req.user.id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this report.",
      });
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    logger.error("Delete Report Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};