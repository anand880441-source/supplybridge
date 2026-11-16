const mongoose = require("mongoose");

const {
  QUOTATION_OFFER_TYPES,
  QUOTATION_STATUSES
} = require("../constants/quotationOptions");

// A quotation is a seller's priced response to one buyer requirement.
// A seller can send only one quotation for each requirement.
const quotationSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    offerType: {
      type: String,
      required: [true, "Offer type is required"],
      enum: {
        values: QUOTATION_OFFER_TYPES,
        message: "Please choose a valid offer type"
      }
    },
    offeredQuantity: {
      type: Number,
      required: [true, "Offered quantity is required"],
      min: [0.01, "Offered quantity must be greater than zero"],
      max: [1000000, "Offered quantity is too large"]
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0.01, "Unit price must be greater than zero"],
      max: [100000000, "Unit price is too large"]
    },
    // Always calculated on the server from offeredQuantity and unitPrice.
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"]
    },
    deliveryDate: {
      type: Date,
      required: [true, "Delivery date is required"]
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
      default: ""
    },
    gstRate: {
      type: Number,
      min: [0, "GST rate cannot be negative"],
      max: [28, "GST rate cannot exceed 28%"],
      default: 0
    },
    pricingMode: {
      type: String,
      enum: ["exclusive", "inclusive"],
      default: "exclusive"
    },
    taxableValue: {
      type: Number,
      min: [0, "Taxable value cannot be negative"],
      default: 0
    },
    cgstAmount: {
      type: Number,
      min: [0, "CGST cannot be negative"],
      default: 0
    },
    sgstAmount: {
      type: Number,
      min: [0, "SGST cannot be negative"],
      default: 0
    },
    igstAmount: {
      type: Number,
      min: [0, "IGST cannot be negative"],
      default: 0
    },
    totalTax: {
      type: Number,
      min: [0, "Tax cannot be negative"],
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: [0, "Grand total cannot be negative"]
    },
    placeOfSupply: {
      type: String,
      trim: true,
      default: ""
    },
    sellerGstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    buyerGstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    emdRate: {
      type: Number,
      min: [0, "EMD rate cannot be negative"],
      default: 0
    },
    emdAmount: {
      type: Number,
      min: [0, "EMD amount cannot be negative"],
      default: 0
    },
    emdAdjustmentSequence: {
      type: Number,
      min: 0,
      default: 0
    },
    emdStatus: {
      type: String,
      enum: [
        "not_required",
        "held",
        "captured",
        "released",
        "forfeited"
      ],
      default: "not_required"
    },
    emdHeldAt: {
      type: Date,
      default: null
    },
    emdSettledAt: {
      type: Date,
      default: null
    },
    termsAccepted: {
      type: Boolean,
      default: false
    },
    termsVersion: {
      type: String,
      trim: true,
      default: ""
    },
    termsAcceptedAt: {
      type: Date,
      default: null
    },
    buyerTermsAccepted: {
      type: Boolean,
      default: false
    },
    buyerTermsVersion: {
      type: String,
      trim: true,
      default: ""
    },
    buyerTermsAcceptedAt: {
      type: Date,
      default: null
    },
    buyerReference: {
      type: String,
      trim: true,
      maxlength: [80, "Buyer reference cannot exceed 80 characters"],
      default: ""
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
    },
    status: {
      type: String,
      enum: {
        values: QUOTATION_STATUSES,
        message: "Please choose a valid quotation status"
      },
      default: "pending"
    },
    // Set when the buyer accepts or rejects the quotation.
    respondedAt: {
      type: Date,
      default: null
    },
    withdrawnAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One quotation per seller per requirement, regardless of status.
quotationSchema.index(
  { requirementId: 1, sellerId: 1 },
  { unique: true }
);
quotationSchema.index({ sellerId: 1, createdAt: -1 });
quotationSchema.index({ requirementId: 1, status: 1 });

const Quotation = mongoose.model("Quotation", quotationSchema);

module.exports = Quotation;
