const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const allowRoles = require("../../middleware/roleMiddleware");
const {
  createQuotation,
  getMyQuotations,
  getRequirementQuotations,
  getQuotationById,
  updateQuotation,
  withdrawQuotation,
  acceptQuotation,
  rejectQuotation
} = require("./quotation.controller");

const router = express.Router();

// Every quotation endpoint needs a logged-in user.
router.use(authMiddleware);

router.post("/", allowRoles("seller"), createQuotation);
router.get("/my", allowRoles("seller"), getMyQuotations);
router.get("/requirement/:requirementId", getRequirementQuotations);
router.patch("/:id/withdraw", allowRoles("seller"), withdrawQuotation);
router.patch("/:id/accept", acceptQuotation);
router.patch("/:id/reject", rejectQuotation);
router.get("/:id", getQuotationById);
router.patch("/:id", allowRoles("seller"), updateQuotation);

module.exports = router;
