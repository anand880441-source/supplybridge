const Business = require("../models/Business");
const Quotation = require("../models/Quotation");
const Requirement = require("../models/Requirement");
const {
  adjustEmd,
  captureEmd,
  forfeitEmd,
  releaseEmd,
  reserveEmd
} = require("./wallet.service");
const { roundToTwo } = require("../constants/taxOptions");
const {
  validateRequirementPayload
} = require("../modules/requirements/requirement.validation");

const createProcurementError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const calculateEmdAmount = (requirement, taxableValue) => {
  const rate = Number(requirement.emdRate || 0);

  return roundToTwo(Number(taxableValue) * (rate / 100));
};

const reserveQuotationEmd = async ({
  quotationId,
  requirement,
  sellerBusiness,
  taxableValue
}) => {
  const emdRate = Number(requirement.emdRate || 0);
  const emdAmount = calculateEmdAmount(requirement, taxableValue);

  if (emdAmount > 0) {
    await reserveEmd({
      business: sellerBusiness,
      quotationId,
      amount: emdAmount,
      note: "EMD held when quotation was sent"
    });
  }

  return {
    emdRate,
    emdAmount,
    emdStatus: emdAmount > 0 ? "held" : "not_required",
    emdHeldAt: emdAmount > 0 ? new Date() : null
  };
};

const releaseQuotationHold = async (quotation, note, business = null) => {
  if (
    quotation.emdStatus !== "held" ||
    Number(quotation.emdAmount || 0) <= 0
  ) {
    return quotation;
  }

  const sellerBusiness =
    business || (await Business.findById(quotation.businessId));

  if (!sellerBusiness) {
    throw createProcurementError(
      "Seller business profile not found",
      404,
      "SELLER_BUSINESS_NOT_FOUND"
    );
  }

  await releaseEmd({
    business: sellerBusiness,
    quotationId: quotation._id,
    amount: quotation.emdAmount,
    note: note || "EMD released"
  });

  quotation.emdStatus = "released";
  quotation.emdSettledAt = new Date();
  await quotation.save();

  return quotation;
};

const adjustQuotationHold = async ({
  quotation,
  sellerBusiness,
  nextEmdAmount
}) => {
  if (quotation.emdStatus !== "held") {
    return quotation;
  }

  const nextSequence = Number(quotation.emdAdjustmentSequence || 0) + 1;

  await adjustEmd({
    business: sellerBusiness,
    quotationId: quotation._id,
    previousAmount: quotation.emdAmount,
    nextAmount: nextEmdAmount,
    sequence: nextSequence
  });

  quotation.emdAmount = nextEmdAmount;
  quotation.emdAdjustmentSequence = nextSequence;

  return quotation;
};

const captureQuotationHold = async (quotation, business = null) => {
  if (
    quotation.emdStatus !== "held" ||
    Number(quotation.emdAmount || 0) <= 0
  ) {
    return quotation;
  }

  const sellerBusiness =
    business || (await Business.findById(quotation.businessId));

  if (!sellerBusiness) {
    throw createProcurementError(
      "Seller business profile not found",
      404,
      "SELLER_BUSINESS_NOT_FOUND"
    );
  }

  await captureEmd({
    business: sellerBusiness,
    quotationId: quotation._id,
    amount: quotation.emdAmount
  });

  quotation.emdStatus = "captured";
  quotation.emdSettledAt = new Date();
  await quotation.save();

  return quotation;
};

const releaseOrderHold = async (order, quotation, note) => {
  if (
    !quotation ||
    quotation.emdStatus !== "captured" ||
    Number(quotation.emdAmount || 0) <= 0
  ) {
    return { released: false };
  }

  const sellerBusiness = await Business.findById(quotation.businessId);

  if (!sellerBusiness) {
    throw createProcurementError(
      "Seller business profile not found",
      404,
      "SELLER_BUSINESS_NOT_FOUND"
    );
  }

  await releaseEmd({
    business: sellerBusiness,
    quotationId: quotation._id,
    amount: quotation.emdAmount,
    note: note || "EMD released"
  });

  const settledAt = new Date();

  quotation.emdStatus = "released";
  quotation.emdSettledAt = settledAt;
  await quotation.save();

  order.emdStatus = "released";
  order.emdSettledAt = settledAt;
  await order.save();

  return { released: true };
};

