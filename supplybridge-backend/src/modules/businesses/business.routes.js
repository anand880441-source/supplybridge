const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const {
  uploadBusinessLogo,
  uploadPortfolioImage,
  uploadVerificationDocument
} = require("../../middleware/uploadMiddleware");
const {
  addPortfolioItem,
  createBusiness,
  deleteBusinessLogo,
  deleteVerificationDocument,
  downloadVerificationDocument,
  getMyBusiness,
  getBusinessById,
  removePortfolioItem,
  submitBusinessVerification,
  updateBusiness,
  updateBusinessLogo,
  uploadVerificationDocumentFile
} = require("./business.controller");

const router = express.Router();

// Every business endpoint needs a logged-in user.
router.use(authMiddleware);

router.post("/", createBusiness);
router.get("/me", getMyBusiness);
router.post("/:id/logo", uploadBusinessLogo, updateBusinessLogo);
router.delete("/:id/logo", deleteBusinessLogo);
router.post("/:id/portfolio", uploadPortfolioImage, addPortfolioItem);
router.delete("/:id/portfolio/:itemId", removePortfolioItem);
router.post(
  "/:id/documents",
  uploadVerificationDocument,
  uploadVerificationDocumentFile
);
router.get(
  "/:id/documents/:documentId",
  downloadVerificationDocument
);
router.delete(
  "/:id/documents/:documentId",
  deleteVerificationDocument
);
router.post("/:id/verification", submitBusinessVerification);
router.get("/:id", getBusinessById);
router.patch("/:id", updateBusiness);

module.exports = router;
