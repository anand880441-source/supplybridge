const bcrypt = require("bcryptjs");

const User = require("../../models/User");
const { TERMS_VERSION } = require("../../constants/terms");
const generateToken = require("../../utils/generateToken");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10}$/;
const ALLOWED_ROLES = ["buyer", "seller"];
const MAX_PASSWORD_LENGTH = 72;

// Only send safe user fields to the app. Never send the password hash.
const formatUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    activeRole: user.activeRole,
    status: user.status,
    termsVersion: user.termsVersion || "",
    termsAcceptedAt: user.termsAcceptedAt,
    createdAt: user.createdAt
  };
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      roles,
      termsAccepted,
      termsVersion
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required"
      });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long"
      });
    }

    if (cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name cannot exceed 80 characters"
      });
    }

    if (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    if (!PHONE_PATTERN.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain exactly 10 digits"
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    if (String(password).length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Password cannot exceed 72 characters"
      });
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one role: buyer or seller"
      });
    }

    const invalidRole = roles.find((role) => !ALLOWED_ROLES.includes(role));

    if (invalidRole) {
      return res.status(400).json({
        success: false,
        message: "Roles must be buyer, seller, or both"
      });
    }

    // Remove duplicates, for example ["buyer", "buyer"].
    const uniqueRoles = [...new Set(roles)];

    if (termsAccepted !== true || termsVersion !== TERMS_VERSION) {
      return res.status(400).json({
        success: false,
        message:
          "Please review and accept the current SupplyBridge terms before creating an account"
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      roles: uniqueRoles,
      activeRole: uniqueRoles[0],
      termsVersion,
      termsAcceptedAt: new Date()
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: formatUser(user)
    });
  } catch (error) {
    // MongoDB's duplicate key error can still happen if two requests
    // try to register the same email at the same time.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create the account"
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const passwordValue = String(password);

    if (cleanEmail.length > 254 || passwordValue.length > MAX_PASSWORD_LENGTH) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // passwordHash is hidden by default, so select it explicitly here.
    const user = await User.findOne({ email: cleanEmail }).select(
      "+passwordHash"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(
      passwordValue,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This account is inactive. Please contact support."
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in"
    });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  // authMiddleware already loaded the logged-in user.
  return res.status(200).json({
    success: true,
    user: formatUser(req.user)
  });
};

// POST /api/auth/accept-terms
const acceptTerms = async (req, res) => {
  try {
    const { termsAccepted, termsVersion } = req.body || {};

    if (termsAccepted !== true || termsVersion !== TERMS_VERSION) {
      return res.status(400).json({
        success: false,
        message:
          "Please review and accept the current SupplyBridge terms before continuing"
      });
    }

    req.user.termsVersion = TERMS_VERSION;
    req.user.termsAcceptedAt = new Date();
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Terms accepted successfully",
      user: formatUser(req.user)
    });
  } catch (error) {
    console.error("Accept terms error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to record terms acceptance"
    });
  }
};

// PATCH /api/auth/active-role
// Switches the app between Buyer Mode and Seller Mode.
const updateActiveRole = async (req, res) => {
  try {
    const { activeRole } = req.body;

    if (!ALLOWED_ROLES.includes(activeRole)) {
      return res.status(400).json({
        success: false,
        message: "Active role must be buyer or seller"
      });
    }

    if (!req.user.roles.includes(activeRole)) {
      return res.status(403).json({
        success: false,
        message: "You have not registered for this role"
      });
    }

    req.user.activeRole = activeRole;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Active role updated",
      user: formatUser(req.user)
    });
  } catch (error) {
    console.error("Update active role error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to switch roles"
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  acceptTerms,
  updateActiveRole
};
