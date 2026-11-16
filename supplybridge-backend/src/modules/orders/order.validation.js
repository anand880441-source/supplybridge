const mongoose = require("mongoose");

const { ORDER_STATUSES } = require("../../constants/orderOptions");

const validateQuotationId = (value) => {
  if (!value || !mongoose.isValidObjectId(value)) {
    return { error: "Invalid quotation id" };
  }

  return { value: value.toString() };
};

const validateOrderStatus = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "Order status is required" };
  }

  const status = value.trim().toLowerCase();

  if (!ORDER_STATUSES.includes(status)) {
    return { error: "Invalid order status" };
  }

  return { value: status };
};

const validateStatusFilter = (value) => {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: "Invalid order status filter" };
  }

  const status = value.trim().toLowerCase();

  if (status === "all") {
    return { value: null };
  }

  if (!ORDER_STATUSES.includes(status)) {
    return { error: "Invalid order status filter" };
  }

  return { value: status };
};

const readTrimmed = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const validateShipmentPayload = (body) => {
  const payload = body || {};
  const courierName = readTrimmed(payload.courierName);
  const trackingNumber = readTrimmed(payload.trackingNumber).toUpperCase();
  const trackingUrl = readTrimmed(payload.trackingUrl);
  const dispatchNote = readTrimmed(payload.dispatchNote);
  const rawDispatchDate = readTrimmed(payload.dispatchDate);
  const dispatchDate = rawDispatchDate ? new Date(rawDispatchDate) : null;
  const packageCount = Number(payload.packageCount ?? 1);

  if (courierName.length < 2 || courierName.length > 80) {
    return { error: "Courier name must be between 2 and 80 characters" };
  }

  if (
    trackingNumber.length < 4 ||
    trackingNumber.length > 80 ||
    !/^[A-Z0-9][A-Z0-9 ._/-]*$/i.test(trackingNumber)
  ) {
    return { error: "Please enter a valid tracking number" };
  }

  if (trackingUrl) {
    if (trackingUrl.length > 500) {
      return { error: "Tracking URL cannot exceed 500 characters" };
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(trackingUrl);
    } catch (error) {
      return { error: "Tracking URL must be a valid web address" };
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { error: "Tracking URL must start with http:// or https://" };
    }
  }

  if (!dispatchDate || Number.isNaN(dispatchDate.getTime())) {
    return { error: "Please provide a valid dispatch date" };
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  if (dispatchDate > endOfToday) {
    return { error: "Dispatch date cannot be in the future" };
  }

  if (
    !Number.isInteger(packageCount) ||
    packageCount < 1 ||
    packageCount > 10000
  ) {
    return { error: "Package count must be a whole number between 1 and 10000" };
  }

  if (dispatchNote.length > 500) {
    return { error: "Dispatch note cannot exceed 500 characters" };
  }

  return {
    values: {
      courierName,
      trackingNumber,
      trackingUrl,
      dispatchDate,
      packageCount,
      dispatchNote
    }
  };
};

const validateDeliveryConfirmation = (body) => {
  const payload = body || {};
  const recipientName = readTrimmed(payload.recipientName);
  const deliveryNote = readTrimmed(payload.deliveryNote);

  if (payload.receivedInGoodCondition !== true) {
    return {
      error:
        "Please confirm that the goods were received in full and acceptable condition"
    };
  }

  if (recipientName.length < 2 || recipientName.length > 80) {
    return { error: "Recipient name must be between 2 and 80 characters" };
  }

  if (deliveryNote.length > 500) {
    return { error: "Delivery note cannot exceed 500 characters" };
  }

  return {
    values: {
      recipientName,
      deliveryNote
    }
  };
};

module.exports = {
  validateQuotationId,
  validateOrderStatus,
  validateStatusFilter,
  validateShipmentPayload,
  validateDeliveryConfirmation
};
