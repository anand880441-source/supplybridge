import { apiRequest } from "./api";

// These functions only talk to the backend.
// Screens call AuthContext, and AuthContext calls these functions.

export const registerUser = (formData) => {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(formData)
  });
};

export const loginUser = (email, password) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
};

export const getCurrentUser = (token) => {
  return apiRequest("/auth/me", { token });
};

export const acceptCurrentTerms = (token, termsVersion) => {
  return apiRequest("/auth/accept-terms", {
    method: "POST",
    token,
    body: JSON.stringify({ termsAccepted: true, termsVersion })
  });
};

export const changeActiveRole = (token, activeRole) => {
  return apiRequest("/auth/active-role", {
    method: "PATCH",
    token,
    body: JSON.stringify({ activeRole })
  });
};
