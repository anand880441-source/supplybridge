const EMPTY_RATING = { average: 0, count: 0 };

export const getBusinessRating = (business, role = "overall") => {
  return business?.ratings?.[role] || EMPTY_RATING;
};

export const formatRatingAverage = (value) => {
  return Number(value || 0).toFixed(1);
};
