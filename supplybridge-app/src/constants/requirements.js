import { PRODUCT_CATEGORIES } from "./business";

// Requirement units match the backend list in
// supplybridge-backend/src/constants/productOptions.js
export const REQUIREMENT_UNITS = [
  "kg",
  "ton",
  "pieces",
  "boxes",
  "meters",
  "liters",
  "packs",
  "sets"
];

export const REQUIREMENT_CATEGORIES = PRODUCT_CATEGORIES;

export const REQUIREMENT_STATUS_META = {
  open: {
    label: "Open",
    backgroundColor: "#EDFDF3",
    textColor: "#164E43"
  },
  awarded: {
    label: "Awarded",
    backgroundColor: "#EAF3FB",
    textColor: "#235C8A"
  },
  fulfilled: {
    label: "Fulfilled",
    backgroundColor: "#E6F7EF",
    textColor: "#1B6B4F"
  },
  cancelled: {
    label: "Cancelled",
    backgroundColor: "#FDEEE9",
    textColor: "#B14B2F"
  },
  closed: {
    label: "Closed",
    backgroundColor: "#EFF2ED",
    textColor: "#5A6B64"
  },
  expired: {
    label: "Expired",
    backgroundColor: "#FDEEE9",
    textColor: "#B14B2F"
  }
};

export const getRequirementStatusMeta = (status) => {
  return REQUIREMENT_STATUS_META[status] || REQUIREMENT_STATUS_META.open;
};

export const MAX_REQUIREMENT_IMAGES = 3;
