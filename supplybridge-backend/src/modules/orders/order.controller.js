const mongoose = require("mongoose");

const Order = require("../../models/Order");
const Quotation = require("../../models/Quotation");
const Requirement = require("../../models/Requirement");
const {
  BUYER_STATUS_TRANSITIONS,
  SELLER_STATUS_TRANSITIONS
} = require("../../constants/orderOptions");
const {
  BUSINESS_PUBLIC_FIELDS,
  formatBusinessSummary
} = require("../../utils/businessSummary");
const {
  REQUIREMENT_SUMMARY_FIELDS,
  formatRequirementSummary
} = require("../../utils/requirementSummary");
const {
  validateDeliveryConfirmation,
  validateOrderStatus,
  validateQuotationId,
  validateShipmentPayload,
  validateStatusFilter
} = require("./order.validation");
const { createOrderFromQuotation } = require("./order.service");
const {
  forfeitOrderHold,
  releaseOrderHold
} = require("../../services/procurement.service");
const {
  createNotification
} = require("../notifications/notification.service");

const ORDER_LIST_LIMIT = 100;
const ORDER_STATUS_LABELS = {
  confirmed: "confirmed",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled"
};

const populateOrder = (query) => {
  return query
    .populate("requirementId", REQUIREMENT_SUMMARY_FIELDS)
    .populate("quotationId", "offerType unitPrice totalPrice deliveryDate status")
    .populate("buyerBusinessId", BUSINESS_PUBLIC_FIELDS)
    .populate("sellerBusinessId", BUSINESS_PUBLIC_FIELDS);
};

const formatSnapshotSummary = (snapshot) => {
  if (!snapshot || !snapshot.companyName) {
    return null;
  }

  return {
    id: null,
    companyName: snapshot.companyName,
    businessType: snapshot.businessType || "",
    city: snapshot.city || "",
    state: snapshot.state || "",
    verificationStatus: "",
    logoUrl: snapshot.logoUrl || "",
    contactPerson: snapshot.contactPerson || "",
    phone: snapshot.phone || "",
    email: snapshot.email || ""
  };
};

const formatOrder = (order, user) => {
  const isBuyer = order.buyerId.toString() === user._id.toString();
  const isSeller = order.sellerId.toString() === user._id.toString();
  const counterpartBusiness = isBuyer
    ? order.sellerBusinessId
    : order.buyerBusinessId;
  const counterpartSnapshot = isBuyer ? order.sellerSnapshot : order.buyerSnapshot;
  const liveBusiness = formatBusinessSummary(counterpartBusiness);
  const snapshotBusiness = formatSnapshotSummary(counterpartSnapshot);
  const business = {
    ...(snapshotBusiness || {}),
    ...(liveBusiness || {})
  };
  const quotation = order.quotationId;
  const allowedTransitions = isSeller
    ? SELLER_STATUS_TRANSITIONS[order.status] || []
    : BUYER_STATUS_TRANSITIONS[order.status] || [];
  const buyerId = order.buyerId.toString();

  return {
    id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    productName: order.productName,
    category: order.category,
    offerType: order.offerType,
    quantity: order.quantity,
    unit: order.unit,
    unitPrice: order.unitPrice,
    totalPrice: order.totalPrice,
    gstRate: order.gstRate || 0,
    pricingMode: order.pricingMode || "exclusive",
    taxableValue: order.taxableValue || order.totalPrice,
    cgstAmount: order.cgstAmount || 0,
    sgstAmount: order.sgstAmount || 0,
    igstAmount: order.igstAmount || 0,
    totalTax: order.totalTax || 0,
    grandTotal: order.grandTotal || order.totalPrice,
    placeOfSupply: order.placeOfSupply || "",
    sellerGstin: order.sellerGstin || "",
    buyerGstin: order.buyerGstin || "",
    emdRate: order.emdRate || 0,
    emdAmount: order.emdAmount || 0,
    emdStatus: order.emdStatus || "not_required",
    emdSettledAt: order.emdSettledAt,
    termsVersion: order.termsVersion || "",
    sellerTermsVersion: order.sellerTermsVersion || order.termsVersion || "",
    sellerTermsAcceptedAt: order.sellerTermsAcceptedAt || null,
    buyerTermsVersion: order.buyerTermsVersion || "",
    buyerTermsAcceptedAt: order.buyerTermsAcceptedAt || null,
    buyerReference: order.buyerReference || "",
    cancelledBy: order.cancelledBy,
    cancelledByRole: order.cancelledByRole,
    cancelledAt: order.cancelledAt,
    cancellationReason: order.cancellationReason,
    cancellationNote: order.cancellationNote,
    deliveryDate: order.deliveryDate,
    deliveryLocation: order.deliveryLocation,
    deliveryAddress: order.deliveryAddress || null,
    shipment: order.shipment || null,
    delivery: order.delivery || null,
    quotationId: quotation?._id || order.quotationId,
    requirement: formatRequirementSummary(order.requirementId),
    quotation: quotation
      ? {
          id: quotation._id,
          offerType: quotation.offerType,
          unitPrice: quotation.unitPrice,
          totalPrice: quotation.totalPrice,
          grandTotal: quotation.grandTotal || quotation.totalPrice,
          deliveryDate: quotation.deliveryDate,
          status: quotation.status
        }
      : null,
    counterpart: {
      role: isBuyer ? "seller" : "buyer",
      business: business.companyName ? business : null
    },
    statusHistory: (order.statusHistory || []).map((entry) => ({
      status: entry.status,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt,
      actorRole:
        entry.actorRole ||
        (entry.changedBy && entry.changedBy.toString() === buyerId
          ? "buyer"
          : "seller"),
      note: entry.note || ""
    })),
    allowedTransitions,
    canUpdateShipment: isSeller && order.status === "shipped",
    canConfirmDelivery: isBuyer && order.status === "shipped",
    isBuyer,
    isSeller,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
};

// POST /api/orders
// This is idempotent and also creates orders for quotations accepted before the
// Phase 8 auto-creation was added.
const createOrder = async (req, res) => {
  try {
    const body = req.body || {};
    const quotationValidation = validateQuotationId(body.quotationId);

    if (quotationValidation.error) {
      return res.status(400).json({
        success: false,
        message: quotationValidation.error
      });
    }

    const quotation = await Quotation.findById(quotationValidation.value);
    const requirement = quotation
      ? await Requirement.findById(quotation.requirementId)
      : null;

    if (!quotation || !requirement) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const isBuyer = requirement.buyerId.toString() === req.user._id.toString();
    const isSeller = quotation.sellerId.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this quotation"
      });
    }

    const existingOrder = await populateOrder(
      Order.findOne({ quotationId: quotation._id })
    );

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already exists",
        created: false,
        data: formatOrder(existingOrder, req.user)
      });
    }

    if (quotation.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Only an accepted quotation can become an order"
      });
    }

    if (requirement.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled requirement cannot become an order"
      });
    }

    const order = await createOrderFromQuotation(quotation, requirement);
    const populatedOrder = await populateOrder(Order.findById(order._id));

    await createNotification({
      recipientId: isBuyer ? quotation.sellerId : requirement.buyerId,
      type: "order_created",
      title: "Order created",
      message: `${order.orderNumber} is now confirmed for "${order.productName}".`,
      relatedType: "order",
      relatedId: order._id
    });

    return res.status(201).json({
      success: true,
      message: "Order created",
      created: true,
      data: formatOrder(populatedOrder, req.user)
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create the order"
    });
  }
};

