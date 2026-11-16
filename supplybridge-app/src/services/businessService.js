import { File } from "expo-file-system";

import { apiRequest } from "./api";

const appendFile = (formData, field, file) => {
  formData.append(field, new File(file.uri));
};

export const getMyBusiness = (token) => {
  return apiRequest("/businesses/me", { token });
};

export const getBusinessById = (token, businessId) => {
  return apiRequest(`/businesses/${businessId}`, { token });
};

export const uploadBusinessLogo = (token, businessId, file) => {
  const formData = new FormData();
  appendFile(formData, "logo", file);

  return apiRequest(`/businesses/${businessId}/logo`, {
    method: "POST",
    token,
    body: formData
  });
};

export const removeBusinessLogo = (token, businessId) => {
  return apiRequest(`/businesses/${businessId}/logo`, {
    method: "DELETE",
    token
  });
};

export const addPortfolioItem = (token, businessId, file, details) => {
  const formData = new FormData();
  appendFile(formData, "image", file);

  Object.entries(details || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  });

  return apiRequest(`/businesses/${businessId}/portfolio`, {
    method: "POST",
    token,
    body: formData
  });
};

export const deletePortfolioItem = (token, businessId, itemId) => {
  return apiRequest(`/businesses/${businessId}/portfolio/${itemId}`, {
    method: "DELETE",
    token
  });
};

export const uploadVerificationDocument = (token, businessId, type, file) => {
  const formData = new FormData();
  formData.append("type", type);
  appendFile(formData, "document", file);

  return apiRequest(`/businesses/${businessId}/documents`, {
    method: "POST",
    token,
    body: formData
  });
};

export const deleteVerificationDocument = (
  token,
  businessId,
  documentId
) => {
  return apiRequest(
    `/businesses/${businessId}/documents/${documentId}`,
    {
      method: "DELETE",
      token
    }
  );
};

export const submitBusinessVerification = (token, businessId) => {
  return apiRequest(`/businesses/${businessId}/verification`, {
    method: "POST",
    token
  });
};

export const createBusinessProfile = (token, businessData) => {
  return apiRequest("/businesses", {
    method: "POST",
    token,
    body: JSON.stringify(businessData)
  });
};

export const updateBusinessProfile = (token, businessId, businessData) => {
  return apiRequest(`/businesses/${businessId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(businessData)
  });
};
