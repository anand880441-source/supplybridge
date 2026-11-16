const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const { roundToTwo } = require("../constants/taxOptions");

const createWalletError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const getOrCreateWallet = async (business) => {
  let wallet = await Wallet.findOne({ businessId: business._id });

  if (wallet) {
    return wallet;
  }

  try {
    wallet = await Wallet.create({
      businessId: business._id,
      ownerId: business.ownerId
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    wallet = await Wallet.findOne({ businessId: business._id });
  }

  return wallet;
};

const getTransaction = async (idempotencyKey) => {
  return WalletTransaction.findOne({ idempotencyKey });
};

const createTransaction = async (values) => {
  try {
    return await WalletTransaction.create(values);
  } catch (error) {
    if (error.code === 11000) {
      return WalletTransaction.findOne({
        idempotencyKey: values.idempotencyKey
      });
    }

    throw error;
  }
};

const reserveAmount = async ({
  business,
  amount,
  quotationId,
  idempotencyKey,
  note
}) => {
  const roundedAmount = roundToTwo(amount);

  if (roundedAmount <= 0) {
    return null;
  }

  const existingTransaction = await getTransaction(idempotencyKey);

  if (existingTransaction) {
    return existingTransaction;
  }

  await getOrCreateWallet(business);

  const wallet = await Wallet.findOneAndUpdate(
    {
      businessId: business._id,
      availableBalance: { $gte: roundedAmount }
    },
    {
      $inc: {
        availableBalance: -roundedAmount,
        heldBalance: roundedAmount
      }
    },
    { returnDocument: "after" }
  );

  if (!wallet) {
    throw createWalletError(
      "Not enough wallet balance to hold the EMD",
      400,
      "INSUFFICIENT_EMD_BALANCE"
    );
  }

  try {
    return await createTransaction({
      businessId: business._id,
      userId: business.ownerId,
      type: "emd_reserve",
      amount: roundedAmount,
      availableDelta: -roundedAmount,
      heldDelta: roundedAmount,
      referenceType: "quotation",
      referenceId: quotationId,
      idempotencyKey,
      note: note || "EMD held"
    });
  } catch (error) {
    await Wallet.updateOne(
      { businessId: business._id },
      {
        $inc: {
          availableBalance: roundedAmount,
          heldBalance: -roundedAmount
        }
      }
    );

    throw error;
  }
};

const releaseAmount = async ({
  business,
  amount,
  quotationId,
  idempotencyKey,
  note
}) => {
  const roundedAmount = roundToTwo(amount);

  if (roundedAmount <= 0) {
    return null;
  }

  const existingTransaction = await getTransaction(idempotencyKey);

  if (existingTransaction) {
    return existingTransaction;
  }

  const wallet = await Wallet.findOneAndUpdate(
    {
      businessId: business._id,
      heldBalance: { $gte: roundedAmount }
    },
    {
      $inc: {
        availableBalance: roundedAmount,
        heldBalance: -roundedAmount
      }
    },
    { returnDocument: "after" }
  );

  if (!wallet) {
    throw createWalletError(
      "The EMD hold could not be released",
      409,
      "EMD_RELEASE_FAILED"
    );
  }

  try {
    return await createTransaction({
      businessId: business._id,
      userId: business.ownerId,
      type: "emd_release",
      amount: roundedAmount,
      availableDelta: roundedAmount,
      heldDelta: -roundedAmount,
      referenceType: "quotation",
      referenceId: quotationId,
      idempotencyKey,
      note: note || "EMD released"
    });
  } catch (error) {
    await Wallet.updateOne(
      { businessId: business._id },
      {
        $inc: {
          availableBalance: -roundedAmount,
          heldBalance: roundedAmount
        }
      }
    );

    throw error;
  }
};

const reserveEmd = async ({ business, quotationId, amount, note }) => {
  return reserveAmount({
    business,
    amount,
    quotationId,
    idempotencyKey: `reserve:${quotationId}`,
    note
  });
};

const releaseEmd = async ({ business, quotationId, amount, note }) => {
  return releaseAmount({
    business,
    amount,
    quotationId,
    idempotencyKey: `release:${quotationId}`,
    note
  });
};

const adjustEmd = async ({
  business,
  quotationId,
  previousAmount,
  nextAmount,
  sequence
}) => {
  const previous = roundToTwo(previousAmount);
  const next = roundToTwo(nextAmount);
  const difference = roundToTwo(next - previous);

  if (difference === 0) {
    return null;
  }

  const idempotencyKey = `adjust:${quotationId}:${sequence || 1}`;

  if (difference > 0) {
    return reserveAmount({
      business,
      amount: difference,
      quotationId,
      idempotencyKey,
      note: "Additional EMD held after quotation update"
    });
  }

  return releaseAmount({
    business,
    amount: Math.abs(difference),
    quotationId,
    idempotencyKey,
    note: "EMD released after quotation update"
  });
};

const captureEmd = async ({ business, quotationId, amount }) => {
  const roundedAmount = roundToTwo(amount);
  const idempotencyKey = `capture:${quotationId}`;
  const existingTransaction = await getTransaction(idempotencyKey);

  if (existingTransaction) {
    return existingTransaction;
  }

  return createTransaction({
    businessId: business._id,
    userId: business.ownerId,
    type: "emd_capture",
    amount: roundedAmount,
    availableDelta: 0,
    heldDelta: 0,
    referenceType: "quotation",
    referenceId: quotationId,
    idempotencyKey,
    note: "EMD captured after buyer acceptance"
  });
};

const forfeitEmd = async ({
  sellerBusiness,
  buyerBusiness,
  quotationId,
  orderId,
  amount
}) => {
  const roundedAmount = roundToTwo(amount);
  const sellerKey = `forfeit:${orderId}`;
  const buyerKey = `buyer-credit:${orderId}`;
  const existingTransaction = await getTransaction(sellerKey);

  if (existingTransaction) {
    return existingTransaction;
  }

  const sellerWallet = await Wallet.findOneAndUpdate(
    {
      businessId: sellerBusiness._id,
      heldBalance: { $gte: roundedAmount }
    },
    {
      $inc: {
        heldBalance: -roundedAmount
      }
    },
    { returnDocument: "after" }
  );

  if (!sellerWallet) {
    throw createWalletError(
      "The EMD could not be forfeited",
      409,
      "EMD_FORFEIT_FAILED"
    );
  }

  let sellerTransaction;

  try {
    sellerTransaction = await createTransaction({
      businessId: sellerBusiness._id,
      userId: sellerBusiness.ownerId,
      type: "emd_forfeit",
      amount: roundedAmount,
      availableDelta: 0,
      heldDelta: -roundedAmount,
      referenceType: "order",
      referenceId: orderId,
      idempotencyKey: sellerKey,
      note: "EMD forfeited after seller cancellation"
    });

    await getOrCreateWallet(buyerBusiness);

    await Wallet.updateOne(
      { businessId: buyerBusiness._id },
      {
        $inc: {
          availableBalance: roundedAmount
        }
      }
    );

    await createTransaction({
      businessId: buyerBusiness._id,
      userId: buyerBusiness.ownerId,
      type: "buyer_credit",
      amount: roundedAmount,
      availableDelta: roundedAmount,
      heldDelta: 0,
      referenceType: "order",
      referenceId: orderId,
      idempotencyKey: buyerKey,
      note: `EMD compensation for cancelled quotation ${quotationId}`
    });
  } catch (error) {
    await Wallet.updateOne(
      { businessId: sellerBusiness._id },
      {
        $inc: {
          heldBalance: roundedAmount
        }
      }
    );

    throw error;
  }

  return sellerTransaction;
};

const topUpWallet = async ({ business, amount, idempotencyKey }) => {
  const roundedAmount = roundToTwo(amount);

  if (roundedAmount <= 0) {
    throw createWalletError(
      "Top-up amount must be greater than zero",
      400,
      "INVALID_TOP_UP"
    );
  }

  const existingTransaction = await getTransaction(idempotencyKey);

  if (existingTransaction) {
    return {
      transaction: existingTransaction,
      wallet: await Wallet.findOne({ businessId: business._id })
    };
  }

  await getOrCreateWallet(business);

  const wallet = await Wallet.findOneAndUpdate(
    { businessId: business._id },
    {
      $inc: {
        availableBalance: roundedAmount
      }
    },
    { returnDocument: "after" }
  );

  try {
    const transaction = await createTransaction({
      businessId: business._id,
      userId: business.ownerId,
      type: "top_up",
      amount: roundedAmount,
      availableDelta: roundedAmount,
      heldDelta: 0,
      referenceType: "top_up",
      referenceId: null,
      idempotencyKey,
      note: "Sandbox wallet top-up"
    });

    return { transaction, wallet };
  } catch (error) {
    await Wallet.updateOne(
      { businessId: business._id },
      {
        $inc: {
          availableBalance: -roundedAmount
        }
      }
    );

    throw error;
  }
};

module.exports = {
  adjustEmd,
  captureEmd,
  forfeitEmd,
  getOrCreateWallet,
  releaseEmd,
  reserveEmd,
  topUpWallet
};
