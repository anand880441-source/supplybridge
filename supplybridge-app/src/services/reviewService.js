import { apiRequest } from "./api";

export const getBusinessReviews = (token, businessId, { role } = {}) => {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";

  return apiRequest(`/reviews/business/${businessId}${query}`, { token });
};

export const getOrderReview = (token, orderId) => {
  return apiRequest(`/reviews/order/${orderId}`, { token });
};

export const createReview = (token, { orderId, rating, comment }) => {
  return apiRequest("/reviews", {
    method: "POST",
    token,
    body: JSON.stringify({ orderId, rating, comment })
  });
};
