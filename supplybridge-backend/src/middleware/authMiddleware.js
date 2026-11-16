const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protects routes that require a logged-in user.
// The app must send: Authorization: Bearer <token>
const authMiddleware = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing"
      });
    }

    const token = authorizationHeader.slice(7).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Your account could not be found"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive"
      });
    }

    // Later routes use req.user instead of trusting a user ID from the app.
    req.user = user;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again."
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token"
      });
    }

    console.error("Auth middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify authentication"
    });
  }
};

module.exports = authMiddleware;
