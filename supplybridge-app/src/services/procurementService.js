import { apiRequest } from "./api";

export const getProcurementPolicy = (token) => {
  return apiRequest("/procurement/policy", { token });
};
