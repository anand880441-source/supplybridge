const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Business = require("../../models/Business");
const {
  BUSINESS_DOCUMENT_TYPES
} = require("../../models/Business");
const {
  PRIVATE_UPLOAD_DIR,
  UPLOAD_DIR,
  removeFile
} = require("../../middleware/uploadMiddleware");
const {
  formatBusinessRatings
} = require("../../utils/businessSummary");
const {
  validateBusinessPayload
} = require("./business.validation");

const formatPortfolioItem = (item) => ({
  id: item._id,
  title: item.title || "",
  description: item.description || "",
  imageUrl: item.imageUrl || "",
  completedAt: item.completedAt,
  location: item.location || "",
  category: item.category || ""
});

const formatDocument = (businessId, document) => ({
  id: document._id,
  type: document.type,
  originalName: document.originalName || "",
  mimeType: document.mimeType || "",
  size: document.size || 0,
  uploadedAt: document.uploadedAt,
  downloadPath: `/api/businesses/${businessId}/documents/${document._id}`
});

const formatPortfolio = (business) => {
  return (business.portfolio || []).map(formatPortfolioItem);
};

// Full details are only returned to the owner.
const formatBusiness = (business) => {
  return {
    id: business._id,
    ownerId: business.ownerId,
    companyName: business.companyName,
    legalName: business.legalName || "",
    logoUrl: business.logoUrl || "",
    businessType: business.businessType,
    contactPerson: business.contactPerson,
    phone: business.phone,
    email: business.email,
    address: business.address,
    city: business.city,
    state: business.state,
    pincode: business.pincode,
    website: business.website || "",
    yearEstablished: business.yearEstablished || null,
    categories: business.categories,
    description: business.description,
    gstin: business.gstin,
    panNumber: business.panNumber || "",
    registrationNumber: business.registrationNumber || "",
    verificationStatus: business.verificationStatus,
    verificationRequestedAt: business.verificationRequestedAt,
    verificationReviewedAt: business.verificationReviewedAt,
    verificationNote: business.verificationNote || "",
    verificationDocuments: (business.verificationDocuments || []).map(
      (document) => formatDocument(business._id, document)
    ),
    portfolio: formatPortfolio(business),
    showContactOnProfile: business.showContactOnProfile !== false,
    ratings: formatBusinessRatings(business),
    createdAt: business.createdAt,
    updatedAt: business.updatedAt
  };
};

// Other logged-in users can see this safe subset only.
const formatPublicBusiness = (business) => {
  const showContact = business.showContactOnProfile !== false;

  return {
    id: business._id,
    companyName: business.companyName,
    logoUrl: business.logoUrl || "",
    businessType: business.businessType,
    categories: business.categories,
    description: business.description,
    city: business.city,
    state: business.state,
    website: business.website || "",
    yearEstablished: business.yearEstablished || null,
    contactPerson: showContact ? business.contactPerson : "",
    phone: showContact ? business.phone : "",
    email: showContact ? business.email : "",
    verificationStatus: business.verificationStatus,
    portfolio: formatPortfolio(business),
    ratings: formatBusinessRatings(business),
    createdAt: business.createdAt
  };
};

// POST /api/businesses
const createBusiness = async (req, res) => {
  try {
    const existingBusiness = await Business.findOne({
      ownerId: req.user._id
    });

    if (existingBusiness) {
      return res.status(409).json({
        success: false,
        message: "You already have a business profile"
      });
    }

    const body = req.body || {};
    const result = validateBusinessPayload(body, false);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    const business = await Business.create({
      ...result.values,
      ownerId: req.user._id,
      // A new profile always starts unverified. The client cannot
      // set the verification status itself.
      verificationStatus: "unverified"
    });

    return res.status(201).json({
      success: true,
      message: "Business profile created successfully",
      data: formatBusiness(business)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already have a business profile"
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Create business error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create the business profile"
    });
  }
};

// GET /api/businesses/me
const getMyBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "You have not created a business profile yet"
      });
    }

    return res.status(200).json({
      success: true,
      data: formatBusiness(business)
    });
  } catch (error) {
    console.error("Get my business error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the business profile"
    });
  }
};

// GET /api/businesses/:id
const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid business id"
      });
    }

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    const isOwner = business.ownerId.toString() === req.user._id.toString();

    return res.status(200).json({
      success: true,
      data: isOwner ? formatBusiness(business) : formatPublicBusiness(business)
    });
  } catch (error) {
    console.error("Get business error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the business profile"
    });
  }
};

// PATCH /api/businesses/:id
const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid business id"
      });
    }

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own business profile"
      });
    }

    const body = req.body || {};
    const result = validateBusinessPayload(body, true);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // Only editable fields are copied. verificationStatus is intentionally
    // not editable by the user.
    Object.assign(business, result.values);
    await business.save();

    return res.status(200).json({
      success: true,
      message: "Business profile updated successfully",
      data: formatBusiness(business)
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Update business error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the business profile"
    });
  }
};

