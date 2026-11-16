import { apiRequest } from "./api";

export const getMyOrders = (token) => {
  return apiRequest("/orders/my", { token });
};

export const getOrderById = (token, orderId) => {
  return apiRequest(`/orders/${orderId}`, { token });
};

export const createOrderFromQuotation = (token, quotationId) => {
  return apiRequest("/orders", {
    method: "POST",
    token,
    body: JSON.stringify({ quotationId })
  });
};

export const updateOrderStatus = (token, orderId, status, details = {}) => {
  return apiRequest(`/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status, ...details })
  });
};

export const updateOrderShipment = (token, orderId, shipment) => {
  return apiRequest(`/orders/${orderId}/shipment`, {
    method: "PATCH",
    token,
    body: JSON.stringify(shipment)
  });
};
