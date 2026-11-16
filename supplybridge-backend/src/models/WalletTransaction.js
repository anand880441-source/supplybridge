const mongoose = require("mongoose");

const WALLET_TRANSACTION_TYPES = [
  "top_up",
  "emd_reserve",
  "emd_release",
  "emd_capture",
  "emd_forfeit",
  "buyer_credit"
];

const walletTransactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: WALLET_TRANSACTION_TYPES,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Transaction amount cannot be negative"]
    },
    availableDelta: {
      type: Number,
      required: true
    },
    heldDelta: {
      type: Number,
      required: true
    },
    referenceType: {
      type: String,
      enum: ["quotation", "order", "top_up"],
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note cannot exceed 300 characters"],
      default: ""
    }
  },
  {
    timestamps: true
  }
);

walletTransactionSchema.index({ businessId: 1, createdAt: -1 });

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

module.exports = WalletTransaction;
module.exports.WALLET_TRANSACTION_TYPES = WALLET_TRANSACTION_TYPES;
