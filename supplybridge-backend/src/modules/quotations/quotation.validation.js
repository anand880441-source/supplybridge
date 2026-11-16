const {
  QUOTATION_OFFER_TYPES
} = require("../../constants/quotationOptions");
const {
  GST_RATES,
  GST_PRICING_MODES,
  calculateGst,
  roundToTwo
} = require("../../constants/taxOptions");
const { TERMS_VERSION } = require("../../constants/procurement");

const readTrimmed = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const readNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : NaN;
};

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
};

const validateQuotationPayload = (
  body,
  requirement,
  existingQuotation = null,
  context = {}
) => {
  const isUpdate = Boolean(existingQuotation);
  const values = {};
  const hasField = (field) => body[field] !== undefined;

  let offerType;

  if (hasField("offerType")) {
    const requestedOfferType = readTrimmed(body.offerType).toLowerCase();

    if (!QUOTATION_OFFER_TYPES.includes(requestedOfferType)) {
      return {
        error: `Offer type must be one of: ${QUOTATION_OFFER_TYPES.join(", ")}`
      };
    }

    offerType = requestedOfferType;
    values.offerType = offerType;
  } else if (isUpdate) {
    offerType = existingQuotation.offerType;
  } else {
    return { error: "Offer type is required" };
  }

  let offeredQuantity;

  if (offerType === "full") {
    offeredQuantity = roundToTwo(requirement.quantity);

    if (!isUpdate || hasField("offerType") || hasField("offeredQuantity")) {
      values.offeredQuantity = offeredQuantity;
    }
  } else {
    let rawQuantity;

    if (hasField("offeredQuantity")) {
      rawQuantity = readNumber(body.offeredQuantity);
    } else if (isUpdate) {
      rawQuantity = existingQuotation.offeredQuantity;
    } else {
      return { error: "Offered quantity is required" };
    }

    if (
      rawQuantity === null ||
      Number.isNaN(rawQuantity) ||
      rawQuantity <= 0 ||
      rawQuantity > 1000000
    ) {
      return { error: "Offered quantity must be a number greater than zero" };
    }

    offeredQuantity = roundToTwo(rawQuantity);

    if (offerType === "partial" && offeredQuantity >= requirement.quantity) {
      return {
        error: "A partial offer must be less than the requested quantity"
      };
    }

    if (offerType === "modified" && offeredQuantity > requirement.quantity) {
      return {
        error: "A modified offer cannot exceed the requested quantity"
      };
    }

    if (!isUpdate || hasField("offerType") || hasField("offeredQuantity")) {
      values.offeredQuantity = offeredQuantity;
    }
  }

  let unitPrice;

  if (hasField("unitPrice")) {
    const rawUnitPrice = readNumber(body.unitPrice);

    if (
      rawUnitPrice === null ||
      Number.isNaN(rawUnitPrice) ||
      rawUnitPrice <= 0 ||
      rawUnitPrice > 100000000
    ) {
      return { error: "Unit price must be a valid amount greater than zero" };
    }

    unitPrice = roundToTwo(rawUnitPrice);
    values.unitPrice = unitPrice;
  } else if (isUpdate) {
    unitPrice = existingQuotation.unitPrice;
  } else {
    return { error: "Unit price is required" };
  }

  let gstRate;

  if (hasField("gstRate")) {
    gstRate = readNumber(body.gstRate);

    if (gstRate === null || Number.isNaN(gstRate)) {
      return { error: "GST rate is required" };
    }

    if (!GST_RATES.includes(gstRate)) {
      return {
        error: `GST rate must be one of: ${GST_RATES.join(", ")}`
      };
    }

    values.gstRate = gstRate;
  } else if (isUpdate) {
    gstRate = Number(existingQuotation.gstRate || 0);
  } else {
    return { error: "GST rate is required" };
  }

  let pricingMode;

  if (hasField("pricingMode")) {
    const requestedMode = readTrimmed(body.pricingMode).toLowerCase();

    if (!GST_PRICING_MODES.includes(requestedMode)) {
      return {
        error: "Pricing mode must be inclusive or exclusive"
      };
    }

    pricingMode = requestedMode;
    values.pricingMode = pricingMode;
  } else if (isUpdate) {
    pricingMode = existingQuotation.pricingMode || "exclusive";
  } else {
    return { error: "Pricing mode is required" };
  }

  let deliveryDate;

  if (hasField("deliveryDate")) {
    const rawDate = readTrimmed(body.deliveryDate);
    deliveryDate = rawDate ? new Date(rawDate) : null;

    if (!deliveryDate || Number.isNaN(deliveryDate.getTime())) {
      return { error: "Please provide a valid delivery date" };
    }

    values.deliveryDate = deliveryDate;
  } else if (isUpdate) {
    deliveryDate = existingQuotation.deliveryDate;
  } else {
    return { error: "Delivery date is required" };
  }

  if (deliveryDate < getStartOfToday()) {
    return { error: "Delivery date cannot be in the past" };
  }

  if (deliveryDate > requirement.deliveryDate) {
    return {
      error:
        "Delivery date cannot be later than the buyer's required delivery date"
    };
  }

  if (!isUpdate || hasField("message")) {
    const message = readTrimmed(body.message);

    if (message.length > 1000) {
      return { error: "Message cannot exceed 1000 characters" };
    }

    values.message = message;
  }

  const sellerGstin = readTrimmed(
    context.sellerBusiness?.gstin || existingQuotation?.sellerGstin
  ).toUpperCase();
  const buyerGstin = readTrimmed(
    context.buyerBusiness?.gstin || existingQuotation?.buyerGstin
  ).toUpperCase();

  if (gstRate > 0 && !sellerGstin) {
    return {
      error:
        "Add your GSTIN in the business profile before quoting with GST"
    };
  }

  const taxResult = calculateGst({
    quantity: offeredQuantity,
    unitPrice,
    gstRate,
    pricingMode,
    sellerState: context.sellerBusiness?.state || "",
    buyerState: context.buyerBusiness?.state || ""
  });

  if (taxResult.error) {
    return taxResult;
  }

  Object.assign(values, taxResult.values);
  values.totalPrice = taxResult.values.taxableValue;
  values.sellerGstin = sellerGstin;
  values.buyerGstin = buyerGstin;

  if (!isUpdate) {
    if (body.termsAccepted !== true) {
      return { error: "Please accept the marketplace terms before quoting" };
    }

    if (body.termsVersion !== TERMS_VERSION) {
      return { error: "The marketplace terms have changed. Please review them again" };
    }

    values.termsAccepted = true;
    values.termsVersion = TERMS_VERSION;
    values.termsAcceptedAt = new Date();
  }

  return { values };
};

const validateAcceptQuotationPayload = (body) => {
  const payload = body || {};

  if (payload.termsAccepted !== true) {
    return {
      error: "Please accept the current terms before accepting a quotation"
    };
  }

  if (payload.termsVersion !== TERMS_VERSION) {
    return {
      error:
        "The terms have changed. Review the current terms before accepting this quotation"
    };
  }

  const buyerReference = readTrimmed(payload.buyerReference);

  if (buyerReference.length > 80) {
    return { error: "Buyer reference cannot exceed 80 characters" };
  }

  return {
    values: {
      buyerReference,
      buyerTermsVersion: TERMS_VERSION
    }
  };
};

module.exports = {
  validateQuotationPayload,
  validateAcceptQuotationPayload
};
