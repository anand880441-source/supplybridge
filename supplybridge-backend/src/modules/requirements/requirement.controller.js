const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Business = require("../../models/Business");
const Quotation = require("../../models/Quotation");
const Requirement = require("../../models/Requirement");
const { UPLOAD_DIR } = require("../../middleware/uploadMiddleware");
const {
  BUSINESS_PUBLIC_FIELDS,
  formatBusinessSummary
} = require("../../utils/businessSummary");
const {
  getStartOfToday,
  markExpiredRequirements
} = require("../../utils/requirementExpiry");
const {
  validateRequirementPayload
} = require("./requirement.validation");
const {
  releasePendingQuotations,
  repostRequirement: repostRequirementService
} = require("../../services/procurement.service");
const {
  createNotification
} = require("../notifications/notification.service");

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const removeRequestFiles = (files) => {
  (files || []).forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      // The file may already be gone.
    }
  });
};

const removeStoredImage = (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("/uploads/")) {
    return;
  }

  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(imageUrl)));
  } catch (error) {
    // The file may already be gone.
  }
};

const getUploadedImageUrls = (files) => {
  return (files || []).map((file) => `/uploads/${file.filename}`);
};

const parseExistingImages = (rawValue) => {
  if (rawValue === undefined) {
    return { provided: false, images: [] };
  }

  const rawText = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (typeof rawText !== "string") {
    return { error: "Existing images must be a list" };
  }

  try {
    const parsed = JSON.parse(rawText);

    if (!Array.isArray(parsed)) {
      return { error: "Existing images must be a list" };
    }

    const onlyStrings = parsed.every((item) => typeof item === "string");

    if (!onlyStrings) {
      return { error: "Existing images must be a list of image URLs" };
    }

    return { provided: true, images: parsed };
  } catch (error) {
    return { error: "Existing images must be a list" };
  }
};

const formatRequirement = (requirement, isOwner = false) => {
  const data = {
    id: requirement._id,
    productName: requirement.productName,
    category: requirement.category,
    subcategory: requirement.subcategory,
    quantity: requirement.quantity,
    unit: requirement.unit,
    specifications: requirement.specifications,
    customization: requirement.customization,
    budgetMin: requirement.budgetMin,
    budgetMax: requirement.budgetMax,
    deliveryLocation: requirement.deliveryLocation,
    deliveryCity: requirement.deliveryCity || "",
    deliveryState: requirement.deliveryState || "",
    ...(isOwner
      ? {
          deliveryContactName: requirement.deliveryContactName || "",
          deliveryPhone: requirement.deliveryPhone || "",
          deliveryAddress: requirement.deliveryAddress || "",
          deliveryPincode: requirement.deliveryPincode || "",
          deliveryInstructions: requirement.deliveryInstructions || ""
        }
      : {}),
    deliveryDate: requirement.deliveryDate,
    images: requirement.images,
    status: requirement.status,
    emdRate: requirement.emdRate,
    closedAt: requirement.closedAt,
    awardedAt: requirement.awardedAt,
    fulfilledAt: requirement.fulfilledAt,
    cancelledAt: requirement.cancelledAt,
    cancelledByRole: requirement.cancelledByRole,
    cancellationReason: requirement.cancellationReason,
    acceptedQuotationId: requirement.acceptedQuotationId,
    activeOrderId: requirement.activeOrderId,
    previousRequirementId: requirement.previousRequirementId,
    nextRequirementId: requirement.nextRequirementId,
    roundNumber: requirement.roundNumber || 1,
    createdAt: requirement.createdAt,
    updatedAt: requirement.updatedAt,
    business: formatBusinessSummary(requirement.businessId),
    isOwner
  };

  // Notes are private to the buyer who wrote them.
  if (isOwner) {
    data.notes = requirement.notes;
  }

  return data;
};

const populateBusiness = (query) => {
  return query.populate("businessId", BUSINESS_PUBLIC_FIELDS);
};

const getDocumentWithBusiness = async (id) => {
  return populateBusiness(Requirement.findById(id));
};

const isRequirementOwner = (requirement, user) => {
  return requirement.buyerId.toString() === user._id.toString();
};

