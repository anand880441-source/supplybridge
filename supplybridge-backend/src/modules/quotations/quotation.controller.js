const mongoose = require("mongoose");

const Business = require("../../models/Business");
const Quotation = require("../../models/Quotation");
const Requirement = require("../../models/Requirement");
const {
  BUSINESS_PUBLIC_FIELDS,
  formatBusinessSummary
} = require("../../utils/businessSummary");
const {
  getStartOfToday,
  markExpiredRequirements
} = require("../../utils/requirementExpiry");
const {
  REQUIREMENT_SUMMARY_FIELDS,
  formatRequirementSummary
} = require("../../utils/requirementSummary");
const {
  validateQuotationPayload,
  validateAcceptQuotationPayload
} = require("./quotation.validation");
const { createOrderFromQuotation } = require("../orders/order.service");
const {
  createNotification
} = require("../notifications/notification.service");
const { releaseEmd } = require("../../services/wallet.service");
const {
  adjustQuotationHold,
  calculateEmdAmount,
  captureQuotationHold,
  releasePendingQuotations,
  releaseQuotationHold,
  reserveQuotationEmd
} = require("../../services/procurement.service");

const populateQuotation = (query) => {
  return query
    .populate("requirementId", REQUIREMENT_SUMMARY_FIELDS)
    .populate("businessId", BUSINESS_PUBLIC_FIELDS);
};

const getDocumentWithRelations = async (id) => {
  return populateQuotation(Quotation.findById(id));
};

const getViewerFlags = (quotation, user) => {
  const requirement = quotation.requirementId;

  return {
    isSeller: quotation.sellerId.toString() === user._id.toString(),
    isBuyer: Boolean(
      requirement &&
        requirement.buyerId &&
        requirement.buyerId.toString() === user._id.toString()
    )
  };
};

const formatQuotation = (quotation, user) => {
  const viewer = getViewerFlags(quotation, user);

  return {
    id: quotation._id,
    sellerId: quotation.sellerId,
    offerType: quotation.offerType,
    offeredQuantity: quotation.offeredQuantity,
    unitPrice: quotation.unitPrice,
    totalPrice: quotation.totalPrice,
    gstRate: quotation.gstRate || 0,
    pricingMode: quotation.pricingMode || "exclusive",
    taxableValue: quotation.taxableValue || quotation.totalPrice,
    cgstAmount: quotation.cgstAmount || 0,
    sgstAmount: quotation.sgstAmount || 0,
    igstAmount: quotation.igstAmount || 0,
    totalTax: quotation.totalTax || 0,
    grandTotal: quotation.grandTotal || quotation.totalPrice,
    placeOfSupply: quotation.placeOfSupply || "",
    sellerGstin: quotation.sellerGstin || "",
    buyerGstin: quotation.buyerGstin || "",
    emdRate: quotation.emdRate || 0,
    emdAmount: quotation.emdAmount || 0,
    emdStatus: quotation.emdStatus || "not_required",
    emdHeldAt: quotation.emdHeldAt,
    emdSettledAt: quotation.emdSettledAt,
    termsAccepted: quotation.termsAccepted,
    termsVersion: quotation.termsVersion,
    termsAcceptedAt: quotation.termsAcceptedAt,
    buyerTermsAccepted: quotation.buyerTermsAccepted || false,
    buyerTermsVersion: quotation.buyerTermsVersion || "",
    buyerTermsAcceptedAt: quotation.buyerTermsAcceptedAt,
    buyerReference: quotation.buyerReference || "",
    orderId: quotation.orderId,
    cancelledAt: quotation.cancelledAt,
    deliveryDate: quotation.deliveryDate,
    message: quotation.message,
    status: quotation.status,
    respondedAt: quotation.respondedAt,
    withdrawnAt: quotation.withdrawnAt,
    createdAt: quotation.createdAt,
    updatedAt: quotation.updatedAt,
    requirement: formatRequirementSummary(quotation.requirementId),
    business: formatBusinessSummary(quotation.businessId),
    isSeller: viewer.isSeller,
    isBuyer: viewer.isBuyer
  };
};

