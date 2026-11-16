const crypto = require("crypto");

const Business = require("../../models/Business");
const Order = require("../../models/Order");
const Quotation = require("../../models/Quotation");
const Requirement = require("../../models/Requirement");

const generateOrderNumber = () => {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `SB-${dateStamp}-${randomPart}`;
};

const buildBusinessSnapshot = (business) => {
  if (!business) {
    return null;
  }

  return {
    companyName: business.companyName || "",
    legalName: business.legalName || "",
    businessType: business.businessType || "",
    contactPerson: business.contactPerson || "",
    phone: business.phone || "",
    email: business.email || "",
    address: business.address || "",
    city: business.city || "",
    state: business.state || "",
    pincode: business.pincode || "",
    gstin: business.gstin || "",
    logoUrl: business.logoUrl || ""
  };
};

const buildDeliveryAddress = (requirement, buyerBusiness) => {
  return {
    contactName:
      requirement.deliveryContactName || buyerBusiness?.contactPerson || "",
    phone: requirement.deliveryPhone || buyerBusiness?.phone || "",
    line1: requirement.deliveryAddress || buyerBusiness?.address || "",
    city: requirement.deliveryCity || buyerBusiness?.city || "",
    state: requirement.deliveryState || buyerBusiness?.state || "",
    pincode: requirement.deliveryPincode || buyerBusiness?.pincode || "",
    landmark: requirement.deliveryLocation || "",
    instructions: requirement.deliveryInstructions || ""
  };
};

const linkOrderToProcurement = async (order, quotation, requirement) => {
  await Quotation.updateOne(
    { _id: quotation._id },
    { $set: { orderId: order._id } }
  );

  await Requirement.updateOne(
    { _id: requirement._id },
    { $set: { activeOrderId: order._id } }
  );
};

// An accepted quotation has exactly one order. Calling this from acceptance or
// from the buyer's order action returns the same document.
const createOrderFromQuotation = async (quotation, requirement) => {
  const existingOrder = await Order.findOne({ quotationId: quotation._id });

  if (existingOrder) {
    await linkOrderToProcurement(existingOrder, quotation, requirement);

    return existingOrder;
  }

  const now = new Date();
  const [buyerBusiness, sellerBusiness] = await Promise.all([
    Business.findById(requirement.businessId),
    Business.findById(quotation.businessId)
  ]);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        quotationId: quotation._id,
        requirementId: requirement._id,
        buyerId: requirement.buyerId,
        sellerId: quotation.sellerId,
        buyerBusinessId: requirement.businessId,
        sellerBusinessId: quotation.businessId,
        productName: requirement.productName,
        category: requirement.category,
        offerType: quotation.offerType,
        quantity: quotation.offeredQuantity,
        unit: requirement.unit,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        gstRate: quotation.gstRate || 0,
        pricingMode: quotation.pricingMode || "exclusive",
        taxableValue: quotation.taxableValue || quotation.totalPrice,
        cgstAmount: quotation.cgstAmount || 0,
        sgstAmount: quotation.sgstAmount || 0,
        igstAmount: quotation.igstAmount || 0,
        totalTax: quotation.totalTax || 0,
        grandTotal: quotation.grandTotal || quotation.totalPrice,
        placeOfSupply: quotation.placeOfSupply || "",
        sellerGstin: quotation.sellerGstin || "",
        buyerGstin: quotation.buyerGstin || "",
        emdRate: quotation.emdRate || 0,
        emdAmount: quotation.emdAmount || 0,
        emdStatus:
          quotation.emdStatus === "held"
            ? "captured"
            : quotation.emdStatus || "not_required",
        emdSettledAt: quotation.emdSettledAt || now,
        termsVersion: quotation.termsVersion || "",
        sellerTermsVersion: quotation.termsVersion || "",
        sellerTermsAcceptedAt: quotation.termsAcceptedAt || null,
        buyerTermsVersion: quotation.buyerTermsVersion || "",
        buyerTermsAcceptedAt: quotation.buyerTermsAcceptedAt || null,
        buyerReference: quotation.buyerReference || "",
        buyerSnapshot: buildBusinessSnapshot(buyerBusiness),
        sellerSnapshot: buildBusinessSnapshot(sellerBusiness),
        deliveryAddress: buildDeliveryAddress(requirement, buyerBusiness),
        deliveryDate: quotation.deliveryDate,
        deliveryLocation: requirement.deliveryLocation,
        status: "confirmed",
        statusHistory: [
          {
            status: "confirmed",
            changedBy: requirement.buyerId,
            changedAt: now,
            actorRole: "buyer",
            note: "Quotation accepted and order confirmed"
          }
        ]
      });

      await linkOrderToProcurement(order, quotation, requirement);

      return order;
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      const racedOrder = await Order.findOne({
        quotationId: quotation._id
      });

      if (racedOrder) {
        await linkOrderToProcurement(racedOrder, quotation, requirement);

        return racedOrder;
      }
    }
  }

  throw new Error("Unable to generate a unique order number");
};

module.exports = {
  createOrderFromQuotation
};
