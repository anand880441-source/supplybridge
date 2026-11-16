const mongoose = require("mongoose");

const {
  PRODUCT_CATEGORIES,
  REQUIREMENT_UNITS
} = require("../constants/productOptions");

const REQUIREMENT_STATUSES = [
  "open",
  "awarded",
  "fulfilled",
  "cancelled",
  "closed",
  "expired"
];

const CANCELLATION_ACTORS = ["buyer", "seller", "system"];

// A requirement is a buyer's public request for quotations.
// It always belongs to a buyer and that buyer's business profile.
const requirementSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [120, "Product name cannot exceed 120 characters"]
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: "Please choose a valid product category"
      }
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [60, "Subcategory cannot exceed 60 characters"],
      default: ""
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than zero"],
      max: [1000000, "Quantity is too large"]
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: {
        values: REQUIREMENT_UNITS,
        message: "Please choose a valid unit"
      }
    },
    specifications: {
      type: String,
      required: [true, "Specifications are required"],
      trim: true,
      minlength: [10, "Specifications must be at least 10 characters"],
      maxlength: [2000, "Specifications cannot exceed 2000 characters"]
    },
    customization: {
      type: String,
      trim: true,
      maxlength: [1000, "Customization details cannot exceed 1000 characters"],
      default: ""
    },
    budgetMin: {
      type: Number,
      min: [0, "Minimum budget cannot be negative"],
      max: [100000000, "Minimum budget is too large"],
      default: null
    },
    budgetMax: {
      type: Number,
      min: [0, "Maximum budget cannot be negative"],
      max: [100000000, "Maximum budget is too large"],
      default: null
    },
    deliveryLocation: {
      type: String,
      required: [true, "Delivery location is required"],
      trim: true,
      minlength: [2, "Delivery location must be at least 2 characters"],
      maxlength: [200, "Delivery location cannot exceed 200 characters"]
    },
    deliveryContactName: {
      type: String,
      trim: true,
      maxlength: [80, "Delivery contact name cannot exceed 80 characters"],
      default: ""
    },
    deliveryPhone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Delivery phone must contain 10 digits"],
      default: ""
    },
    deliveryAddress: {
      type: String,
      trim: true,
      maxlength: [300, "Delivery address cannot exceed 300 characters"],
      default: ""
    },
    deliveryCity: {
      type: String,
      trim: true,
      maxlength: [80, "Delivery city cannot exceed 80 characters"],
      default: ""
    },
    deliveryState: {
      type: String,
      trim: true,
      maxlength: [80, "Delivery state cannot exceed 80 characters"],
      default: ""
    },
    deliveryPincode: {
      type: String,
      trim: true,
      match: [/^[0-9]{6}$/, "Delivery PIN code must contain 6 digits"],
      default: ""
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: [500, "Delivery instructions cannot exceed 500 characters"],
      default: ""
    },
    deliveryDate: {
      type: Date,
      required: [true, "Delivery date is required"]
    },
    // Relative URLs such as /uploads/requirement-123.jpg
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= 3,
        message: "You can add up to 3 product images"
      }
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: ""
    },
    emdRate: {
      type: Number,
      min: [2, "EMD rate cannot be below 2%"],
      max: [5, "EMD rate cannot exceed 5%"],
      default: 2
    },
    status: {
      type: String,
      enum: REQUIREMENT_STATUSES,
      default: "open"
    },
    closedAt: {
      type: Date,
      default: null
    },
    awardedAt: {
      type: Date,
      default: null
    },
    fulfilledAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    cancelledByRole: {
      type: String,
      enum: [...CANCELLATION_ACTORS, null],
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancellation reason cannot exceed 300 characters"],
      default: ""
    },
    acceptedQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null
    },
    activeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },
    previousRequirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      default: null
    },
    nextRequirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      default: null
    },
    roundNumber: {
      type: Number,
      min: [1, "Round number must be at least 1"],
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Common filters: sellers browse open needs, buyers list their own needs.
requirementSchema.index({ status: 1, createdAt: -1 });
requirementSchema.index({ buyerId: 1, createdAt: -1 });
requirementSchema.index({ category: 1, status: 1 });
requirementSchema.index({ status: 1, deliveryDate: 1 });

const Requirement = mongoose.model("Requirement", requirementSchema);

module.exports = Requirement;
module.exports.REQUIREMENT_STATUSES = REQUIREMENT_STATUSES;
