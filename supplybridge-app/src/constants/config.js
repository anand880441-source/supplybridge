import Constants from "expo-constants";

// The Expo development server already knows the computer's address.
// While developing it provides a value like "10.49.232.81:8081".
//
// We reuse that IP address for the API. This keeps the app working when the
// computer's Wi-Fi IP address changes, as long as Expo Go is using LAN mode.
const expoHostUri = Constants.expoConfig?.hostUri;
const detectedHost = expoHostUri ? expoHostUri.split(":")[0] : "";

// Used only if Expo cannot detect the host (for example, a custom build).
// A physical phone cannot use "localhost", because that means the phone itself.
const FALLBACK_LAN_IP = "10.49.232.81";
const configuredApiUrl = String(process.env.EXPO_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "");
const configuredServerBaseUrl = configuredApiUrl.replace(/\/api$/, "");

export const API_HOST = detectedHost || FALLBACK_LAN_IP;

// The Express backend always runs on port 5000 during local development.
export const SERVER_BASE_URL =
  configuredServerBaseUrl || `http://${API_HOST}:5000`;
export const API_BASE_URL = configuredApiUrl
  ? `${configuredServerBaseUrl}/api`
  : `${SERVER_BASE_URL}/api`;

// Uploaded images come back as relative paths like /uploads/photo.jpg.
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return "";
  }

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return `${SERVER_BASE_URL}${imagePath}`;
};