const getRequirementUnavailableMessage = (requirement) => {
  if (requirement.status === "expired") {
    return "This requirement has expired";
  }

  if (requirement.status === "awarded") {
    return "This requirement has already been awarded";
  }

  if (requirement.status === "fulfilled") {
    return "This requirement has already been fulfilled";
  }

  if (requirement.status === "cancelled") {
    return "This requirement was cancelled";
  }

  if (requirement.status === "closed") {
    return "This requirement is already closed";
  }

  return "This requirement is not accepting quotations";
};

const getEditErrorMessage = (status) => {
  const messages = {
    accepted: "An accepted quotation cannot be edited",
    rejected: "A rejected quotation cannot be edited",
    withdrawn: "A withdrawn quotation cannot be edited",
    expired: "This quotation has expired and cannot be edited",
    cancelled: "A cancelled quotation cannot be edited"
  };

  return messages[status] || "Only pending quotations can be edited";
};

const getWithdrawErrorMessage = (status) => {
  const messages = {
    accepted: "An accepted quotation cannot be withdrawn",
    rejected: "A rejected quotation cannot be withdrawn",
    withdrawn: "This quotation has already been withdrawn",
    expired: "This quotation has expired",
    cancelled: "This quotation was cancelled"
  };

  return messages[status] || "Only pending quotations can be withdrawn";
};

const getResponseErrorMessage = (status) => {
  const messages = {
    accepted: "This quotation is already accepted",
    rejected: "This quotation was already rejected",
    withdrawn: "This quotation was withdrawn",
    expired: "This quotation has expired",
    cancelled: "This quotation was cancelled"
  };

  return messages[status] || "Only pending quotations can be responded to";
};

// POST /api/quotations
const createQuotation = async (req, res) => {
  try {
    await markExpiredRequirements();

    const business = await Business.findOne({ ownerId: req.user._id });

    if (!business) {
      return res.status(400).json({
        success: false,
        message: "Complete your business profile before sending a quotation"
      });
    }

    const body = req.body || {};
    const { requirementId } = body;

    if (!mongoose.isValidObjectId(requirementId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement id"
      });
    }

    const requirement = await Requirement.findById(requirementId);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (requirement.buyerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a quotation for your own requirement"
      });
    }

    if (requirement.status !== "open") {
      return res.status(400).json({
        success: false,
        message: getRequirementUnavailableMessage(requirement)
      });
    }

    if (requirement.deliveryDate < getStartOfToday()) {
      return res.status(400).json({
        success: false,
        message: "This requirement has expired"
      });
    }

    const existingQuotation = await Quotation.findOne({
      requirementId: requirement._id,
      sellerId: req.user._id
    });

    if (existingQuotation) {
      return res.status(409).json({
        success: false,
        message: "You have already sent a quotation for this requirement"
      });
    }

    const buyerBusiness = await Business.findById(requirement.businessId);
    const result = validateQuotationPayload(
      body,
      requirement,
      null,
      {
        sellerBusiness: business,
        buyerBusiness
      }
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    const quotationId = new mongoose.Types.ObjectId();
    let emdValues = {
      emdRate: Number(requirement.emdRate || 0),
      emdAmount: 0,
      emdStatus: "not_required",
      emdHeldAt: null
    };

    try {
      emdValues = await reserveQuotationEmd({
        quotationId,
        requirement,
        sellerBusiness: business,
        taxableValue: result.values.taxableValue
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        code: error.code,
        message:
          error.code === "INSUFFICIENT_EMD_BALANCE"
            ? "Not enough wallet balance to hold this EMD. Add money to your wallet and try again"
            : error.message || "Unable to hold the EMD"
      });
    }

    let quotation;

    try {
      quotation = await Quotation.create({
        _id: quotationId,
        ...result.values,
        ...emdValues,
        requirementId: requirement._id,
        sellerId: req.user._id,
        businessId: business._id,
        status: "pending"
      });
    } catch (error) {
      if (emdValues.emdAmount > 0) {
        try {
          await releaseEmd({
            business,
            quotationId,
            amount: emdValues.emdAmount,
            note: "EMD released because quotation creation failed"
          });
        } catch (releaseError) {
          console.error("Rollback quotation EMD error:", releaseError);
        }
      }

      throw error;
    }

    const populated = await getDocumentWithRelations(quotation._id);

    await createNotification({
      recipientId: requirement.buyerId,
      type: "quotation_received",
      title: "New quotation received",
      message: `${business.companyName} sent a ${result.values.offerType} quotation for "${requirement.productName}".`,
      relatedType: "quotation",
      relatedId: quotation._id
    });

    return res.status(201).json({
      success: true,
      message: "Quotation sent successfully",
      data: formatQuotation(populated, req.user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already sent a quotation for this requirement"
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code,
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

    console.error("Create quotation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send the quotation"
    });
  }
};

// GET /api/quotations/my
const getMyQuotations = async (req, res) => {
  try {
    await markExpiredRequirements();

    const filter = { sellerId: req.user._id };

    if (req.query.requirementId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.requirementId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid requirement id"
        });
      }

      filter.requirementId = req.query.requirementId;
    }

    const quotations = await populateQuotation(
      Quotation.find(filter).sort({ createdAt: -1 }).limit(100)
    );

    return res.status(200).json({
      success: true,
      data: quotations.map((quotation) =>
        formatQuotation(quotation, req.user)
      )
    });
  } catch (error) {
    console.error("Get my quotations error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your quotations"
    });
  }
};

