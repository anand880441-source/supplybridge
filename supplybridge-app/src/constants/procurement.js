export const EMD_RATE_OPTIONS = [2, 3, 4, 5];

export const TERMS_VERSION = "procurement-v2";

export const GST_RATES = [0, 5, 12, 18, 28];

export const GST_PRICING_MODES = [
  {
    value: "exclusive",
    label: "GST extra",
    description: "The quoted price does not include GST."
  },
  {
    value: "inclusive",
    label: "GST included",
    description: "The quoted price already includes GST."
  }
];

export const EMD_STATUS_META = {
  not_required: {
    label: "No EMD",
    icon: "shield-checkmark-outline",
    backgroundColor: "#EFF2ED",
    textColor: "#5A6B64"
  },
  held: {
    label: "EMD held",
    icon: "lock-closed-outline",
    backgroundColor: "#FDF3DD",
    textColor: "#8A5B00"
  },
  captured: {
    label: "EMD captured",
    icon: "shield-checkmark-outline",
    backgroundColor: "#EDFDF3",
    textColor: "#164E43"
  },
  released: {
    label: "EMD released",
    icon: "return-up-back-outline",
    backgroundColor: "#EFF2ED",
    textColor: "#5A6B64"
  },
  forfeited: {
    label: "EMD forfeited",
    icon: "alert-circle-outline",
    backgroundColor: "#FDEEE9",
    textColor: "#B14B2F"
  }
};

export const BUYER_CANCELLATION_REASONS = [
  { value: "buyer_no_longer_needs", label: "No longer needed" },
  { value: "mutual_agreement", label: "Mutually agreed" },
  { value: "other", label: "Other reason" }
];

export const SELLER_CANCELLATION_REASONS = [
  { value: "seller_unable_to_fulfil", label: "Unable to fulfil" },
  { value: "mutual_agreement", label: "Mutually agreed" },
  { value: "other", label: "Other reason" }
];

export const CANCELLATION_REASON_LABELS = {
  seller_unable_to_fulfil: "Seller could not fulfil the order",
  buyer_no_longer_needs: "Buyer no longer needs the order",
  mutual_agreement: "Cancelled by mutual agreement",
  other: "Other reason"
};

export const getEmdStatusMeta = (status) => {
  return EMD_STATUS_META[status] || EMD_STATUS_META.not_required;
};

export const getCancellationReasonLabel = (reason) => {
  return CANCELLATION_REASON_LABELS[reason] || "Cancellation reason not recorded";
};
