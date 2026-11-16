import { apiRequest } from "./api";

export const getWallet = (token) => {
  return apiRequest("/wallet", { token });
};

export const topUpWallet = (token, amount, idempotencyKey) => {
  return apiRequest("/wallet/top-up", {
    method: "POST",
    token,
    body: JSON.stringify({ amount, idempotencyKey })
  });
};
