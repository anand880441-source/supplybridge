const mongoose = require("mongoose");

const BUSINESS_TYPES = [
  "Manufacturer",
  "Wholesaler",
  "Distributor",
  "Trader",
  "Retailer",
  "Service Provider",
  "Other"
];

const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected"
];

const BUSINESS_DOCUMENT_TYPES = [
  "pan",
  "gst",
  "registration",
  "address"
];

const verificationDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: BUSINESS_DOCUMENT_TYPES,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      trim: true,
      default: ""
    },
    mimeType: {
      type: String,
      trim: true,
      default: ""
    },
    size: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const portfolioItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Portfolio title cannot exceed 100 characters"],
      default: ""
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Portfolio description cannot exceed 500 characters"],
      default: ""
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ""
    },
    completedAt: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      trim: true,
      maxlength: [120, "Portfolio location cannot exceed 120 characters"],
      default: ""
    },
    category: {
      type: String,
      trim: true,
      maxlength: [60, "Portfolio category cannot exceed 60 characters"],
      default: ""
    }
  },
  { _id: true }
);

// One business profile belongs to one user account.
// The same profile is used in both Buyer Mode and Seller Mode.
const businessSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [120, "Company name cannot exceed 120 characters"]
    },
    legalName: {
      type: String,
      trim: true,
      maxlength: [160, "Legal name cannot exceed 160 characters"],
      default: ""
    },
    logoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    businessType: {
      type: String,
      required: [true, "Business type is required"],
      enum: {
        values: BUSINESS_TYPES,
        message: "Please choose a valid business type"
      }
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person is required"],
      trim: true,
      minlength: [2, "Contact person must be at least 2 characters"],
      maxlength: [80, "Contact person cannot exceed 80 characters"]
    },
    phone: {
      type: String,
      required: [true, "Business phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Business phone number must contain 10 digits"]
    },
    email: {
      type: String,
      required: [true, "Business email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid business email address"
      ]
    },
    address: {
      type: String,
      required: [true, "Business address is required"],
      trim: true,
      minlength: [5, "Business address must be at least 5 characters"],
      maxlength: [300, "Business address cannot exceed 300 characters"]
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      minlength: [2, "City must be at least 2 characters"],
      maxlength: [80, "City cannot exceed 80 characters"]
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      minlength: [2, "State must be at least 2 characters"],
      maxlength: [80, "State cannot exceed 80 characters"]
    },
    pincode: {
      type: String,
      required: [true, "PIN code is required"],
      trim: true,
      match: [/^[0-9]{6}$/, "PIN code must contain 6 digits"]
    },
    website: {
      type: String,
      trim: true,
      maxlength: [300, "Website cannot exceed 300 characters"],
      default: ""
    },
    yearEstablished: {
      type: Number,
      min: [1900, "Year established cannot be before 1900"],
      max: [new Date().getFullYear(), "Year established cannot be in the future"],
      default: null
    },
    categories: {
      type: [String],
      required: [true, "At least one product category is required"],
      validate: {
        validator: (categories) => {
          const hasValidCount =
            categories.length > 0 && categories.length <= 20;

          const hasValidNames = categories.every(
            (category) =>
              typeof category === "string" &&
              category.trim().length > 0 &&
              category.length <= 60
          );

          return hasValidCount && hasValidNames;
        },
        message: "Please provide between 1 and 20 valid categories"
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: ""
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[0-9A-Z]{15}$/, "GSTIN must contain 15 letters and numbers"],
      default: ""
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Please provide a valid PAN"],
      default: ""
    },
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [80, "Registration number cannot exceed 80 characters"],
      default: ""
    },
    verificationDocuments: {
      type: [verificationDocumentSchema],
      default: []
    },
    verificationRequestedAt: {
      type: Date,
      default: null
    },
    verificationReviewedAt: {
      type: Date,
      default: null
    },
    verificationNote: {
      type: String,
      trim: true,
      maxlength: [500, "Verification note cannot exceed 500 characters"],
      default: ""
    },
    // Verification is a separate review process.
    // Entering a GSTIN does not change this status automatically.
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: "unverified"
    },
    portfolio: {
      type: [portfolioItemSchema],
      default: [],
      validate: {
        validator: (items) => Array.isArray(items) && items.length <= 6,
        message: "You can add up to 6 portfolio items"
      }
    },
    showContactOnProfile: {
      type: Boolean,
      default: true
    },
    buyerRatingAverage: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    buyerRatingCount: {
      type: Number,
      min: 0,
      default: 0
    },
    sellerRatingAverage: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    sellerRatingCount: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Business = mongoose.model("Business", businessSchema);

module.exports = Business;
module.exports.BUSINESS_TYPES = BUSINESS_TYPES;
module.exports.BUSINESS_DOCUMENT_TYPES = BUSINESS_DOCUMENT_TYPES;
module.exports.VERIFICATION_STATUSES = VERIFICATION_STATUSES;
