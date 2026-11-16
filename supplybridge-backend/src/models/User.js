const mongoose = require("mongoose");

// A single User document represents a person who can act as a buyer,
// a seller, or both. The roles array stores every role the user registered
// for, and activeRole stores the mode currently shown in the app.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address"
      ]
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must contain 10 digits"]
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      // Never return the password hash in API responses by default.
      select: false
    },
    roles: {
      type: [String],
      enum: ["buyer", "seller"],
      required: true,
      validate: {
        validator: (roles) => roles.length > 0 && roles.length <= 2,
        message: "A user must have at least one role"
      }
    },
    activeRole: {
      type: String,
      enum: ["buyer", "seller"],
      required: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    termsVersion: {
      type: String,
      trim: true,
      default: ""
    },
    termsAcceptedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
