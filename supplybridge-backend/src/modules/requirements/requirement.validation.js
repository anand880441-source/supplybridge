const {
  PRODUCT_CATEGORIES,
  REQUIREMENT_UNITS
} = require("../../constants/productOptions");
const { EMD_RATES } = require("../../constants/procurement");

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

const validateRequirementPayload = (body, isUpdate = false) => {
  const values = {};
  const hasField = (field) => body[field] !== undefined;

  if (!isUpdate || hasField("productName")) {
    const productName = readTrimmed(body.productName);

    if (productName.length < 2 || productName.length > 120) {
      return {
        error: "Product name must be between 2 and 120 characters"
      };
    }

    values.productName = productName;
  }

  if (!isUpdate || hasField("category")) {
    const category = readTrimmed(body.category);

    const matchedCategory = PRODUCT_CATEGORIES.find(
      (item) => item.toLowerCase() === category.toLowerCase()
    );

    if (!matchedCategory) {
      return {
        error: `Product category must be one of: ${PRODUCT_CATEGORIES.join(
          ", "
        )}`
      };
    }

    values.category = matchedCategory;
  }

  if (!isUpdate || hasField("subcategory")) {
    const subcategory = readTrimmed(body.subcategory);

    if (subcategory.length > 60) {
      return { error: "Subcategory cannot exceed 60 characters" };
    }

    values.subcategory = subcategory;
  }

  if (!isUpdate || hasField("quantity")) {
    const quantity = readNumber(body.quantity);

    if (
      quantity === null ||
      Number.isNaN(quantity) ||
      quantity <= 0 ||
      quantity > 1000000
    ) {
      return { error: "Quantity must be a number greater than zero" };
    }

    values.quantity = Math.round(quantity * 100) / 100;
  }

  if (!isUpdate || hasField("unit")) {
    const unit = readTrimmed(body.unit).toLowerCase();

    if (!REQUIREMENT_UNITS.includes(unit)) {
      return {
        error: `Unit must be one of: ${REQUIREMENT_UNITS.join(", ")}`
      };
    }

    values.unit = unit;
  }

  if (!isUpdate || hasField("specifications")) {
    const specifications = readTrimmed(body.specifications);

    if (specifications.length < 10 || specifications.length > 2000) {
      return {
        error: "Specifications must be between 10 and 2000 characters"
      };
    }

    values.specifications = specifications;
  }

  if (!isUpdate || hasField("customization")) {
    const customization = readTrimmed(body.customization);

    if (customization.length > 1000) {
      return { error: "Customization details cannot exceed 1000 characters" };
    }

    values.customization = customization;
  }

  if (!isUpdate || hasField("budgetMin")) {
    const budgetMin = readNumber(body.budgetMin);

    if (Number.isNaN(budgetMin) || budgetMin < 0 || budgetMin > 100000000) {
      return { error: "Minimum budget must be a valid amount" };
    }

    values.budgetMin = budgetMin;
  }

  if (!isUpdate || hasField("budgetMax")) {
    const budgetMax = readNumber(body.budgetMax);

    if (Number.isNaN(budgetMax) || budgetMax < 0 || budgetMax > 100000000) {
      return { error: "Maximum budget must be a valid amount" };
    }

    values.budgetMax = budgetMax;
  }

  const hasBothBudgets =
    values.budgetMin !== undefined &&
    values.budgetMax !== undefined &&
    values.budgetMin !== null &&
    values.budgetMax !== null;

  if (hasBothBudgets && values.budgetMin > values.budgetMax) {
    return {
      error: "Minimum budget cannot be greater than maximum budget"
    };
  }

  if (!isUpdate || hasField("deliveryLocation")) {
    const deliveryLocation = readTrimmed(body.deliveryLocation);

    if (deliveryLocation.length < 2 || deliveryLocation.length > 200) {
      return {
        error: "Delivery location must be between 2 and 200 characters"
      };
    }

    values.deliveryLocation = deliveryLocation;
  }

  const deliveryTextFields = [
    {
      field: "deliveryContactName",
      label: "Delivery contact name",
      max: 80
    },
    {
      field: "deliveryAddress",
      label: "Delivery address",
      max: 300
    },
    {
      field: "deliveryCity",
      label: "Delivery city",
      max: 80
    },
    {
      field: "deliveryState",
      label: "Delivery state",
      max: 80
    },
    {
      field: "deliveryInstructions",
      label: "Delivery instructions",
      max: 500
    }
  ];

  for (const item of deliveryTextFields) {
    if (!isUpdate || hasField(item.field)) {
      const value = readTrimmed(body[item.field]);

      if (value.length > item.max) {
        return { error: `${item.label} cannot exceed ${item.max} characters` };
      }

      values[item.field] = value;
    }
  }

  if (!isUpdate || hasField("deliveryPhone")) {
    const deliveryPhone = readTrimmed(body.deliveryPhone);

    if (deliveryPhone && !/^[0-9]{10}$/.test(deliveryPhone)) {
      return { error: "Delivery phone must contain exactly 10 digits" };
    }

    values.deliveryPhone = deliveryPhone;
  }

  if (!isUpdate || hasField("deliveryPincode")) {
    const deliveryPincode = readTrimmed(body.deliveryPincode);

    if (deliveryPincode && !/^[0-9]{6}$/.test(deliveryPincode)) {
      return { error: "Delivery PIN code must contain exactly 6 digits" };
    }

    values.deliveryPincode = deliveryPincode;
  }

  if (!isUpdate || hasField("deliveryDate")) {
    const rawDate = readTrimmed(body.deliveryDate);
    const deliveryDate = rawDate ? new Date(rawDate) : null;

    if (!deliveryDate || Number.isNaN(deliveryDate.getTime())) {
      return { error: "Please provide a valid delivery date" };
    }

    if (deliveryDate < getStartOfToday()) {
      return { error: "Delivery date cannot be in the past" };
    }

    values.deliveryDate = deliveryDate;
  }

  if (!isUpdate || hasField("notes")) {
    const notes = readTrimmed(body.notes);

    if (notes.length > 1000) {
      return { error: "Notes cannot exceed 1000 characters" };
    }

    values.notes = notes;
  }

  if (!isUpdate || hasField("emdRate")) {
    const emdRate =
      hasField("emdRate") ? readNumber(body.emdRate) : EMD_RATES[0];

    if (emdRate === null || Number.isNaN(emdRate) || !EMD_RATES.includes(emdRate)) {
      return {
        error: `EMD rate must be one of: ${EMD_RATES.join(", ")}`
      };
    }

    values.emdRate = emdRate;
  }

  return { values };
};

module.exports = {
  validateRequirementPayload
};
