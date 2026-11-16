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

export const getRequirements = (token, params = {}) => {
  const queryString = buildQueryString(params);

  return apiRequest(
    queryString ? `/requirements?${queryString}` : "/requirements",
    { token }
  );
};

export const getMyRequirements = (token) => {
  return apiRequest("/requirements/my", { token });
};

export const getRequirementById = (token, requirementId) => {
  return apiRequest(`/requirements/${requirementId}`, { token });
};

export const createRequirement = (token, formData) => {
  return apiRequest("/requirements", {
    method: "POST",
    token,
    body: formData
  });
};

export const updateRequirement = (token, requirementId, formData) => {
  return apiRequest(`/requirements/${requirementId}`, {
    method: "PATCH",
    token,
    body: formData
  });
};

export const closeRequirement = (token, requirementId) => {
  return apiRequest(`/requirements/${requirementId}/close`, {
    method: "PATCH",
    token
  });
};

export const repostRequirement = (token, requirementId, payload) => {
  return apiRequest(`/requirements/${requirementId}/repost`, {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
};
