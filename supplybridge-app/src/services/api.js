import { API_BASE_URL } from "../constants/config";

// Small wrapper around fetch so every API call handles errors the same way.
// Pass { token } when the endpoint requires a logged-in user.
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const { token, headers, ...fetchOptions } = options;

    // Let the runtime set the multipart boundary for FormData bodies.
    const isFormData =
      typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {})
      }
    });

    let data = null;

    try {
      data = await response.json();
    } catch (jsonError) {
      // Some error responses may not contain JSON.
      data = null;
    }

    if (!response.ok) {
      const error = new Error(
        data && data.message
          ? data.message
          : `Request failed with status ${response.status}`
      );

      // Screens and the auth context can check this status code.
      error.status = response.status;

      throw error;
    }

    return data;
  } catch (error) {
    // This message appears when the phone cannot reach the backend at all:
    // server stopped, wrong IP address, or different Wi-Fi network.
    if (error.message === "Network request failed") {
      throw new Error(
        "Cannot reach the server. Make sure the backend is running and both devices are on the same Wi-Fi network."
      );
    }

    throw error;
  }
};
