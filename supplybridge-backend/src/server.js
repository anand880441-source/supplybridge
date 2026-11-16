const http = require("http");
const path = require("path");

// Load environment variables from the backend's .env file.
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const mongoose = require("mongoose");

const app = require("./app");
const connectDatabase = require("./config/db");
const {
  REALTIME_PATH,
  attachRealtimeServer,
  closeRealtimeServer
} = require("./realtime/realtime");

const DEFAULT_JWT_SECRET = "replace_with_your_own_long_random_secret";
const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || "";

if (!jwtSecret) {
  console.error("JWT_SECRET is missing. Please check your .env file.");
  process.exit(1);
}

if (isProduction && Buffer.byteLength(jwtSecret, "utf8") < 32) {
  console.error("JWT_SECRET must be at least 32 bytes in production.");
  process.exit(1);
}

if (isProduction && jwtSecret === DEFAULT_JWT_SECRET) {
  console.error("JWT_SECRET must not use the example value in production.");
  process.exit(1);
}

if (!isProduction && jwtSecret === DEFAULT_JWT_SECRET) {
  console.warn("JWT_SECRET is still using the example value.");
}

if (isProduction && !process.env.CORS_ORIGINS) {
  console.warn("CORS_ORIGINS is empty. Browser clients will be blocked.");
}

const parsedPort = Number.parseInt(process.env.PORT || "5000", 10);
const PORT =
  Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : 5000;
const HOST = process.env.HOST || "0.0.0.0";

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB before accepting requests.
    await connectDatabase();

    // Listen on 0.0.0.0 so a physical phone on the same Wi-Fi network
    // can reach the API using this computer's LAN IP address.
    server = http.createServer(app);
    attachRealtimeServer(server);
    server.listen(PORT, HOST, () => {
      console.log(`SupplyBridge API running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Realtime: ws://localhost:${PORT}${REALTIME_PATH}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message);
    process.exit(1);
  }
};

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (!server) {
    process.exit(0);
  }

  closeRealtimeServer();

  server.close(async () => {
    try {
      await mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error("Failed to close the database connection:", error.message);
      process.exit(1);
    }
  });

  setTimeout(() => process.exit(1), 10000).unref();
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exitCode = 1;
});

startServer();
