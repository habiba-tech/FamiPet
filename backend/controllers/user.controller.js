const mongoose = require("mongoose");
const User = require("../models/User");
const Pet = require("../models/Pet");
const cloudinary = require("../config/cloudinary");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    // Users may only view their own profile; admins may view anyone.
    const isAdmin = req.user.role === "admin";
    if (req.params.id !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this user.",
      });
    }

    const user = await User.findById(req.params.id)
      .select("-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire")
      .populate("pets")
      .populate("favorites");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const { petId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ success: false, message: "Invalid pet ID." });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found." });
    }

    const user = await User.findById(req.user._id);
    const index = user.favorites.findIndex((id) => id.toString() === petId);

    if (index === -1) {
      user.favorites.push(petId);
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();

    res.json({
      success: true,
      favorites: user.favorites,
      isFavorite: index === -1,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Avatar image is required." });
    }

    let avatarUrl;

    if (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_API_SECRET !== "your_api_secret") {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "animal-planet/avatars",
      });
      avatarUrl = result.secure_url;
    } else {
      avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select("-password");

    res.json({ success: true, avatar: avatarUrl, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