// POST /api/requirements
const createRequirement = async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id });

    if (!business) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message:
          "Complete your business profile before posting a requirement"
      });
    }

    const result = validateRequirementPayload(req.body || {}, false);

    if (result.error) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    const requirement = await Requirement.create({
      ...result.values,
      buyerId: req.user._id,
      businessId: business._id,
      images: getUploadedImageUrls(req.files),
      status: "open"
    });

    const populated = await getDocumentWithBusiness(requirement._id);

    return res.status(201).json({
      success: true,
      message: "Requirement posted successfully",
      data: formatRequirement(populated, true)
    });
  } catch (error) {
    removeRequestFiles(req.files);

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Create requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to post the requirement"
    });
  }
};

// GET /api/requirements
// Public feed used by sellers. Only open, not-yet-due requirements appear.
const getRequirements = async (req, res) => {
  try {
    await markExpiredRequirements();

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      20
    );

    const filter = {
      status: "open",
      deliveryDate: { $gte: getStartOfToday() }
    };

    if (req.query.category) {
      const { PRODUCT_CATEGORIES } = require("../../constants/productOptions");
      const requestedCategory = String(req.query.category).trim();

      const matchedCategory = PRODUCT_CATEGORIES.find(
        (item) => item.toLowerCase() === requestedCategory.toLowerCase()
      );

      if (!matchedCategory) {
        return res.status(400).json({
          success: false,
          message: "Invalid category filter"
        });
      }

      filter.category = matchedCategory;
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 80);

      if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");

        filter.$or = [
          { productName: pattern },
          { subcategory: pattern },
          { specifications: pattern }
        ];
      }
    }

    const total = await Requirement.countDocuments(filter);

    const requirements = await populateBusiness(
      Requirement.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    );

    return res.status(200).json({
      success: true,
      data: requirements.map((requirement) =>
        formatRequirement(
          requirement,
          isRequirementOwner(requirement, req.user)
        )
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total
      }
    });
  } catch (error) {
    console.error("Get requirements error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch requirements"
    });
  }
};

// GET /api/requirements/my
const getMyRequirements = async (req, res) => {
  try {
    await markExpiredRequirements();

    const requirements = await populateBusiness(
      Requirement.find({ buyerId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(100)
    );

    return res.status(200).json({
      success: true,
      data: requirements.map((requirement) =>
        formatRequirement(requirement, true)
      )
    });
  } catch (error) {
    console.error("Get my requirements error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your requirements"
    });
  }
};

// GET /api/requirements/:id
const getRequirementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement id"
      });
    }

    await markExpiredRequirements();

    const requirement = await getDocumentWithBusiness(id);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    const isOwner = isRequirementOwner(requirement, req.user);

    // Only open requirements are visible to other users.
    if (!isOwner && requirement.status !== "open") {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    const data = formatRequirement(requirement, isOwner);

    if (isOwner) {
      data.quotationCount = await Quotation.countDocuments({
        requirementId: requirement._id,
        status: { $ne: "withdrawn" }
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Get requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the requirement"
    });
  }
};

