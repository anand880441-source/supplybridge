import { apiRequest } from "./api";

const buildQueryString = (params) => {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
};

export const getMyQuotations = (token, params = {}) => {
  const queryString = buildQueryString(params);

  return apiRequest(
    queryString ? `/quotations/my?${queryString}` : "/quotations/my",
    { token }
  );
};

export const getRequirementQuotations = (token, requirementId) => {
  return apiRequest(`/quotations/requirement/${requirementId}`, { token });
};

export const getQuotationById = (token, quotationId) => {
  return apiRequest(`/quotations/${quotationId}`, { token });
};

export const createQuotation = (token, payload) => {
  return apiRequest("/quotations", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
};

export const updateQuotation = (token, quotationId, payload) => {
  return apiRequest(`/quotations/${quotationId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
};

export const withdrawQuotation = (token, quotationId) => {
  return apiRequest(`/quotations/${quotationId}/withdraw`, {
    method: "PATCH",
    token
  });
};

export const acceptQuotation = (token, quotationId, payload) => {
  return apiRequest(`/quotations/${quotationId}/accept`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload || {})
  });
};

export const rejectQuotation = (token, quotationId) => {
  return apiRequest(`/quotations/${quotationId}/reject`, {
    method: "PATCH",
    token
  });
};