// GET /api/orders/my
const getMyOrders = async (req, res) => {
  try {
    const statusValidation = validateStatusFilter(req.query.status);

    if (statusValidation.error) {
      return res.status(400).json({
        success: false,
        message: statusValidation.error
      });
    }

    const filter = {
      $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }]
    };

    if (statusValidation.value) {
      filter.status = statusValidation.value;
    }

    const orders = await populateOrder(
      Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(ORDER_LIST_LIMIT)
    );

    return res.status(200).json({
      success: true,
      data: orders.map((order) => formatOrder(order, req.user))
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your orders"
    });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id"
      });
    }

    const order = await populateOrder(Order.findById(id));

    if (
      !order ||
      (order.buyerId.toString() !== req.user._id.toString() &&
        order.sellerId.toString() !== req.user._id.toString())
    ) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: formatOrder(order, req.user)
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the order"
    });
  }
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id"
      });
    }

    const statusValidation = validateOrderStatus((req.body || {}).status);

    if (statusValidation.error) {
      return res.status(400).json({
        success: false,
        message: statusValidation.error
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const isBuyer = order.buyerId.toString() === req.user._id.toString();
    const isSeller = order.sellerId.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status === statusValidation.value) {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}`
      });
    }

    const transitions = isSeller
      ? SELLER_STATUS_TRANSITIONS
      : BUYER_STATUS_TRANSITIONS;
    const allowedTransitions = transitions[order.status] || [];

    if (!allowedTransitions.includes(statusValidation.value)) {
      return res.status(403).json({
        success: false,
        message: `You cannot change this order from ${order.status} to ${statusValidation.value}`
      });
    }

    const body = req.body || {};
    const nextStatus = statusValidation.value;
    const now = new Date();
    let cancellationReason = "";
    let cancellationNote = "";
    let deliveryValues = null;
    let shipmentValues = null;
    const statusNote =
      typeof body.statusNote === "string" ? body.statusNote.trim() : "";

    if (statusNote.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Status note cannot exceed 500 characters"
      });
    }

    if (nextStatus === "shipped") {
      const shipmentValidation = validateShipmentPayload(body);

      if (shipmentValidation.error) {
        return res.status(400).json({
          success: false,
          message: shipmentValidation.error
        });
      }

      shipmentValues = shipmentValidation.values;
    }

    if (nextStatus === "delivered") {
      const deliveryValidation = validateDeliveryConfirmation(body);

      if (deliveryValidation.error) {
        return res.status(400).json({
          success: false,
          message: deliveryValidation.error
        });
      }

      deliveryValues = deliveryValidation.values;
    }

    if (nextStatus === "cancelled") {
      cancellationReason =
        typeof body.cancellationReason === "string"
          ? body.cancellationReason.trim()
          : "";
      cancellationNote =
        typeof body.cancellationNote === "string"
          ? body.cancellationNote.trim()
          : "";

      if (cancellationReason.length > 300) {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason cannot exceed 300 characters"
        });
      }

      if (cancellationNote.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Cancellation note cannot exceed 1000 characters"
        });
      }
    }

    const quotation = await Quotation.findById(order.quotationId);
    const requirement = await Requirement.findById(order.requirementId);

    if (nextStatus === "cancelled") {
      try {
        if (isSeller) {
          await forfeitOrderHold(order, quotation, requirement);
        } else {
          await releaseOrderHold(
            order,
            quotation,
            "EMD released because the buyer cancelled the order"
          );
        }
      } catch (settlementError) {
        console.error("Order cancellation EMD error:", settlementError);

        return res.status(settlementError.statusCode || 500).json({
          success: false,
          message:
            settlementError.message || "Unable to settle the order EMD"
        });
      }
    }

    if (nextStatus === "delivered") {
      try {
        await releaseOrderHold(
          order,
          quotation,
          "EMD released after successful delivery"
        );
      } catch (settlementError) {
        console.error("Order delivery EMD error:", settlementError);

        return res.status(settlementError.statusCode || 500).json({
          success: false,
          message:
            settlementError.message || "Unable to release the order EMD"
        });
      }
    }

    order.status = nextStatus;
    order.statusHistory.push({
      status: nextStatus,
      changedBy: req.user._id,
      changedAt: now,
      actorRole: isSeller ? "seller" : "buyer",
      note:
        statusNote ||
        (nextStatus === "cancelled" && cancellationReason
          ? cancellationReason
          : "") ||
        (nextStatus === "shipped" && shipmentValues
          ? `Dispatched via ${shipmentValues.courierName}`
          : "") ||
        (nextStatus === "delivered" && deliveryValues?.deliveryNote
          ? deliveryValues.deliveryNote
          : "")
    });

    if (nextStatus === "shipped" && shipmentValues) {
      order.shipment = {
        ...shipmentValues,
        shippedBy: req.user._id,
        shippedAt: now,
        updatedAt: now
      };
    }

    if (nextStatus === "delivered" && deliveryValues) {
      order.delivery = {
        recipientName: deliveryValues.recipientName,
        note: deliveryValues.deliveryNote,
        confirmedBy: req.user._id,
        deliveredAt: now
      };
    }

    if (nextStatus === "cancelled") {
      order.cancelledBy = req.user._id;
      order.cancelledByRole = isSeller ? "seller" : "buyer";
      order.cancelledAt = now;
      order.cancellationReason = cancellationReason;
      order.cancellationNote = cancellationNote;
    }

    await order.save();

    if (nextStatus === "cancelled") {
      if (quotation) {
        quotation.status = "cancelled";
        quotation.cancelledAt = now;
        await quotation.save();
      }

      if (requirement) {
        requirement.status = "cancelled";
        requirement.cancelledAt = now;
        requirement.cancelledBy = req.user._id;
        requirement.cancelledByRole = isSeller ? "seller" : "buyer";
        requirement.cancellationReason = cancellationReason;
        await requirement.save();
      }
    }

    if (nextStatus === "delivered" && requirement) {
      requirement.status = "fulfilled";
      requirement.fulfilledAt = now;
      await requirement.save();
    }

    const populatedOrder = await populateOrder(Order.findById(order._id));
    const actorRole = isBuyer ? "buyer" : "seller";

    await createNotification({
      recipientId: isBuyer ? order.sellerId : order.buyerId,
      type: "order_status_updated",
      title: `Order ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}`,
      message: `The ${actorRole} marked ${order.orderNumber} as ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}.`,
      relatedType: "order",
      relatedId: order._id
    });

    return res.status(200).json({
      success: true,
      message: `Order marked as ${nextStatus}`,
      data: formatOrder(populatedOrder, req.user)
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the order status"
    });
  }
};

// PATCH /api/orders/:id/shipment
const updateOrderShipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id"
      });
    }

    const validation = validateShipmentPayload(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    const order = await Order.findById(id);

    if (!order || order.sellerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== "shipped") {
      return res.status(400).json({
        success: false,
        message: "Shipment details can only be updated after dispatch"
      });
    }

    const now = new Date();

    order.shipment = {
      ...(order.shipment || {}),
      ...validation.values,
      shippedBy: order.shipment?.shippedBy || req.user._id,
      shippedAt: order.shipment?.shippedAt || now,
      updatedAt: now
    };

    await order.save();

    const populatedOrder = await populateOrder(Order.findById(order._id));

    await createNotification({
      recipientId: order.buyerId,
      type: "order_status_updated",
      title: "Shipment details updated",
      message: `The seller updated shipment details for ${order.orderNumber}.`,
      relatedType: "order",
      relatedId: order._id
    });

    return res.status(200).json({
      success: true,
      message: "Shipment details updated",
      data: formatOrder(populatedOrder, req.user)
    });
  } catch (error) {
    console.error("Update order shipment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the shipment details"
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderShipment,
  updateOrderStatus
};
