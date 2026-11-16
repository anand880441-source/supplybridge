const jwt = require("jsonwebtoken");

// Creates a signed login token that proves which user is making a request.
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing from the .env file");
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

module.exports = generateToken;