// PATCH /api/requirements/:id
const updateRequirement = async (req, res) => {
  let newImageUrls = [];

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: "Invalid requirement id"
      });
    }

    const requirement = await Requirement.findById(id);

    if (!requirement) {
      removeRequestFiles(req.files);

      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (!isRequirementOwner(requirement, req.user)) {
      removeRequestFiles(req.files);

      return res.status(403).json({
        success: false,
        message: "You can only update your own requirements"
      });
    }

    if (requirement.status !== "open") {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message:
          requirement.status === "expired"
            ? "This requirement has expired and cannot be edited"
            : "This requirement is no longer open for editing"
      });
    }

    const body = req.body || {};
    const result = validateRequirementPayload(body, true);

    if (result.error) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    const existingImagesResult = parseExistingImages(body.existingImages);

    if (existingImagesResult.error) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: existingImagesResult.error
      });
    }

    const hasImageChanges =
      existingImagesResult.provided || (req.files || []).length > 0;

    if (Object.keys(result.values).length === 0 && !hasImageChanges) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update"
      });
    }

    const nextBudgetMin =
      result.values.budgetMin !== undefined
        ? result.values.budgetMin
        : requirement.budgetMin;

    const nextBudgetMax =
      result.values.budgetMax !== undefined
        ? result.values.budgetMax
        : requirement.budgetMax;

    if (
      nextBudgetMin !== null &&
      nextBudgetMax !== null &&
      nextBudgetMin > nextBudgetMax
    ) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: "Minimum budget cannot be greater than maximum budget"
      });
    }

    if (
      result.values.emdRate !== undefined &&
      result.values.emdRate !== (requirement.emdRate || 2)
    ) {
      const quoteCount = await Quotation.countDocuments({
        requirementId: requirement._id,
        status: { $ne: "withdrawn" }
      });

      if (quoteCount > 0) {
        removeRequestFiles(req.files);

        return res.status(400).json({
          success: false,
          message: "EMD rate cannot be changed after quotations are received"
        });
      }
    }

    const currentImages = requirement.images.map((image) => String(image));

    let finalImages = currentImages;

    if (existingImagesResult.provided) {
      // Only images already attached to this requirement can be kept.
      finalImages = [
        ...new Set(
          existingImagesResult.images.filter((image) =>
            currentImages.includes(image)
          )
        )
      ];
    }

    newImageUrls = getUploadedImageUrls(req.files);

    if (finalImages.length + newImageUrls.length > 3) {
      removeRequestFiles(req.files);

      return res.status(400).json({
        success: false,
        message: "You can add up to 3 product images"
      });
    }

    finalImages = [...finalImages, ...newImageUrls];

    Object.assign(requirement, result.values);
    requirement.images = finalImages;
    await requirement.save();

    // Delete files that were removed from the requirement.
    currentImages
      .filter((image) => !finalImages.includes(image))
      .forEach(removeStoredImage);

    const populated = await getDocumentWithBusiness(requirement._id);

    return res.status(200).json({
      success: true,
      message: "Requirement updated successfully",
      data: formatRequirement(populated, true)
    });
  } catch (error) {
    removeRequestFiles(req.files);
    newImageUrls.forEach(removeStoredImage);

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Update requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the requirement"
    });
  }
};

// PATCH /api/requirements/:id/close
const closeRequirement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement id"
      });
    }

    await markExpiredRequirements();

    const requirement = await Requirement.findById(id);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (!isRequirementOwner(requirement, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only close your own requirements"
      });
    }

    if (requirement.status !== "open") {
      return res.status(400).json({
        success: false,
        message:
          requirement.status === "expired"
            ? "This requirement has expired"
            : "Only an open requirement can be closed"
      });
    }

    const closedAt = new Date();
    const pendingQuotations = await Quotation.find({
      requirementId: requirement._id,
      status: "pending"
    })
      .select("_id sellerId")
      .lean();

    await releasePendingQuotations({
      requirementId: requirement._id,
      status: "rejected",
      respondedAt: closedAt,
      note: "EMD released because the buyer closed the requirement"
    });

    requirement.status = "closed";
    requirement.closedAt = closedAt;
    await requirement.save();

    for (const pendingQuotation of pendingQuotations) {
      await createNotification({
        recipientId: pendingQuotation.sellerId,
        type: "quotation_rejected",
        title: "Requirement closed",
        message: `The buyer closed "${requirement.productName}" before selecting a quotation.`,
        relatedType: "quotation",
        relatedId: pendingQuotation._id
      });
    }

    const populated = await getDocumentWithBusiness(requirement._id);

    return res.status(200).json({
      success: true,
      message: "Requirement closed",
      data: formatRequirement(populated, true)
    });
  } catch (error) {
    console.error("Close requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to close the requirement"
    });
  }
};

// POST /api/requirements/:id/repost
const repostRequirement = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement id"
      });
    }

    const original = await Requirement.findById(id);

    if (!original) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (!isRequirementOwner(original, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only repost your own requirements"
      });
    }

    const repost = await repostRequirementService({
      original,
      buyerId: req.user._id,
      overrides: req.body || {}
    });

    const populated = await getDocumentWithBusiness(repost._id);

    return res.status(201).json({
      success: true,
      message: "Requirement reposted as a new round",
      data: formatRequirement(populated, true)
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Repost requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to repost the requirement"
    });
  }
};

module.exports = {
  createRequirement,
  getRequirements,
  getMyRequirements,
  getRequirementById,
  updateRequirement,
  closeRequirement,
  repostRequirement
};
