const mongoose = require("mongoose");

const Business = require("../../models/Business");
const Order = require("../../models/Order");
const Review = require("../../models/Review");
const {
  BUSINESS_PUBLIC_FIELDS,
  formatBusinessSummary
} = require("../../utils/businessSummary");
const {
  validateReviewPayload,
  validateReviewRole
} = require("./review.validation");
const {
  getBusinessRatingSummary,
  refreshBusinessRating
} = require("./review.service");
const {
  createNotification
} = require("../notifications/notification.service");

const REVIEW_LIST_LIMIT = 30;

const populateReview = (query) => {
  return query
    .populate("reviewerBusinessId", BUSINESS_PUBLIC_FIELDS)
    .populate("orderId", "orderNumber productName delivery");
};

const formatReview = (review) => {
  const order =
    review.orderId && review.orderId.orderNumber ? review.orderId : null;

  return {
    id: review._id,
    rating: review.rating,
    comment: review.comment || "",
    revieweeRole: review.revieweeRole,
    reviewer: formatBusinessSummary(review.reviewerBusinessId),
    order: order
      ? {
          id: order._id,
          orderNumber: order.orderNumber,
          productName: order.productName,
          deliveredAt: order.delivery?.deliveredAt || null
        }
      : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
};

const getBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid business id"
      });
    }

    const roleResult = validateReviewRole(req.query.role);

    if (roleResult.error) {
      return res.status(400).json({
        success: false,
        message: roleResult.error
      });
    }

    const businessExists = await Business.exists({ _id: businessId });

    if (!businessExists) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    const filter = { revieweeBusinessId: businessId };

    if (roleResult.value) {
      filter.revieweeRole = roleResult.value;
    }

    const reviews = await populateReview(
      Review.find(filter)
        .sort({ createdAt: -1 })
        .limit(REVIEW_LIST_LIMIT)
    );
    const summary = await getBusinessRatingSummary(businessId);

    return res.status(200).json({
      success: true,
      data: reviews.map(formatReview),
      summary
    });
  } catch (error) {
    console.error("Get business reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch business reviews"
    });
  }
};

const getOrderReview = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id"
      });
    }

    const order = await Order.findById(orderId);

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

    const myReview = await populateReview(
      Review.findOne({
        orderId: order._id,
        reviewerId: req.user._id
      })
    );
    const revieweeRole = isBuyer ? "seller" : "buyer";

    return res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderStatus: order.status,
        revieweeRole,
        canReview: order.status === "delivered" && !myReview,
        myReview: myReview ? formatReview(myReview) : null
      }
    });
  } catch (error) {
    console.error("Get order review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the order review"
    });
  }
};

const createReview = async (req, res) => {
  try {
    const validation = validateReviewPayload(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    const { orderId, rating, comment } = validation.values;
    const order = await Order.findById(orderId);

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

    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "You can review an order only after delivery is confirmed"
      });
    }

    const existingReview = await Review.findOne({
      orderId: order._id,
      reviewerId: req.user._id
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this order"
      });
    }

    const revieweeRole = isBuyer ? "seller" : "buyer";
    const reviewerBusinessId = isBuyer
      ? order.buyerBusinessId
      : order.sellerBusinessId;
    const revieweeBusinessId = isBuyer
      ? order.sellerBusinessId
      : order.buyerBusinessId;

    if (!reviewerBusinessId || !revieweeBusinessId) {
      return res.status(400).json({
        success: false,
        message: "Both businesses must be available before reviewing this order"
      });
    }

    const review = await Review.create({
      orderId: order._id,
      requirementId: order.requirementId,
      reviewerId: req.user._id,
      reviewerBusinessId,
      revieweeId: isBuyer ? order.sellerId : order.buyerId,
      revieweeBusinessId,
      revieweeRole,
      rating,
      comment
    });

    try {
      await refreshBusinessRating(revieweeBusinessId, revieweeRole);
    } catch (summaryError) {
      console.error("Refresh business rating error:", summaryError);
    }

    const populatedReview = await populateReview(
      Review.findById(review._id)
    );
    const summary = await getBusinessRatingSummary(revieweeBusinessId);
    const reviewerRole = revieweeRole === "seller" ? "buyer" : "seller";

    await createNotification({
      recipientId: isBuyer ? order.sellerId : order.buyerId,
      type: "review_received",
      title: "New review received",
      message: `A ${reviewerRole} left a ${rating}-star review on ${order.orderNumber}.`,
      relatedType: "order",
      relatedId: order._id
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted",
      data: {
        review: formatReview(populatedReview),
        summary
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this order"
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Create review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the review"
    });
  }
};

module.exports = {
  createReview,
  getBusinessReviews,
  getOrderReview
};
