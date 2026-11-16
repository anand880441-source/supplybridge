// Checks that the logged-in user has at least one of the allowed roles.
// Example: router.post("/", authMiddleware, allowRoles("seller"), createQuotation)
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue"
      });
    }

    const hasAllowedRole = req.user.roles.some((role) =>
      allowedRoles.includes(role)
    );

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
    }

    return next();
  };
};

module.exports = allowRoles;