const removePublicUpload = (publicUrl) => {
  if (!publicUrl || !publicUrl.startsWith("/uploads/")) {
    return;
  }

  const uploadsRoot = path.resolve(UPLOAD_DIR);
  const filePath = path.resolve(
    UPLOAD_DIR,
    publicUrl.slice("/uploads/".length)
  );

  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return;
  }

  removeFile(filePath);
};

const removePrivateDocument = (storedName) => {
  if (!storedName) {
    return;
  }

  const documentsRoot = path.resolve(PRIVATE_UPLOAD_DIR);
  const filePath = path.resolve(PRIVATE_UPLOAD_DIR, path.basename(storedName));

  if (!filePath.startsWith(`${documentsRoot}${path.sep}`)) {
    return;
  }

  removeFile(filePath);
};

const parsePortfolioDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  const completedAt = new Date(value);

  if (Number.isNaN(completedAt.getTime())) {
    return { error: "Completion date must be a valid date" };
  }

  if (completedAt > new Date()) {
    return { error: "Completion date cannot be in the future" };
  }

  return { value: completedAt };
};

// POST /api/businesses/:id/logo
const updateBusinessLogo = async (req, res) => {
  let file = req.file;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      removeFile(file?.path);
      return res.status(400).json({
        success: false,
        message: "Invalid business id"
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please choose a logo image"
      });
    }

    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      removeFile(file.path);
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    const previousLogoUrl = business.logoUrl;
    business.logoUrl = `/uploads/business-logos/${file.filename}`;

    try {
      await business.save();
    } catch (error) {
      removeFile(file.path);
      throw error;
    }

    removePublicUpload(previousLogoUrl);
    file = null;

    return res.status(200).json({
      success: true,
      message: "Business logo updated",
      data: formatBusiness(business)
    });
  } catch (error) {
    removeFile(file?.path);

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Update business logo error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the business logo"
    });
  }
};

// DELETE /api/businesses/:id/logo
const deleteBusinessLogo = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    const previousLogoUrl = business.logoUrl;
    business.logoUrl = "";
    await business.save();
    removePublicUpload(previousLogoUrl);

    return res.status(200).json({
      success: true,
      message: "Business logo removed",
      data: formatBusiness(business)
    });
  } catch (error) {
    console.error("Delete business logo error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove the business logo"
    });
  }
};

// POST /api/businesses/:id/portfolio
const addPortfolioItem = async (req, res) => {
  let file = req.file;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      removeFile(file?.path);
      return res.status(400).json({
        success: false,
        message: "Invalid business id"
      });
    }

    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      removeFile(file?.path);
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    if ((business.portfolio || []).length >= 6) {
      removeFile(file?.path);
      return res.status(400).json({
        success: false,
        message: "You can add up to 6 portfolio items"
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please choose a project image"
      });
    }

    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";
    const location =
      typeof req.body.location === "string" ? req.body.location.trim() : "";
    const category =
      typeof req.body.category === "string" ? req.body.category.trim() : "";

    if (title.length < 2 || title.length > 100) {
      removeFile(file.path);
      return res.status(400).json({
        success: false,
        message: "Portfolio title must be between 2 and 100 characters"
      });
    }

    if (description.length > 500) {
      removeFile(file.path);
      return res.status(400).json({
        success: false,
        message: "Portfolio description cannot exceed 500 characters"
      });
    }

    if (location.length > 120 || category.length > 60) {
      removeFile(file.path);
      return res.status(400).json({
        success: false,
        message: "Portfolio location or category is too long"
      });
    }

    const completedAtResult = parsePortfolioDate(req.body.completedAt);

    if (completedAtResult.error) {
      removeFile(file.path);
      return res.status(400).json({
        success: false,
        message: completedAtResult.error
      });
    }

    business.portfolio.push({
      title,
      description,
      imageUrl: `/uploads/portfolio/${file.filename}`,
      completedAt: completedAtResult.value,
      location,
      category
    });

    try {
      await business.save();
    } catch (error) {
      removeFile(file.path);
      throw error;
    }

    file = null;

    return res.status(201).json({
      success: true,
      message: "Portfolio item added",
      data: formatBusiness(business)
    });
  } catch (error) {
    removeFile(file?.path);

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Add portfolio item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add the portfolio item"
    });
  }
};

// DELETE /api/businesses/:id/portfolio/:itemId
const removePortfolioItem = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    const item = business.portfolio.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Portfolio item not found"
      });
    }

    const imageUrl = item.imageUrl;
    item.deleteOne();
    await business.save();
    removePublicUpload(imageUrl);

    return res.status(200).json({
      success: true,
      message: "Portfolio item removed",
      data: formatBusiness(business)
    });
  } catch (error) {
    console.error("Remove portfolio item error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove the portfolio item"
    });
  }
};

