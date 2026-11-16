const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true
});

const mongoose = require("mongoose");
const connectDatabase = require("../src/config/db");
const Order = require("../src/models/Order");
const Quotation = require("../src/models/Quotation");
const Requirement = require("../src/models/Requirement");

const applyChanges = process.argv.includes("--apply");
const summary = {
  requirementsUpdated: 0,
  quotationsUpdated: 0,
  ordersUpdated: 0,
  legacyOrdersPreserved: []
};

const updateIfNeeded = async (Model, id, values, counter) => {
  if (Object.keys(values).length === 0) {
    return false;
  }

  if (applyChanges) {
    await Model.updateOne({ _id: id }, { $set: values });
  }

  summary[counter] += 1;
  return true;
};

const getDeliveryTime = (order) => {
  const deliveredEntry = (order.statusHistory || [])
    .filter((entry) => entry.status === "delivered")
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt))
    .pop();

  return deliveredEntry ? deliveredEntry.changedAt : order.updatedAt;
};

const run = async () => {
  await connectDatabase();

  const requirements = await Requirement.find({}).sort({ createdAt: 1 });

  for (const requirement of requirements) {
    const order = await Order.findOne({ requirementId: requirement._id });
    const acceptedQuotation =
      (order && (await Quotation.findById(order.quotationId))) ||
      (await Quotation.findOne({
        requirementId: requirement._id,
        status: "accepted"
      }));

    const requirementUpdates = {};

    if (requirement.emdRate === undefined || requirement.emdRate === null) {
      requirementUpdates.emdRate = 2;
    }

    if (!requirement.roundNumber) {
      requirementUpdates.roundNumber = 1;
    }

    if (requirement.status === "closed") {
      if (order) {
        requirementUpdates.awardedAt =
          requirement.awardedAt || order.createdAt;
        requirementUpdates.acceptedQuotationId = order.quotationId;
        requirementUpdates.activeOrderId = order._id;

        if (order.status === "delivered") {
          requirementUpdates.status = "fulfilled";
          requirementUpdates.fulfilledAt =
            requirement.fulfilledAt || getDeliveryTime(order);
        } else if (order.status === "cancelled") {
          requirementUpdates.status = "cancelled";
          requirementUpdates.cancelledAt =
            requirement.cancelledAt || order.cancelledAt || order.updatedAt;
          requirementUpdates.cancelledBy = order.cancelledBy || null;
          requirementUpdates.cancelledByRole =
            order.cancelledByRole || null;
          requirementUpdates.cancellationReason =
            requirement.cancellationReason ||
            order.cancellationReason ||
            "";

          if (acceptedQuotation && acceptedQuotation.status === "accepted") {
            await updateIfNeeded(
              Quotation,
              acceptedQuotation._id,
              {
                status: "cancelled",
                cancelledAt:
                  acceptedQuotation.cancelledAt ||
                  order.cancelledAt ||
                  order.updatedAt
              },
              "quotationsUpdated"
            );
          }
        } else {
          requirementUpdates.status = "awarded";
        }
      } else if (acceptedQuotation) {
        requirementUpdates.status = "awarded";
        requirementUpdates.awardedAt =
          requirement.awardedAt ||
          acceptedQuotation.respondedAt ||
          acceptedQuotation.updatedAt;
        requirementUpdates.acceptedQuotationId = acceptedQuotation._id;
        requirementUpdates.closedAt = null;
      }
    }

    if (requirement.status === "awarded" && order) {
      requirementUpdates.activeOrderId =
        requirementUpdates.activeOrderId || order._id;
      requirementUpdates.acceptedQuotationId =
        requirementUpdates.acceptedQuotationId || order.quotationId;
    }

    await updateIfNeeded(
      Requirement,
      requirement._id,
      requirementUpdates,
      "requirementsUpdated"
    );
  }

  const orders = await Order.find({}).sort({ createdAt: 1 });

  for (const order of orders) {
    const fallbackTotal = Number(order.totalPrice || 0);
    const hasTaxableValue =
      Number(order.taxableValue || 0) > 0 || fallbackTotal === 0;
    const orderUpdates = {
      taxableValue: hasTaxableValue ? order.taxableValue : fallbackTotal,
      grandTotal:
        order.grandTotal === undefined || order.grandTotal === null
          ? fallbackTotal
          : order.grandTotal,
      emdRate: order.emdRate === undefined ? 0 : order.emdRate,
      emdAmount: order.emdAmount === undefined ? 0 : order.emdAmount,
      emdStatus: order.emdStatus || "not_required",
      termsVersion: order.termsVersion || ""
    };

    await updateIfNeeded(
      Order,
      order._id,
      orderUpdates,
      "ordersUpdated"
    );

    summary.legacyOrdersPreserved.push({
      orderNumber: order.orderNumber,
      status: order.status,
      productName: order.productName
    });
  }

  const quotations = await Quotation.find({}).sort({ createdAt: 1 });

  for (const quotation of quotations) {
    const fallbackTotal = Number(quotation.totalPrice || 0);
    const hasTaxableValue =
      Number(quotation.taxableValue || 0) > 0 || fallbackTotal === 0;
    const quotationUpdates = {
      gstRate: quotation.gstRate || 0,
      pricingMode: quotation.pricingMode || "exclusive",
      taxableValue: hasTaxableValue
        ? quotation.taxableValue
        : fallbackTotal,
      cgstAmount: quotation.cgstAmount || 0,
      sgstAmount: quotation.sgstAmount || 0,
      igstAmount: quotation.igstAmount || 0,
      totalTax: quotation.totalTax || 0,
      grandTotal:
        quotation.grandTotal === undefined ||
        quotation.grandTotal === null
          ? fallbackTotal
          : quotation.grandTotal,
      emdRate: quotation.emdRate === undefined ? 0 : quotation.emdRate,
      emdAmount:
        quotation.emdAmount === undefined ? 0 : quotation.emdAmount,
      emdStatus: quotation.emdStatus || "not_required",
      termsAccepted: Boolean(quotation.termsAccepted),
      termsVersion: quotation.termsVersion || ""
    };

    if (quotation.status === "accepted") {
      const order = await Order.findOne({ quotationId: quotation._id });
      quotationUpdates.orderId = order ? order._id : quotation.orderId || null;
    }

    await updateIfNeeded(
      Quotation,
      quotation._id,
      quotationUpdates,
      "quotationsUpdated"
    );
  }

  console.log(
    applyChanges
      ? "Procurement backfill applied."
      : "Procurement backfill dry run (pass --apply to write changes)."
  );
  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Procurement backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
