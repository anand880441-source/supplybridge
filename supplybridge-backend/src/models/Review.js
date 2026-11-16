const mongoose = require("mongoose");

const REVIEW_ROLES = ["buyer", "seller"];

const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      required: true
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reviewerBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    revieweeBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    revieweeRole: {
      type: String,
      enum: REVIEW_ROLES,
      required: true
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number"
      }
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Review cannot exceed 500 characters"],
      default: ""
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ orderId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({
  revieweeBusinessId: 1,
  revieweeRole: 1,
  createdAt: -1
});
reviewSchema.index({ reviewerBusinessId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
module.exports.REVIEW_ROLES = REVIEW_ROLES;