// POST /api/businesses/:id/documents
const uploadVerificationDocumentFile = async (req, res) => {
  let file = req.file;

  try {
    const type = typeof req.body.type === "string" ? req.body.type.trim() : "";

    if (!BUSINESS_DOCUMENT_TYPES.includes(type)) {
      removeFile(file?.path);
      return res.status(400).json({
        success: false,
        message: "Please choose a valid document type"
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please choose a document file"
      });
    }

    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      removeFile(file.path);
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    if (business.verificationStatus === "pending") {
      removeFile(file.path);
      return res.status(400).json({
        success: false,
        message: "Verification is under review. Documents cannot be changed now"
      });
    }

    const previousDocument = (business.verificationDocuments || []).find(
      (document) => document.type === type
    );
    const previousStoredName = previousDocument?.fileUrl || "";

    if (previousDocument) {
      previousDocument.fileUrl = file.filename;
      previousDocument.originalName = file.originalname;
      previousDocument.mimeType = file.mimetype;
      previousDocument.size = file.size;
      previousDocument.uploadedAt = new Date();
    } else {
      business.verificationDocuments.push({
        type,
        fileUrl: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      });
    }

    if (business.verificationStatus === "verified") {
      business.verificationStatus = "unverified";
      business.verificationReviewedAt = null;
      business.verificationNote =
        "Documents changed. Submit the profile for verification again.";
    }

    try {
      await business.save();
    } catch (error) {
      removeFile(file.path);
      throw error;
    }

    if (previousStoredName && previousStoredName !== file.filename) {
      removePrivateDocument(previousStoredName);
    }

    file = null;

    return res.status(201).json({
      success: true,
      message: "Verification document uploaded",
      data: formatBusiness(business)
    });
  } catch (error) {
    removeFile(file?.path);

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Upload verification document error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to upload the verification document"
    });
  }
};

// DELETE /api/businesses/:id/documents/:documentId
const deleteVerificationDocument = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    if (business.verificationStatus === "pending") {
      return res.status(400).json({
        success: false,
        message: "Verification is under review. Documents cannot be changed now"
      });
    }

    const document = business.verificationDocuments.id(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Verification document not found"
      });
    }

    const storedName = document.fileUrl;
    document.deleteOne();

    if (business.verificationDocuments.length === 0) {
      business.verificationStatus = "unverified";
    } else if (business.verificationStatus === "verified") {
      business.verificationStatus = "unverified";
      business.verificationReviewedAt = null;
      business.verificationNote =
        "Documents changed. Submit the profile for verification again.";
    }

    await business.save();
    removePrivateDocument(storedName);

    return res.status(200).json({
      success: true,
      message: "Verification document removed",
      data: formatBusiness(business)
    });
  } catch (error) {
    console.error("Delete verification document error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove the verification document"
    });
  }
};

// GET /api/businesses/:id/documents/:documentId
const downloadVerificationDocument = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    const document = business.verificationDocuments.id(
      req.params.documentId
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Verification document not found"
      });
    }

    const documentsRoot = path.resolve(PRIVATE_UPLOAD_DIR);
    const filePath = path.resolve(
      PRIVATE_UPLOAD_DIR,
      path.basename(document.fileUrl)
    );

    if (
      !filePath.startsWith(`${documentsRoot}${path.sep}`) ||
      !fs.existsSync(filePath)
    ) {
      return res.status(404).json({
        success: false,
        message: "The document file is unavailable"
      });
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.download(
      filePath,
      document.originalName || path.basename(filePath)
    );
  } catch (error) {
    console.error("Download verification document error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to download the verification document"
    });
  }
};

// POST /api/businesses/:id/verification
const submitBusinessVerification = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business || business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found"
      });
    }

    if (business.verificationStatus === "pending") {
      return res.status(400).json({
        success: false,
        message: "Your verification request is already under review"
      });
    }

    if (business.verificationStatus === "verified") {
      return res.status(400).json({
        success: false,
        message: "Your business is already verified"
      });
    }

    if (
      !business.legalName ||
      !business.panNumber ||
      !business.registrationNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Add the legal business name, PAN, and registration number before submitting"
      });
    }

    const requiredTypes = ["pan", "registration", "address"];

    if (business.gstin) {
      requiredTypes.push("gst");
    }

    const uploadedTypes = new Set(
      (business.verificationDocuments || []).map(
        (document) => document.type
      )
    );
    const missingTypes = requiredTypes.filter(
      (type) => !uploadedTypes.has(type)
    );

    if (missingTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Upload the required documents first: ${missingTypes.join(", ")}`
      });
    }

    const now = new Date();
    business.verificationStatus = "pending";
    business.verificationRequestedAt = now;
    business.verificationReviewedAt = null;
    business.verificationNote = "";
    await business.save();

    return res.status(200).json({
      success: true,
      message: "Verification request submitted for review",
      data: formatBusiness(business)
    });
  } catch (error) {
    console.error("Submit business verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the verification request"
    });
  }
};

module.exports = {
  addPortfolioItem,
  createBusiness,
  deleteBusinessLogo,
  deleteVerificationDocument,
  downloadVerificationDocument,
  getMyBusiness,
  getBusinessById,
  removePortfolioItem,
  submitBusinessVerification,
  updateBusiness,
  updateBusinessLogo,
  uploadVerificationDocumentFile
};

