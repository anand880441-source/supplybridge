const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const {
  authFailureRateLimiter
} = require("../../middleware/securityMiddleware");
const {
  register,
  login,
  getMe,
  acceptTerms,
  updateActiveRole
} = require("./auth.controller");

const router = express.Router();

router.post("/register", authFailureRateLimiter, register);
router.post("/login", authFailureRateLimiter, login);
router.get("/me", authMiddleware, getMe);
router.post("/accept-terms", authMiddleware, acceptTerms);
router.patch("/active-role", authMiddleware, updateActiveRole);

module.exports = router;
