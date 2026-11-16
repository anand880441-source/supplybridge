const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const {
  createReview,
  getBusinessReviews,
  getOrderReview
} = require("./review.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/business/:businessId", getBusinessReviews);
router.get("/order/:orderId", getOrderReview);
router.post("/", createReview);

module.exports = router;
