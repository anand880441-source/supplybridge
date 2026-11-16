// Quotation options shared by the model, validation, and controllers.
const QUOTATION_OFFER_TYPES = ["full", "partial", "modified"];

const QUOTATION_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
  "cancelled"
];

module.exports = {
  QUOTATION_OFFER_TYPES,
  QUOTATION_STATUSES
};
