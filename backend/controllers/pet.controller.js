const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const Breed = require("../models/Breed");
const QRCode = require("qrcode");
const logger = require("../utils/logger");
const { str, strLower, searchStr } = require("../utils/querySafe");
const { petQrPayloadUrl } = require("../utils/petQr");

// Pet age is a number plus its unit. Anything that is not exactly "months" is
// stored as "years" so a malformed value can never break the mongoose enum,
// and legacy pets saved before the unit existed keep reading as years.
const normalizeAgeUnit = (value) => (String(value).toLowerCase() === "months" ? "months" : "years");

// ==========================
// Get All Pets
// ==========================
exports.getAllPets = async (req, res) => {
  try {
    const { species, breed, gender, status, search, sort } = req.query;

    const query = {};

    const sp = strLower(species);
    if (sp && ["dog", "cat", "bird", "rabbit", "fish", "other"].includes(sp)) {
      query.species = sp;
    }

    if (breed && mongoose.Types.ObjectId.isValid(breed)) {
      query.breed = breed;
    }

    const g = strLower(gender);
    if (g && ["male", "female"].includes(g)) {
      query.gender = g;
    }

    const st = str(status);
    if (st && ["available", "adopted", "lost", "inactive"].includes(st)) {
      query.status = st;
    }

    const s = searchStr(search);
    if (s) {
      query.$or = [
        { name: new RegExp(s, "i") },
        { description: new RegExp(s, "i") },
      ];
    }

    let sortOption = { createdAt: -1 };

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "name") {
      sortOption = { name: 1 };
    } else if (sort === "age") {
      sortOption = { age: 1 };
    } else if (sort === "popular") {
      sortOption = { views: -1 };
    }

    const pets = await Pet.find(query)
      .populate("owner", "name")
      .populate("breed", "name species")
      .sort(sortOption);

    res.status(200).json({
      success: true,
      count: pets.length,
      pets,
    });
  } catch (error) {
    logger.error("Get All Pets Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Get My Pets
// ==========================
exports.getMyPets = async (req, res) => {
  try {
    const pets = await Pet.find({
      owner: req.user.id,
    })
      .populate("breed", "name species")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pets.length,
      pets,
    });
  } catch (error) {
    logger.error("Get My Pets Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Get Pet By ID
// ==========================
exports.getPetById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pet ID.",
      });
    }

    const pet = await Pet.findById(req.params.id)
      .populate("owner", "name email phone")
      .populate("breed", "name species");

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    // Only the pet owner (or an admin) may read a pet by ID. Same policy as
    // generateQRCode below: a direct-ID read must not be broader than /pets/my.
    const isOwner = pet.owner && pet.owner._id && pet.owner._id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this pet.",
      });
    }

    // Increase views
    pet.views += 1;
    await pet.save();

    res.status(200).json({
      success: true,
      pet,
    });
  } catch (error) {
    logger.error("Get Pet Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Public Pet Details (by petUid)
// ==========================
// Resolves the stable digital pet ID encoded in a Pet ID QR code. Deliberately
// NO auth: a scanned QR must render for anyone. Only intentionally public info
// is returned — pet description data plus the current owner's NAME (matching
// the anonymous adoption gallery's PII policy). Owner email/phone are never
// exposed here.
exports.getPublicPetByUid = async (req, res) => {
  try {
    const petUid = String(req.params.petUid || "").trim();
    if (!petUid) {
      return res.status(400).json({ success: false, message: "Pet ID is required." });
    }

    const pet = await Pet.findOne({ petUid })
      .populate("breed", "name species")
      .populate("owner", "name");

    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    const owner = pet.owner && typeof pet.owner === "object" ? pet.owner : null;
    const breed = pet.breed && typeof pet.breed === "object" ? pet.breed : null;

    res.status(200).json({
      success: true,
      pet: {
        petUid,
        name: pet.name,
        species: pet.species,
        breed: breed && breed.name ? breed.name : "",
        gender: pet.gender,
        age: pet.age,
        ageUnit: pet.ageUnit || "years",
        weight: pet.weight,
        color: pet.color || "",
        vaccinated: pet.vaccinated,
        description: pet.description || "",
        images: pet.images || [],
        owner: owner ? { name: owner.name || "" } : null,
      },
    });
  } catch (error) {
    logger.error("Get Public Pet Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Create Pet
// ==========================
exports.createPet = async (req, res) => {
  try {
    const {
      breed,
      name,
      species,
      gender,
      age,
      ageUnit,
      weight,
      color,
      vaccinated,
      images,
      description,
    } = req.body;

    // Required fields
    if (
      !breed ||
      !name ||
      !species ||
      !gender ||
      age === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Breed, name, species, gender and age are required.",
      });
    }

    // Accept either the existing Breed ObjectId or the breed name used by the legacy frontend.
    let breedId = breed;
    if (!mongoose.Types.ObjectId.isValid(breed)) {
      const breedName = String(breed).trim();
      if (!breedName) return res.status(400).json({ success: false, message: "Breed is required." });
      let breedDoc = await Breed.findOne({ name: new RegExp(`^${breedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
      if (!breedDoc) {
        breedDoc = await Breed.create({ name: breedName, species: String(species).toLowerCase() });
      }
      breedId = breedDoc._id;
    }

    const pet = await Pet.create({
      owner: req.user.id,
      breed: breedId,
      name,
      species,
      gender,
      age,
      ageUnit: normalizeAgeUnit(ageUnit),
      weight,
      color,
      vaccinated,
      images,
      description,
    });

    // -------------------------------------------------
    // AUTO-GENERATE UNIQUE DIGITAL PET ID + QR CODE
    // -------------------------------------------------

    try {
      const uniqueId = `${Date.now().toString(36)}-${pet._id.toString().slice(-8)}-${Math.floor(Math.random() * 10000)}`;
      // Payload is a stable URL to the public Pet Details page, not raw JSON.
      const qrCodeDataUrl = await QRCode.toDataURL(petQrPayloadUrl(uniqueId));

      pet.qrCode = qrCodeDataUrl;
      pet.petUid = uniqueId;
      await pet.save();
    } catch (qrError) {
      logger.error("QR Generation Warning:", qrError);
    }

    res.status(201).json({
      success: true,
      message: "Pet created successfully.",
      pet,
    });
  } catch (error) {
    logger.error("Create Pet Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Update Pet
// ==========================
exports.updatePet = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pet ID.",
      });
    }

    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    // Only owner can update their pet
    if (pet.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this pet.",
      });
    }

    // Whitelist updatable fields. Never allow changing the owner or
    // tampering with adoption/identification fields via this endpoint.
    // `breed` is handled separately below (it is an ObjectId reference and
    // the client sends the breed name).
    const updatable = [
      "name",
      "species",
      "gender",
      "age",
      "ageUnit",
      "weight",
      "color",
      "vaccinated",
      "description",
      "images",
    ];

    // Resolve the submitted breed first: the field is an ObjectId reference,
    // but the frontend always sends the breed NAME (see buildPetPayload).
    // Assigning the raw name straight onto the ObjectId path would throw a
    // mongoose CastError on save. Accept either an ObjectId (already valid)
    // or a breed name, creating the Breed record when it does not exist —
    // exactly like createPet.
    if (req.body.breed !== undefined) {
      if (mongoose.Types.ObjectId.isValid(req.body.breed)) {
        pet.breed = mongoose.Types.ObjectId(req.body.breed);
      } else {
        const breedName = String(req.body.breed).trim();
        if (!breedName) {
          return res.status(400).json({
            success: false,
            message: "Invalid breed.",
          });
        }
        let breedDoc = await Breed.findOne({
          name: new RegExp(`^${breedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
        if (!breedDoc) {
          const species = req.body.species || pet.species || "dog";
          breedDoc = await Breed.create({ name: breedName, species });
        }
        pet.breed = breedDoc._id;
      }
    }

    updatable.forEach((key) => {
      if (req.body[key] !== undefined) {
        pet[key] = key === "ageUnit" ? normalizeAgeUnit(req.body[key]) : req.body[key];
      }
    });

    await pet.save();

    res.status(200).json({
      success: true,
      message: "Pet updated successfully.",
      pet,
    });
  } catch (error) {
    logger.error("Update Pet Error:", error);

    // A mongoose ValidationError means the payload violates the schema (bad
    // enum, missing value, ...) — a client data problem, not a server fault.
    // Return a friendly 400 instead of leaking the raw mongoose error.
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid pet data. Please check the values and try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Update Pet Adoption Listing
// ==========================
// The owner's explicit "list for adoption" / "unlist" action. Only the two
// listing states are settable here: "adopted" is owned by the adoption
// approval flow and "lost" by Lost & Found, so they can never be forged
// through this endpoint.
exports.updatePetStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pet ID.",
      });
    }

    const { status } = req.body;
    if (!["available", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be available or inactive.",
      });
    }

    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    if (pet.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to change this pet's adoption listing.",
      });
    }

    if (pet.adopted || pet.status === "adopted") {
      return res.status(400).json({
        success: false,
        message: "An adopted pet cannot be re-listed for adoption.",
      });
    }

    pet.status = status;
    await pet.save();

    res.status(200).json({
      success: true,
      message: status === "available"
        ? "Pet is now listed for adoption."
        : "Pet is no longer listed for adoption.",
      pet,
    });
  } catch (error) {
    logger.error("Update Pet Status Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Delete Pet
// ==========================
exports.deletePet = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pet ID.",
      });
    }

    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    // Only owner can delete their pet
    if (pet.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this pet.",
      });
    }

    await pet.deleteOne();

    res.status(200).json({
      success: true,
      message: "Pet deleted successfully.",
    });
  } catch (error) {
    logger.error("Delete Pet Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Generate Digital Pet QR Code
// ==========================
exports.generateQRCode = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pet ID.",
      });
    }

    const pet = await Pet.findById(req.params.id)
      .populate("owner", "name phone email")
      .populate("breed", "name species");

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    // Only the pet owner (or an admin) may generate the Pet ID / QR code.
    const isOwner = pet.owner && pet.owner._id && pet.owner._id.toString() === req.user.id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to generate the QR code for this pet.",
      });
    }

    // Legacy pets seeded before petUid existed have none; backfill one so the
    // QR always resolves through the stable public petUid lookup.
    if (!pet.petUid) {
      pet.petUid = `${Date.now().toString(36)}-${pet._id.toString().slice(-8)}-${Math.floor(Math.random() * 10000)}`;
    }

    const qrCodeDataUrl = await QRCode.toDataURL(petQrPayloadUrl(pet.petUid));

    pet.qrCode = qrCodeDataUrl;
    await pet.save();

    res.status(200).json({
      success: true,
      message: "QR code generated successfully.",
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    logger.error("Generate QR Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Get Featured Pets
// ==========================
exports.getFeaturedPets = async (req, res) => {
  try {
    const pets = await Pet.find({
      status: "available",
      adopted: false,
    })
      .populate("breed", "name species")
      .sort({ views: -1 })
      .limit(8);

    res.status(200).json({
      success: true,
      count: pets.length,
      pets,
    });
  } catch (error) {
    logger.error("Get Featured Pets Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};