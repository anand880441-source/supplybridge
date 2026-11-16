// Business fields that are safe to show to other logged-in users.
const BUSINESS_PUBLIC_FIELDS =
  "companyName businessType city state verificationStatus logoUrl " +
  "buyerRatingAverage buyerRatingCount sellerRatingAverage sellerRatingCount";

const roundRating = (value) => {
  return Math.round(Number(value || 0) * 10) / 10;
};

const formatBusinessRatings = (business) => {
  const buyerCount = Number(business.buyerRatingCount || 0);
  const sellerCount = Number(business.sellerRatingCount || 0);
  const buyerAverage = buyerCount > 0 ? roundRating(business.buyerRatingAverage) : 0;
  const sellerAverage =
    sellerCount > 0 ? roundRating(business.sellerRatingAverage) : 0;
  const count = buyerCount + sellerCount;
  const weightedTotal = buyerAverage * buyerCount + sellerAverage * sellerCount;

  return {
    overall: {
      average: count > 0 ? roundRating(weightedTotal / count) : 0,
      count
    },
    buyer: {
      average: buyerAverage,
      count: buyerCount
    },
    seller: {
      average: sellerAverage,
      count: sellerCount
    }
  };
};

const formatBusinessSummary = (business) => {
  if (!business || !business.companyName) {
    return null;
  }

  return {
    id: business._id,
    companyName: business.companyName,
    businessType: business.businessType,
    city: business.city,
    state: business.state,
    verificationStatus: business.verificationStatus,
    logoUrl: business.logoUrl || "",
    ratings: formatBusinessRatings(business)
  };
};

module.exports = {
  BUSINESS_PUBLIC_FIELDS,
  formatBusinessRatings,
  formatBusinessSummary
};
