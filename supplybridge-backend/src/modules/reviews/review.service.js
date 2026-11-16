const mongoose = require("mongoose");

const Business = require("../../models/Business");
const Review = require("../../models/Review");

const roundRating = (value) => {
  return Math.round(Number(value || 0) * 10) / 10;
};

const buildRoleSummary = (entry) => {
  return {
    average: entry ? roundRating(entry.average) : 0,
    count: entry ? entry.count : 0
  };
};

const buildRatingSummary = (rows = []) => {
  const byRole = new Map(rows.map((row) => [row._id, row]));
  const buyer = buildRoleSummary(byRole.get("buyer"));
  const seller = buildRoleSummary(byRole.get("seller"));
  const count = buyer.count + seller.count;
  const weightedTotal =
    buyer.average * buyer.count + seller.average * seller.count;

  return {
    overall: {
      average: count > 0 ? roundRating(weightedTotal / count) : 0,
      count
    },
    buyer,
    seller
  };
};

const getBusinessRatingSummary = async (businessId) => {
  const rows = await Review.aggregate([
    {
      $match: {
        revieweeBusinessId: new mongoose.Types.ObjectId(businessId)
      }
    },
    {
      $group: {
        _id: "$revieweeRole",
        average: { $avg: "$rating" },
        count: { $sum: 1 }
      }
    }
  ]);

  return buildRatingSummary(rows);
};

const refreshBusinessRating = async (businessId, role) => {
  if (!["buyer", "seller"].includes(role)) {
    return;
  }

  const summary = await getBusinessRatingSummary(businessId);
  const roleSummary = summary[role];
  const prefix = role === "buyer" ? "buyer" : "seller";

  await Business.updateOne(
    { _id: businessId },
    {
      $set: {
        [`${prefix}RatingAverage`]: roleSummary.average,
        [`${prefix}RatingCount`]: roleSummary.count
      }
    }
  );
};

module.exports = {
  buildRatingSummary,
  getBusinessRatingSummary,
  refreshBusinessRating
};