// GET /api/quotations/requirement/:requirementId
const getRequirementQuotations = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { requirementId } = req.params;

    if (!mongoose.isValidObjectId(requirementId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement id"
      });
    }

    const requirement = await Requirement.findById(requirementId);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (requirement.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view quotations for your own requirements"
      });
    }

    const quotations = await populateQuotation(
      Quotation.find({
        requirementId: requirement._id,
        status: { $ne: "withdrawn" }
      })
        .sort({ createdAt: -1 })
        .limit(100)
    );

    return res.status(200).json({
      success: true,
      data: quotations.map((quotation) =>
        formatQuotation(quotation, req.user)
      ),
      requirement: formatRequirementSummary(requirement)
    });
  } catch (error) {
    console.error("Get requirement quotations error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch quotations"
    });
  }
};

// GET /api/quotations/:id
const getQuotationById = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation id"
      });
    }

    const quotation = await getDocumentWithRelations(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const viewer = getViewerFlags(quotation, req.user);

    // Quotations are private to the seller who sent them and the buyer who
    // owns the requirement.
    if (!viewer.isSeller && !viewer.isBuyer) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: formatQuotation(quotation, req.user)
    });
  } catch (error) {
    console.error("Get quotation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the quotation"
    });
  }
};

// PATCH /api/quotations/:id
const updateQuotation = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation id"
      });
    }

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    if (quotation.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own quotations"
      });
    }

    if (quotation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: getEditErrorMessage(quotation.status)
      });
    }

    const requirement = await Requirement.findById(quotation.requirementId);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (requirement.status !== "open") {
      return res.status(400).json({
        success: false,
        message: getRequirementUnavailableMessage(requirement)
      });
    }

    if (requirement.deliveryDate < getStartOfToday()) {
      return res.status(400).json({
        success: false,
        message: "This requirement has expired"
      });
    }

    const body = req.body || {};
    const editableFields = [
      "offerType",
      "offeredQuantity",
      "unitPrice",
      "gstRate",
      "pricingMode",
      "deliveryDate",
      "message"
    ];

    const hasEditableField = editableFields.some(
      (field) => body[field] !== undefined
    );

    if (!hasEditableField) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update"
      });
    }

    const sellerBusiness = await Business.findById(quotation.businessId);
    const buyerBusiness = await Business.findById(requirement.businessId);
    const result = validateQuotationPayload(
      body,
      requirement,
      quotation,
      {
        sellerBusiness,
        buyerBusiness
      }
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    if (quotation.emdStatus === "held" && sellerBusiness) {
      const nextEmdAmount = calculateEmdAmount(
        requirement,
        result.values.taxableValue
      );

      try {
        await adjustQuotationHold({
          quotation,
          sellerBusiness,
          nextEmdAmount
        });
      } catch (error) {
        return res.status(error.statusCode || 500).json({
          success: false,
          code: error.code,
          message:
            error.code === "INSUFFICIENT_EMD_BALANCE"
              ? "Not enough wallet balance for the updated EMD. Add money to your wallet and try again"
              : error.message || "Unable to update the EMD hold"
        });
      }
    }

    if (quotation.emdStatus === "not_required") {
      result.values.emdRate = 0;
      result.values.emdAmount = 0;
    }

    Object.assign(quotation, result.values);
    await quotation.save();

    const populated = await getDocumentWithRelations(quotation._id);

    await createNotification({
      recipientId: requirement.buyerId,
      type: "quotation_updated",
      title: "Quotation updated",
      message: `${sellerBusiness?.companyName || "The seller"} updated the quotation for "${requirement.productName}".`,
      relatedType: "quotation",
      relatedId: quotation._id
    });

    return res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: formatQuotation(populated, req.user)
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError.message
      });
    }

    console.error("Update quotation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the quotation"
    });
  }
};

