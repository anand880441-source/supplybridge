const Requirement = require("../models/Requirement");
const Quotation = require("../models/Quotation");
const {
  releaseQuotationHold
} = require("../services/procurement.service");

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
};

// Requirements automatically expire when their delivery date has passed.
// Pending quotations for those requirements expire at the same time. Running
// this before reads keeps stored statuses consistent without a background job.
const markExpiredRequirements = async () => {
  await Requirement.updateMany(
    {
      status: "open",
      deliveryDate: { $lt: getStartOfToday() }
    },
    {
      $set: { status: "expired" }
    }
  );

  const pendingRequirementIds = await Quotation.distinct("requirementId", {
    status: "pending"
  });

  if (pendingRequirementIds.length === 0) {
    return;
  }

  const expiredRequirementIds = await Requirement.find({
    _id: { $in: pendingRequirementIds },
    status: "expired"
  }).distinct("_id");

  if (expiredRequirementIds.length === 0) {
    return;
  }

  const expiredQuotations = await Quotation.find({
    requirementId: { $in: expiredRequirementIds },
    status: "pending"
  });

  for (const quotation of expiredQuotations) {
    try {
      await releaseQuotationHold(
        quotation,
        "EMD released because the requirement expired"
      );
    } catch (error) {
      console.error("Release expired quotation EMD error:", error);
    }

    quotation.status = "expired";
    await quotation.save();
  }
};

module.exports = {
  getStartOfToday,
  markExpiredRequirements
};
