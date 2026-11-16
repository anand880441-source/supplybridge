const mongoose = require("mongoose");

const REVIEW_ROLES = ["buyer", "seller"];

const readTrimmed = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const validateReviewPayload = (body) => {
  const payload = body || {};
  const orderId = readTrimmed(payload.orderId);
  const rating = Number(payload.rating);
  const comment = readTrimmed(payload.comment);

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return { error: "Invalid order id" };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a rating between 1 and 5" };
  }

  if (comment.length > 500) {
    return { error: "Review cannot exceed 500 characters" };
  }

  return {
    values: {
      orderId: orderId.toString(),
      rating,
      comment
    }
  };
};

const validateReviewRole = (value) => {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: "Invalid review role" };
  }

  const role = value.trim().toLowerCase();

  if (role === "all") {
    return { value: null };
  }

  if (!REVIEW_ROLES.includes(role)) {
    return { error: "Invalid review role" };
  }

  return { value: role };
};

module.exports = {
  validateReviewPayload,
  validateReviewRole
};
