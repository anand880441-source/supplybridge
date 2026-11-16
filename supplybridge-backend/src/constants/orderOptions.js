const ORDER_STATUSES = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled"
];

const SELLER_STATUS_TRANSITIONS = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: [],
  delivered: [],
  cancelled: []
};

const BUYER_STATUS_TRANSITIONS = {
  confirmed: ["cancelled"],
  processing: ["cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: []
};

module.exports = {
  ORDER_STATUSES,
  SELLER_STATUS_TRANSITIONS,
  BUYER_STATUS_TRANSITIONS
};
