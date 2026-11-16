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

export const getNotifications = (token, params = {}) => {
  const queryString = buildQueryString(params);

  return apiRequest(
    queryString ? `/notifications?${queryString}` : "/notifications",
    { token }
  );
};

export const getNotificationUnreadCount = (token) => {
  return apiRequest("/notifications/unread-count", { token });
};

export const markNotificationRead = (token, notificationId) => {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    token
  });
};

export const markAllNotificationsRead = (token) => {
  return apiRequest("/notifications/read-all", {
    method: "PATCH",
    token
  });
};
