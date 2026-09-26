const mongoose = require("mongoose");
const Breed = require("../models/Breed");
const { strLower, searchStr } = require("../utils/querySafe");

exports.getAllBreeds = async (req, res) => {
  try {
    const { species, search } = req.query;
    const query = { isActive: true };

    const sp = strLower(species);
    if (sp) query.species = sp;
    const s = searchStr(search);
    if (s) query.name = { $regex: s, $options: "i" };

    const breeds = await Breed.find(query).sort({ popularity: -1, name: 1 });
    res.json({ success: true, count: breeds.length, breeds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBreedById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid breed ID." });
    }

    const breed = await Breed.findById(req.params.id);
    if (!breed) return res.status(404).json({ success: false, message: "Breed not found." });

    res.json({ success: true, breed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBreed = async (req, res) => {
  try {
    const { name, species } = req.body;

    if (!name || !species) {
      return res.status(400).json({
        success: false,
        message: "Name and species are required.",
      });
    }

    const allowed = ["name", "species", "origin", "lifespan", "weightRange", "heightRange", "temperament", "exerciseRequirements", "groomingGuide", "commonDiseases", "suitableEnvironment", "description", "images", "popularity", "isActive"];
    const payload = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    });

    const breed = await Breed.create(payload);
    res.status(201).json({
      success: true,
      message: "Breed created successfully.",
      breed,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateBreed = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid breed ID." });
    }

    const allowed = ["name", "species", "origin", "lifespan", "weightRange", "heightRange", "temperament", "exerciseRequirements", "groomingGuide", "commonDiseases", "suitableEnvironment", "description", "images", "popularity", "isActive"];
    const payload = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    });

    const breed = await Breed.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!breed) return res.status(404).json({ success: false, message: "Breed not found." });

    res.json({
      success: true,
      message: "Breed updated successfully.",
      breed,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBreed = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid breed ID." });
    }

    const breed = await Breed.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!breed) return res.status(404).json({ success: false, message: "Breed not found." });

    res.json({
      success: true,
      message: "Breed deactivated successfully.",
      breed,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