// PATCH /api/quotations/:id/withdraw
const withdrawQuotation = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation id"
      });
    }

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    if (quotation.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only withdraw your own quotations"
      });
    }

    if (quotation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: getWithdrawErrorMessage(quotation.status)
      });
    }

    await releaseQuotationHold(
      quotation,
      "EMD released because the quotation was withdrawn"
    );

    quotation.status = "withdrawn";
    quotation.withdrawnAt = new Date();
    await quotation.save();

    const populated = await getDocumentWithRelations(quotation._id);
    const requirement = await Requirement.findById(quotation.requirementId);
    const sellerBusiness = await Business.findById(quotation.businessId);

    if (requirement) {
      await createNotification({
        recipientId: requirement.buyerId,
        type: "quotation_withdrawn",
        title: "Quotation withdrawn",
        message: `${sellerBusiness?.companyName || "The seller"} withdrew the quotation for "${requirement.productName}".`,
        relatedType: "quotation",
        relatedId: quotation._id
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation withdrawn",
      data: formatQuotation(populated, req.user)
    });
  } catch (error) {
    console.error("Withdraw quotation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to withdraw the quotation"
    });
  }
};

// PATCH /api/quotations/:id/accept
const acceptQuotation = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation id"
      });
    }

    const termsValidation = validateAcceptQuotationPayload(req.body);

    if (termsValidation.error) {
      return res.status(400).json({
        success: false,
        message: termsValidation.error
      });
    }

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const requirement = await Requirement.findById(quotation.requirementId);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (requirement.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only respond to quotations for your own requirements"
      });
    }

    if (requirement.status !== "open") {
      return res.status(400).json({
        success: false,
        message: getRequirementUnavailableMessage(requirement)
      });
    }

    if (requirement.deliveryDate < getStartOfToday()) {
      return res.status(400).json({
        success: false,
        message: "This requirement has expired"
      });
    }

    if (quotation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: getResponseErrorMessage(quotation.status)
      });
    }

    const respondedAt = new Date();
    const awardedRequirement = await Requirement.findOneAndUpdate(
      {
        _id: requirement._id,
        status: "open"
      },
      {
        $set: {
          status: "awarded",
          awardedAt: respondedAt,
          acceptedQuotationId: quotation._id,
          closedAt: null
        }
      },
      { returnDocument: "after" }
    );

    if (!awardedRequirement) {
      return res.status(409).json({
        success: false,
        message: "This requirement is no longer open for acceptance"
      });
    }

    quotation.status = "accepted";
    quotation.respondedAt = respondedAt;
    quotation.buyerTermsAccepted = true;
    quotation.buyerTermsVersion = termsValidation.values.buyerTermsVersion;
    quotation.buyerTermsAcceptedAt = respondedAt;
    quotation.buyerReference = termsValidation.values.buyerReference;
    await quotation.save();

    try {
      await captureQuotationHold(quotation);
    } catch (captureError) {
      quotation.status = "pending";
      quotation.respondedAt = null;
      quotation.buyerTermsAccepted = false;
      quotation.buyerTermsVersion = "";
      quotation.buyerTermsAcceptedAt = null;
      quotation.buyerReference = "";
      await quotation.save();

      await Requirement.updateOne(
        { _id: requirement._id, status: "awarded" },
        {
          $set: {
            status: "open",
            awardedAt: null,
            acceptedQuotationId: null
          }
        }
      );

      console.error("Capture quotation EMD error:", captureError);

      return res.status(captureError.statusCode || 500).json({
        success: false,
        message: captureError.message || "Unable to capture the EMD"
      });
    }

    // Accepting one quotation ends the comparison for the buyer.
    const displacedQuotations = await Quotation.find({
      requirementId: requirement._id,
      status: "pending",
      _id: { $ne: quotation._id }
    })
      .select("_id sellerId")
      .lean();

    await releasePendingQuotations({
      requirementId: requirement._id,
      exceptQuotationId: quotation._id,
      status: "rejected",
      respondedAt,
      note: "EMD released because another quotation was selected"
    });

    await createNotification({
      recipientId: quotation.sellerId,
      type: "quotation_accepted",
      title: "Quotation accepted",
      message: `Your quotation for "${requirement.productName}" was accepted by the buyer.`,
      relatedType: "quotation",
      relatedId: quotation._id
    });

    for (const displacedQuotation of displacedQuotations) {
      await createNotification({
        recipientId: displacedQuotation.sellerId,
        type: "quotation_rejected",
        title: "Requirement awarded to another seller",
        message: `The buyer selected another quotation for "${requirement.productName}".`,
        relatedType: "quotation",
        relatedId: displacedQuotation._id
      });
    }

    try {
      const order = await createOrderFromQuotation(
        quotation,
        awardedRequirement
      );

      await Requirement.updateOne(
        { _id: requirement._id },
        { $set: { activeOrderId: order._id } }
      );
    } catch (orderError) {
      // The buyer can retry from the accepted quotation. Failing the whole
      // acceptance here would leave the requirement in an inconsistent state.
      console.error("Auto-create order error:", orderError);
    }

    const populated = await getDocumentWithRelations(quotation._id);

    return res.status(200).json({
      success: true,
      message: "Quotation accepted and order created",
      data: formatQuotation(populated, req.user)
    });
  } catch (error) {
    console.error("Accept quotation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to accept the quotation"
    });
  }
};

