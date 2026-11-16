const mongoose = require("mongoose");

const { ORDER_STATUSES } = require("../constants/orderOptions");

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    changedAt: {
      type: Date,
      required: true
    },
    actorRole: {
      type: String,
      enum: ["buyer", "seller", null],
      default: null
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Status note cannot exceed 500 characters"],
      default: ""
    }
  },
  { _id: false }
);

const businessSnapshotSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, default: "" },
    legalName: { type: String, trim: true, default: "" },
    businessType: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    gstin: { type: String, trim: true, uppercase: true, default: "" },
    logoUrl: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    contactName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    line1: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
    instructions: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    courierName: {
      type: String,
      trim: true,
      maxlength: [80, "Courier name cannot exceed 80 characters"],
      default: ""
    },
    trackingNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [80, "Tracking number cannot exceed 80 characters"],
      default: ""
    },
    trackingUrl: {
      type: String,
      trim: true,
      maxlength: [500, "Tracking URL cannot exceed 500 characters"],
      default: ""
    },
    dispatchDate: { type: Date, default: null },
    packageCount: {
      type: Number,
      min: [1, "Package count must be at least 1"],
      default: 1
    },
    dispatchNote: {
      type: String,
      trim: true,
      maxlength: [500, "Dispatch note cannot exceed 500 characters"],
      default: ""
    },
    shippedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    shippedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null }
  },
  { _id: false }
);

const deliveryConfirmationSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      trim: true,
      maxlength: [80, "Recipient name cannot exceed 80 characters"],
      default: ""
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Delivery note cannot exceed 500 characters"],
      default: ""
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    deliveredAt: { type: Date, default: null }
  },
  { _id: false }
);

// An order is a snapshot of the accepted quotation. The linked documents stay
// available for navigation, but the order keeps its own agreed terms.
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      unique: true
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      required: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    buyerBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    sellerBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    offerType: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    gstRate: {
      type: Number,
      min: 0,
      max: 28,
      default: 0
    },
    pricingMode: {
      type: String,
      enum: ["exclusive", "inclusive"],
      default: "exclusive"
    },
    taxableValue: {
      type: Number,
      min: 0,
      default: 0
    },
    cgstAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    sgstAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    igstAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    totalTax: {
      type: Number,
      min: 0,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
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
      min: 0,
      default: 0
    },
    emdAmount: {
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
    emdSettledAt: {
      type: Date,
      default: null
    },
    termsVersion: {
      type: String,
      trim: true,
      default: ""
    },
    sellerTermsVersion: {
      type: String,
      trim: true,
      default: ""
    },
    sellerTermsAcceptedAt: {
      type: Date,
      default: null
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
    buyerSnapshot: {
      type: businessSnapshotSchema,
      default: null
    },
    sellerSnapshot: {
      type: businessSnapshotSchema,
      default: null
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      default: null
    },
    shipment: {
      type: shipmentSchema,
      default: null
    },
    delivery: {
      type: deliveryConfirmationSchema,
      default: null
    },
    deliveryDate: {
      type: Date,
      required: true
    },
    deliveryLocation: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "confirmed"
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    cancelledByRole: {
      type: String,
      enum: ["buyer", "seller", null],
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancellation reason cannot exceed 300 characters"],
      default: ""
    },
    cancellationNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Cancellation note cannot exceed 1000 characters"],
      default: ""
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
