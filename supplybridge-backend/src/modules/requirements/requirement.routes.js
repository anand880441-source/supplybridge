const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const allowRoles = require("../../middleware/roleMiddleware");
const {
  uploadRequirementImages
} = require("../../middleware/uploadMiddleware");
const {
  createRequirement,
  getRequirements,
  getMyRequirements,
  getRequirementById,
  updateRequirement,
  closeRequirement,
  repostRequirement
} = require("./requirement.controller");

const router = express.Router();

// Browsing requirements is available to any logged-in user.
router.use(authMiddleware);

router.post("/", allowRoles("buyer"), uploadRequirementImages, createRequirement);
router.get("/", getRequirements);
router.get("/my", getMyRequirements);
router.patch("/:id/close", closeRequirement);
router.post("/:id/repost", allowRoles("buyer"), repostRequirement);
router.get("/:id", getRequirementById);
router.patch("/:id", uploadRequirementImages, updateRequirement);

module.exports = router;
