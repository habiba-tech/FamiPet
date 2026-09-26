const express = require("express");
const { protect } = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");

// =====================================================
// AUTH ROUTES
// =====================================================

// Register (abuse / spam guard)
router.post(
  "/register",
  rateLimiter({ windowMs: 60 * 1000, max: 20 }),
  register
);

// Login (brute-force guard)
router.post(
  "/login",
  rateLimiter({ windowMs: 60 * 1000, max: 10 }),
  login
);

// Verify email
router.get(
  "/verify-email/:token",
  verifyEmail
);

// Resend verification email
router.post(
  "/resend-verification",
  rateLimiter({ windowMs: 60 * 1000, max: 5 }),
  resendVerification
);

// Forgot password (OTP / reset abuse guard)
router.post(
  "/forgot-password",
  rateLimiter({ windowMs: 60 * 1000, max: 5 }),
  forgotPassword
);

// Reset password
router.post(
  "/reset-password/:token",
  rateLimiter({ windowMs: 60 * 1000, max: 10 }),
  resetPassword
);

// =====================================================
// USER ROUTES
// =====================================================

// Current user
router.get("/me", protect, getMe);

// Update profile
router.put("/profile", protect, updateProfile);

// Change password
router.put("/change-password", protect, changePassword);

module.exports = router;