// PATCH /api/quotations/:id/reject
const rejectQuotation = async (req, res) => {
  try {
    await markExpiredRequirements();

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation id"
      });
    }

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const requirement = await Requirement.findById(quotation.requirementId);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    if (requirement.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only respond to quotations for your own requirements"
      });
    }

    if (requirement.status !== "open") {
      return res.status(400).json({
        success: false,
        message: getRequirementUnavailableMessage(requirement)
      });
    }

    if (requirement.deliveryDate < getStartOfToday()) {
      return res.status(400).json({
        success: false,
        message: "This requirement has expired"
      });
    }

    if (quotation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: getResponseErrorMessage(quotation.status)
      });
    }

    await releaseQuotationHold(
      quotation,
      "EMD released because the quotation was rejected"
    );

    quotation.status = "rejected";
    quotation.respondedAt = new Date();
    await quotation.save();

    const populated = await getDocumentWithRelations(quotation._id);

    await createNotification({
      recipientId: quotation.sellerId,
      type: "quotation_rejected",
      title: "Quotation not selected",
      message: `The buyer declined your quotation for "${requirement.productName}".`,
      relatedType: "quotation",
      relatedId: quotation._id
    });

    return res.status(200).json({
      success: true,
      message: "Quotation rejected",
      data: formatQuotation(populated, req.user)
    });
  } catch (error) {
    console.error("Reject quotation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject the quotation"
    });
  }
};

module.exports = {
  createQuotation,
  getMyQuotations,
  getRequirementQuotations,
  getQuotationById,
  updateQuotation,
  withdrawQuotation,
  acceptQuotation,
  rejectQuotation
};
