const crypto = require("crypto");

const Business = require("../../models/Business");
const WalletTransaction = require("../../models/WalletTransaction");
const {
  getOrCreateWallet,
  topUpWallet
} = require("../../services/wallet.service");

const formatWallet = (wallet) => {
  return {
    id: wallet._id,
    availableBalance: wallet.availableBalance,
    heldBalance: wallet.heldBalance,
    totalBalance: wallet.availableBalance + wallet.heldBalance,
    updatedAt: wallet.updatedAt
  };
};

const formatTransaction = (transaction) => {
  return {
    id: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    availableDelta: transaction.availableDelta,
    heldDelta: transaction.heldDelta,
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    note: transaction.note,
    createdAt: transaction.createdAt
  };
};

// GET /api/wallet
const getWallet = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id });

    if (!business) {
      return res.status(400).json({
        success: false,
        message: "Complete your business profile before using the wallet"
      });
    }

    const wallet = await getOrCreateWallet(business);
    const transactions = await WalletTransaction.find({
      businessId: business._id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: {
        wallet: formatWallet(wallet),
        transactions: transactions.map(formatTransaction)
      }
    });
  } catch (error) {
    console.error("Get wallet error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the wallet"
    });
  }
};

// POST /api/wallet/top-up
const topUp = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id });

    if (!business) {
      return res.status(400).json({
        success: false,
        message: "Complete your business profile before topping up"
      });
    }

    const body = req.body || {};
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return res.status(400).json({
        success: false,
        message: "Top-up amount must be between 1 and 1,00,00,000"
      });
    }

    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim().slice(0, 100)
        : `topup:${crypto.randomUUID()}`;

    const result = await topUpWallet({
      business,
      amount,
      idempotencyKey
    });

    return res.status(201).json({
      success: true,
      message: "Sandbox wallet topped up",
      data: {
        wallet: formatWallet(result.wallet),
        transaction: formatTransaction(result.transaction)
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message
      });
    }

    console.error("Wallet top-up error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to top up the wallet"
    });
  }
};

module.exports = {
  getWallet,
  topUp
};
