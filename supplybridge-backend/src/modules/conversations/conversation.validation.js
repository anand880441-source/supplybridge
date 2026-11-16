const mongoose = require("mongoose");

const { MESSAGE_MAX_LENGTH } = require("../../constants/communicationOptions");

const readTrimmed = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const validateQuotationId = (value) => {
  if (!mongoose.isValidObjectId(value)) {
    return { error: "Invalid quotation id" };
  }

  return { value };
};

const validateMessageBody = (value) => {
  const body = readTrimmed(value);

  if (!body) {
    return { error: "Message cannot be empty" };
  }

  if (body.length > MESSAGE_MAX_LENGTH) {
    return { error: `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters` };
  }

  return { value: body };
};

module.exports = {
  validateQuotationId,
  validateMessageBody
};
