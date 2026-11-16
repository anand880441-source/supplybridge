// Product options shared by requirement validation and the mobile app.
// The app keeps its own copy in src/constants/business.js.

const PRODUCT_CATEGORIES = [
  "Apparel & Textiles",
  "Furniture & Home",
  "Electronics",
  "Industrial Machinery",
  "Packaging & Printing",
  "Food & Beverages",
  "Construction Materials",
  "Automotive Parts",
  "Chemicals",
  "Agriculture",
  "Medical Supplies",
  "Other"
];

const REQUIREMENT_UNITS = [
  "kg",
  "ton",
  "pieces",
  "boxes",
  "meters",
  "liters",
  "packs",
  "sets"
];

module.exports = {
  PRODUCT_CATEGORIES,
  REQUIREMENT_UNITS
};
