const REQUIREMENT_SUMMARY_FIELDS =
  "productName category quantity unit deliveryLocation deliveryDate status buyerId";

const formatRequirementSummary = (requirement) => {
  if (!requirement || !requirement.productName) {
    return null;
  }

  return {
    id: requirement._id,
    productName: requirement.productName,
    category: requirement.category,
    quantity: requirement.quantity,
    unit: requirement.unit,
    deliveryLocation: requirement.deliveryLocation,
    deliveryDate: requirement.deliveryDate,
    status: requirement.status
  };
};

module.exports = {
  REQUIREMENT_SUMMARY_FIELDS,
  formatRequirementSummary
};
