// Offer types and statuses match the backend quotation module.
export const QUOTATION_OFFER_TYPES = [
  {
    value: "full",
    label: "Full offer",
    description: "Supply the exact quantity the buyer requested."
  },
  {
    value: "partial",
    label: "Partial offer",
    description: "Offer less than the requested quantity."
  },
  {
    value: "modified",
    label: "Modified offer",
    description: "Adjust the quantity up to the requested amount."
  }
];

export const QUOTATION_STATUS_META = {
  pending: {
    label: "Pending",
    backgroundColor: "#FDF3DD",
    textColor: "#8A5B00"
  },
  accepted: {
    label: "Accepted",
    backgroundColor: "#EDFDF3",
    textColor: "#164E43"
  },
  rejected: {
    label: "Rejected",
    backgroundColor: "#FDEEE9",
    textColor: "#B14B2F"
  },
  withdrawn: {
    label: "Withdrawn",
    backgroundColor: "#EFF2ED",
    textColor: "#5A6B64"
  },
  expired: {
    label: "Expired",
    backgroundColor: "#EFF2ED",
    textColor: "#5A6B64"
  },
  cancelled: {
    label: "Cancelled",
    backgroundColor: "#FDEEE9",
    textColor: "#B14B2F"
  }
};

export const QUOTATION_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" }
];

export const getQuotationStatusMeta = (status) => {
  return QUOTATION_STATUS_META[status] || QUOTATION_STATUS_META.pending;
};

export const getQuotationOfferTypeMeta = (offerType) => {
  return (
    QUOTATION_OFFER_TYPES.find((option) => option.value === offerType) || {
      value: offerType,
      label: "Offer",
      description: ""
    }
  );
};

export const getQuotationStatusDescription = (status) => {
  const descriptions = {
    pending:
      "Waiting for the buyer to review and respond. The EMD is held in the seller's wallet.",
    accepted:
      "The buyer accepted this quotation. The EMD is captured and the order is ready.",
    rejected:
      "The buyer rejected this quotation. The seller's EMD hold was released.",
    withdrawn:
      "The seller withdrew this quotation. The EMD hold was released.",
    expired:
      "The requirement deadline passed before a final response. The EMD hold was released.",
    cancelled:
      "The order was cancelled. The EMD outcome is shown below."
  };

  return descriptions[status] || "";
};
