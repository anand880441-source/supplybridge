const { POLICY } = require("../../constants/procurement");

// GET /api/procurement/policy
const getProcurementPolicy = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: POLICY
  });
};

module.exports = {
  getProcurementPolicy
};
