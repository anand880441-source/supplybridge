const { BUSINESS_TYPES } = require("../../models/Business");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10}$/;
const PINCODE_PATTERN = /^[0-9]{6}$/;
const GSTIN_PATTERN = /^[0-9A-Z]{15}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const readTrimmed = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

// Validates a create or update request.
// Returns { values } when the data is valid, or { error } when it is not.
const validateBusinessPayload = (body, isUpdate = false) => {
  const values = {};
  const hasField = (field) => body[field] !== undefined;

  if (!isUpdate || hasField("companyName")) {
    const companyName = readTrimmed(body.companyName);

    if (companyName.length < 2 || companyName.length > 120) {
      return {
        error: "Company name must be between 2 and 120 characters"
      };
    }

    values.companyName = companyName;
  }

  if (!isUpdate || hasField("legalName")) {
    const legalName = readTrimmed(body.legalName);

    if (legalName.length > 160) {
      return { error: "Legal name cannot exceed 160 characters" };
    }

    values.legalName = legalName;
  }

  if (!isUpdate || hasField("businessType")) {
    const businessType = readTrimmed(body.businessType);

    const matchedType = BUSINESS_TYPES.find(
      (type) => type.toLowerCase() === businessType.toLowerCase()
    );

    if (!matchedType) {
      return {
        error: `Business type must be one of: ${BUSINESS_TYPES.join(", ")}`
      };
    }

    values.businessType = matchedType;
  }

  if (!isUpdate || hasField("contactPerson")) {
    const contactPerson = readTrimmed(body.contactPerson);

    if (contactPerson.length < 2 || contactPerson.length > 80) {
      return {
        error: "Contact person must be between 2 and 80 characters"
      };
    }

    values.contactPerson = contactPerson;
  }

  if (!isUpdate || hasField("phone")) {
    const phone = readTrimmed(body.phone).replace(/[\s-]/g, "");

    if (!PHONE_PATTERN.test(phone)) {
      return {
        error: "Business phone number must contain exactly 10 digits"
      };
    }

    values.phone = phone;
  }

  if (!isUpdate || hasField("email")) {
    const email = readTrimmed(body.email).toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      return {
        error: "Please provide a valid business email address"
      };
    }

    values.email = email;
  }

  if (!isUpdate || hasField("address")) {
    const address = readTrimmed(body.address);

    if (address.length < 5 || address.length > 300) {
      return {
        error: "Business address must be between 5 and 300 characters"
      };
    }

    values.address = address;
  }

  if (!isUpdate || hasField("city")) {
    const city = readTrimmed(body.city);

    if (city.length < 2 || city.length > 80) {
      return { error: "City must be between 2 and 80 characters" };
    }

    values.city = city;
  }

  if (!isUpdate || hasField("state")) {
    const state = readTrimmed(body.state);

    if (state.length < 2 || state.length > 80) {
      return { error: "State must be between 2 and 80 characters" };
    }

    values.state = state;
  }

  if (!isUpdate || hasField("pincode")) {
    const pincode = readTrimmed(body.pincode);

    if (!PINCODE_PATTERN.test(pincode)) {
      return { error: "PIN code must contain exactly 6 digits" };
    }

    values.pincode = pincode;
  }

  if (!isUpdate || hasField("website")) {
    const website = readTrimmed(body.website);

    if (website) {
      if (website.length > 300) {
        return { error: "Website cannot exceed 300 characters" };
      }

      let parsedWebsite;

      try {
        parsedWebsite = new URL(website);
      } catch (error) {
        return { error: "Website must be a valid web address" };
      }

      if (!["http:", "https:"].includes(parsedWebsite.protocol)) {
        return { error: "Website must start with http:// or https://" };
      }
    }

    values.website = website;
  }

  if (!isUpdate || hasField("yearEstablished")) {
    const rawYear = body.yearEstablished;
    const currentYear = new Date().getFullYear();

    if (rawYear === "" || rawYear === null || rawYear === undefined) {
      values.yearEstablished = null;
    } else {
      const yearEstablished = Number(rawYear);

      if (
        !Number.isInteger(yearEstablished) ||
        yearEstablished < 1900 ||
        yearEstablished > currentYear
      ) {
        return {
          error: `Year established must be between 1900 and ${currentYear}`
        };
      }

      values.yearEstablished = yearEstablished;
    }
  }

  if (!isUpdate || hasField("showContactOnProfile")) {
    values.showContactOnProfile = body.showContactOnProfile !== false;
  }

  if (!isUpdate || hasField("categories")) {
    if (!Array.isArray(body.categories)) {
      return { error: "Product categories must be a list" };
    }

    const categories = body.categories
      .filter((category) => typeof category === "string")
      .map((category) => category.trim())
      .filter((category) => category.length > 0);

    const uniqueCategories = [...new Set(categories)];

    if (uniqueCategories.length === 0 || uniqueCategories.length > 20) {
      return {
        error: "Please select between 1 and 20 product categories"
      };
    }

    const hasLongCategory = uniqueCategories.some(
      (category) => category.length > 60
    );

    if (hasLongCategory) {
      return { error: "Each category must be 60 characters or fewer" };
    }

    values.categories = uniqueCategories;
  }

  if (!isUpdate || hasField("description")) {
    const description = readTrimmed(body.description);

    if (description.length > 1000) {
      return { error: "Description cannot exceed 1000 characters" };
    }

    values.description = description;
  }

  if (!isUpdate || hasField("gstin")) {
    const gstin = readTrimmed(body.gstin).toUpperCase();

    // GSTIN is optional, but if provided it must have the basic shape.
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      return { error: "GSTIN must contain 15 letters and numbers" };
    }

    values.gstin = gstin;
  }

  if (!isUpdate || hasField("panNumber")) {
    const panNumber = readTrimmed(body.panNumber).toUpperCase();

    if (panNumber && !PAN_PATTERN.test(panNumber)) {
      return { error: "PAN must be in the format ABCDE1234F" };
    }

    values.panNumber = panNumber;
  }

  if (!isUpdate || hasField("registrationNumber")) {
    const registrationNumber = readTrimmed(
      body.registrationNumber
    ).toUpperCase();

    if (registrationNumber.length > 80) {
      return { error: "Registration number cannot exceed 80 characters" };
    }

    values.registrationNumber = registrationNumber;
  }

  if (isUpdate) {
    const editableFields = [
      "companyName",
      "legalName",
      "businessType",
      "contactPerson",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "pincode",
      "website",
      "yearEstablished",
      "showContactOnProfile",
      "categories",
      "description",
      "gstin",
      "panNumber",
      "registrationNumber"
    ];

    const hasAnyField = editableFields.some((field) => hasField(field));

    if (!hasAnyField) {
      return { error: "Please provide at least one field to update" };
    }
  }

  return { values };
};

module.exports = {
  validateBusinessPayload
};