const forfeitOrderHold = async (order, quotation, requirement) => {
  if (
    !quotation ||
    quotation.emdStatus !== "captured" ||
    Number(quotation.emdAmount || 0) <= 0
  ) {
    return { forfeited: false };
  }

  const sellerBusiness = await Business.findById(quotation.businessId);
  const buyerBusiness = await Business.findById(
    order.buyerBusinessId || requirement.businessId
  );

  if (!sellerBusiness || !buyerBusiness) {
    throw createProcurementError(
      "Buyer or seller business profile not found",
      404,
      "BUSINESS_PROFILE_NOT_FOUND"
    );
  }

  await forfeitEmd({
    sellerBusiness,
    buyerBusiness,
    quotationId: quotation._id,
    orderId: order._id,
    amount: quotation.emdAmount
  });

  const settledAt = new Date();

  quotation.emdStatus = "forfeited";
  quotation.emdSettledAt = settledAt;
  await quotation.save();

  order.emdStatus = "forfeited";
  order.emdSettledAt = settledAt;
  await order.save();

  return { forfeited: true };
};

const releasePendingQuotations = async ({
  requirementId,
  exceptQuotationId = null,
  status = "rejected",
  respondedAt = new Date(),
  note = "EMD released because another quotation was selected"
}) => {
  const filter = {
    requirementId,
    status: "pending"
  };

  if (exceptQuotationId) {
    filter._id = { $ne: exceptQuotationId };
  }

  const quotations = await Quotation.find(filter);

  for (const quotation of quotations) {
    try {
      await releaseQuotationHold(quotation, note);
    } catch (error) {
      console.error("Release unselected quotation EMD error:", error);
    }

    quotation.status = status;
    quotation.respondedAt = respondedAt;
    await quotation.save();
  }

  return quotations.length;
};

const repostRequirement = async ({ original, buyerId, overrides = {} }) => {
  const allowedStatuses = ["cancelled", "closed", "expired"];

  if (!allowedStatuses.includes(original.status)) {
    throw createProcurementError(
      "Only a cancelled, closed, or expired requirement can be reposted",
      400,
      "REQUIREMENT_NOT_REPOSTABLE"
    );
  }

  if (original.nextRequirementId) {
    throw createProcurementError(
      "This requirement already has a newer round",
      409,
      "REQUIREMENT_ALREADY_REPOSTED"
    );
  }

  const allowedOverrides = [
    "productName",
    "category",
    "subcategory",
    "quantity",
    "unit",
    "specifications",
    "customization",
    "budgetMin",
    "budgetMax",
    "deliveryLocation",
    "deliveryDate",
    "notes",
    "emdRate"
  ];

  const payload = {
    productName: original.productName,
    category: original.category,
    subcategory: original.subcategory,
    quantity: original.quantity,
    unit: original.unit,
    specifications: original.specifications,
    customization: original.customization,
    budgetMin: original.budgetMin,
    budgetMax: original.budgetMax,
    deliveryContactName: original.deliveryContactName,
    deliveryPhone: original.deliveryPhone,
    deliveryAddress: original.deliveryAddress,
    deliveryCity: original.deliveryCity,
    deliveryState: original.deliveryState,
    deliveryPincode: original.deliveryPincode,
    deliveryLocation: original.deliveryLocation,
    deliveryInstructions: original.deliveryInstructions,
    deliveryDate: original.deliveryDate,
    notes: original.notes,
    emdRate: original.emdRate
  };

  allowedOverrides.forEach((field) => {
    if (overrides[field] !== undefined) {
      payload[field] = overrides[field];
    }
  });

  const validation = validateRequirementPayload(payload, false);

  if (validation.error) {
    throw createProcurementError(validation.error, 400, "INVALID_REPOST");
  }

  const repost = await Requirement.create({
    ...validation.values,
    buyerId,
    businessId: original.businessId,
    images: original.images,
    status: "open",
    roundNumber: Number(original.roundNumber || 1) + 1,
    previousRequirementId: original._id
  });

  original.nextRequirementId = repost._id;
  await original.save();

  return repost;
};

module.exports = {
  adjustQuotationHold,
  calculateEmdAmount,
  captureQuotationHold,
  forfeitOrderHold,
  releaseOrderHold,
  releasePendingQuotations,
  releaseQuotationHold,
  repostRequirement,
  reserveQuotationEmd
};
