const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const {
  notFoundHandler,
  errorHandler
} = require("./middleware/errorMiddleware");
const {
  apiNoStore,
  apiRateLimiter,
  securityHeaders
} = require("./middleware/securityMiddleware");
const authRoutes = require("./modules/auth/auth.routes");
const businessRoutes = require("./modules/businesses/business.routes");
const requirementRoutes = require("./modules/requirements/requirement.routes");
const quotationRoutes = require("./modules/quotations/quotation.routes");
const conversationRoutes = require("./modules/conversations/conversation.routes");
const orderRoutes = require("./modules/orders/order.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const procurementRoutes = require("./modules/procurement/procurement.routes");
const reviewRoutes = require("./modules/reviews/review.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const trustProxy = process.env.TRUST_PROXY;

if (trustProxy && trustProxy !== "false") {
  const parsedTrustProxy = Number.parseInt(trustProxy, 10);

  app.set(
    "trust proxy",
    Number.isFinite(parsedTrustProxy) ? parsedTrustProxy : trustProxy === "true"
  );
}

app.disable("x-powered-by");
app.use(securityHeaders);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length > 0) {
        callback(null, allowedOrigins.includes(origin));
        return;
      }

      callback(null, !isProduction);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    maxAge: 86400,
    optionsSuccessStatus: 204
  })
);

app.use("/api", apiNoStore);
app.use("/api", apiRateLimiter);

// Parse JSON request bodies. Image uploads use multipart/form-data instead.
app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "1mb",
    strict: true
  })
);

// Requirement photos are stored locally during development.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"), {
    dotfiles: "deny",
    index: false,
    maxAge: "1d"
  })
);

// Simple health check to confirm the API and database are working.
app.get("/api/health", (req, res) => {
  const databaseStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const databaseState =
    databaseStates[mongoose.connection.readyState] || "unknown";

  return res.status(200).json({
    success: true,
    message: "SupplyBridge API is running",
    database: databaseState,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/requirements", requirementRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);

// These must be registered after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
