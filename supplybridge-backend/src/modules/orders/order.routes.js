const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderShipment,
  updateOrderStatus
} = require("./order.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/my", getMyOrders);
router.post("/", createOrder);
router.get("/:id", getOrderById);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/shipment", updateOrderShipment);

module.exports = router;
