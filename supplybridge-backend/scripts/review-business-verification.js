require("dotenv").config();

const mongoose = require("mongoose");

const Business = require("../src/models/Business");
const connectDatabase = require("../src/config/db");
const {
  createNotification
} = require("../src/modules/notifications/notification.service");

const readArg = (name) => {
  const index = process.argv.indexOf(`--${name}`);

  if (index === -1) {
    return "";
  }

  return process.argv[index + 1] || "";
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const printUsage = () => {
  console.log(`
Usage:
  node scripts/review-business-verification.js --list
  node scripts/review-business-verification.js --business <id> --approve [--note "text"]
  node scripts/review-business-verification.js --business <id> --reject --note "reason"
`);
};

const listPending = async () => {
  const businesses = await Business.find({ verificationStatus: "pending" })
    .select(
      "companyName legalName email phone city state gstin panNumber registrationNumber verificationRequestedAt verificationDocuments"
    )
    .sort({ verificationRequestedAt: 1 })
    .lean();

  if (businesses.length === 0) {
    console.log("No business verification requests are pending.");
    return;
  }

  console.log(`${businesses.length} pending verification request(s):\n`);

  businesses.forEach((business, index) => {
    const documents = (business.verificationDocuments || [])
      .map((document) => document.type)
      .join(", ");

    console.log(`${index + 1}. ${business.companyName}`);
    console.log(`   ID: ${business._id}`);
    console.log(`   Legal name: ${business.legalName || "Not provided"}`);
    console.log(
      `   Contact: ${business.email} | ${business.phone} | ${business.city}, ${business.state}`
    );
    console.log(`   GSTIN: ${business.gstin || "Not provided"}`);
    console.log(`   PAN: ${business.panNumber || "Not provided"}`);
    console.log(
      `   Registration: ${business.registrationNumber || "Not provided"}`
    );
    console.log(`   Documents: ${documents || "None"}`);
    console.log(
      `   Requested: ${
        business.verificationRequestedAt
          ? business.verificationRequestedAt.toISOString()
          : "Unknown"
      }\n`
    );
  });
};

const reviewBusiness = async () => {
  const businessId = readArg("business");
  const approve = hasFlag("approve");
  const reject = hasFlag("reject");
  const note = readArg("note").trim();

  if (!businessId || approve === reject) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!mongoose.isValidObjectId(businessId)) {
    console.error("Invalid business id.");
    process.exitCode = 1;
    return;
  }

  if (reject && !note) {
    console.error("A rejection note is required. Use --note \"reason\".");
    process.exitCode = 1;
    return;
  }

  const business = await Business.findById(businessId);

  if (!business) {
    console.error("Business not found.");
    process.exitCode = 1;
    return;
  }

  if (business.verificationStatus !== "pending") {
    console.error(
      `Business is currently "${business.verificationStatus}", not pending.`
    );
    process.exitCode = 1;
    return;
  }

  const nextStatus = approve ? "verified" : "rejected";

  await Business.updateOne(
    { _id: business._id, verificationStatus: "pending" },
    {
      $set: {
        verificationStatus: nextStatus,
        verificationReviewedAt: new Date(),
        verificationNote: note
      }
    }
  );

  await createNotification({
    recipientId: business.ownerId,
    type: approve ? "verification_approved" : "verification_rejected",
    title: approve ? "Business verified" : "Verification needs attention",
    message: approve
      ? "Your business verification was approved. Buyers and sellers can now see your verified status."
      : `Your business verification was not approved.${note ? ` ${note.slice(0, 300)}` : ""}`,
    relatedType: "business",
    relatedId: business._id
  });

  console.log(
    `${business.companyName} (${business._id}) marked as ${nextStatus}.`
  );
};

const run = async () => {
  try {
    await connectDatabase();

    if (hasFlag("list")) {
      await listPending();
    } else {
      await reviewBusiness();
    }
  } catch (error) {
    console.error("Verification review failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
