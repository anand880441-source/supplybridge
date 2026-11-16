import { apiRequest } from "./api";

export const getConversations = (token) => {
  return apiRequest("/conversations", { token });
};

export const createConversation = (token, quotationId) => {
  return apiRequest("/conversations", {
    method: "POST",
    token,
    body: JSON.stringify({ quotationId })
  });
};

export const getConversationMessages = (token, conversationId) => {
  return apiRequest(`/conversations/${conversationId}/messages`, { token });
};

export const sendMessage = (token, conversationId, body) => {
  return apiRequest(`/conversations/${conversationId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ body })
  });
};
