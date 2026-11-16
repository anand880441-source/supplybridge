const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: [0, "Available balance cannot be negative"]
    },
    heldBalance: {
      type: Number,
      default: 0,
      min: [0, "Held balance cannot be negative"]
    }
  },
  {
    timestamps: true
  }
);

walletSchema.index({ ownerId: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
