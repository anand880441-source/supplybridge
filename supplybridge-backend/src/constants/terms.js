const TERMS_VERSION = "procurement-v2";
const TERMS_EFFECTIVE_DATE = "2026-11-15";

const TERMS_SECTIONS = [
  {
    id: "accounts",
    number: 1,
    title: "Accounts and eligibility",
    icon: "person-circle-outline",
    summary:
      "You must provide accurate account information and use SupplyBridge only for lawful business purposes.",
    bullets: [
      "You must be at least 18 years old and authorised to act for the business you represent.",
      "Account details, contact information, and role selections must be accurate and kept current.",
      "You are responsible for protecting your password and for activity performed through your account.",
      "SupplyBridge may suspend or restrict accounts that are inactive, fraudulent, unsafe, or in breach of these terms.",
      "One person may use buyer and seller roles, but each role must use accurate business information."
    ]
  },
  {
    id: "business-verification",
    number: 2,
    title: "Business profiles and verification",
    icon: "shield-checkmark-outline",
    summary:
      "Business profiles must describe a real business. Verification is a review process and is not automatic.",
    bullets: [
      "A business profile must use the registered or trading name, genuine contact details, and an address where the business operates.",
      "GSTIN, PAN, registration numbers, and uploaded documents must belong to the business being verified.",
      "Uploading a GSTIN or a document does not automatically verify a business. Verification remains pending until reviewed.",
      "SupplyBridge may request additional documents, reject incomplete submissions, or revoke verification if information becomes inaccurate.",
      "Verified status confirms that a review took place; it is not a guarantee of product quality, financial standing, or performance.",
      "Public profiles show limited company information. Private documents, PAN, email, phone, and full street address are not published."
    ]
  },
  {
    id: "requirements",
    number: 3,
    title: "Buyer requirements",
    icon: "clipboard-outline",
    summary:
      "Buyers are responsible for clear, accurate requirements and lawful delivery instructions.",
    bullets: [
      "Requirements must describe the product, quantity, specifications, delivery date, and delivery address accurately.",
      "Buyers must have the authority to purchase the requested goods and must provide valid GST and contact information.",
      "Delivery contact details must belong to a person who can receive the consignment.",
      "Buyers may not request illegal, stolen, counterfeit, dangerous, or restricted products.",
      "Requirements may be edited only where the platform permits. Requirements with pending quotations may have locked commercial terms.",
      "SupplyBridge may close, expire, or remove requirements that breach these terms or cannot be fulfilled safely."
    ]
  },
  {
    id: "quotations",
    number: 4,
    title: "Quotations and seller commitments",
    icon: "document-text-outline",
    summary:
      "A quotation is a binding commercial offer for the period and terms stated in it.",
    bullets: [
      "Sellers must quote only for work they are capable of fulfilling and must use accurate quantity, price, tax, and delivery information.",
      "A seller may submit only one quotation per requirement. The quotation may offer the full quantity, part of it, or a modified solution.",
      "Sending a quotation requires acceptance of the current terms and may require an EMD hold in the seller's wallet.",
      "Quoted prices, GST treatment, delivery dates, and business details must remain consistent with the submitted offer.",
      "Sellers may update or withdraw a pending quotation only through the actions permitted by the platform.",
      "Buyer acceptance creates an order snapshot. The accepted quantity, price, tax, delivery date, and terms are recorded."
    ]
  },
  {
    id: "emd-wallet",
    number: 5,
    title: "EMD and sandbox wallet",
    icon: "wallet-outline",
    summary:
      "The EMD is a performance deposit calculated on taxable value and held in the seller's sandbox wallet.",
    bullets: [
      "The EMD rate is selected by the buyer within the permitted range and is calculated on the taxable value, excluding GST.",
      "The seller must maintain enough available wallet balance before sending a quotation.",
      "Sending a quotation places the EMD on hold. Buyer acceptance captures it for the active order.",
      "The EMD is released when a quotation is rejected, not selected, withdrawn, or expires, and when an order is delivered or cancelled by the buyer.",
      "The EMD is forfeited and credited to the buyer's wallet if the seller cancels an accepted order.",
      "Wallet top-ups in this version are simulated. SupplyBridge does not collect real money or provide banking services."
    ]
  },
  {
    id: "orders",
    number: 6,
    title: "Order formation and records",
    icon: "cube-outline",
    summary:
      "An order is created when a buyer accepts a quotation. The order records the agreed commercial snapshot.",
    bullets: [
      "Accepting a quotation awards the requirement to that seller and rejects other pending quotations.",
      "The buyer must accept the current terms when accepting a quotation. An optional buyer reference or purchase-order number may be recorded.",
      "The order stores the agreed product, quantity, price, GST breakdown, delivery date, business snapshots, and terms acceptance records.",
      "Only the buyer and seller on the order may view its full details.",
      "Order records may be used for support, dispute review, audit, and fraud prevention.",
      "If order creation fails after acceptance, the buyer may retry from the accepted quotation without creating duplicate orders."
    ]
  },
  {
    id: "shipment",
    number: 7,
    title: "Shipment and tracking",
    icon: "car-outline",
    summary:
      "Sellers must dispatch goods with accurate courier and tracking information.",
    bullets: [
      "The seller must begin processing within the order's agreed delivery schedule.",
      "Before marking an order shipped, the seller must provide the courier name, tracking number, dispatch date, and package count.",
      "The seller confirms that the goods have left its premises and that the entered shipment information is accurate.",
      "Tracking links must be valid and must not point to malicious, misleading, or unrelated destinations.",
      "The seller may correct courier or tracking details while an order is shipped, but may not use a correction to misrepresent dispatch.",
      "SupplyBridge does not operate a courier service and cannot guarantee carrier scans, transit times, or tracking availability."
    ]
  },
  {
    id: "delivery",
    number: 8,
    title: "Delivery and buyer acceptance",
    icon: "checkmark-done-outline",
    summary:
      "The buyer confirms receipt after inspecting the delivered goods.",
    bullets: [
      "Only the buyer can confirm that an order has been delivered.",
      "The buyer should confirm delivery only after the consignment has arrived and has been checked for quantity and visible condition.",
      "Delivery confirmation releases the seller's EMD and closes the order as fulfilled.",
      "If goods are missing, damaged, late, or not as agreed, the buyer should contact the seller before confirming delivery and may report the issue through the conversation.",
      "SupplyBridge does not inspect goods and relies on the buyer's confirmation and the parties' records.",
      "Orders remain open until the buyer confirms delivery or the parties resolve the issue separately."
    ]
  },
  {
    id: "cancellations",
    number: 9,
    title: "Cancellations and EMD outcomes",
    icon: "close-circle-outline",
    summary:
      "Cancellation is available only before shipment and always requires a recorded reason.",
    bullets: [
      "A buyer may cancel an order while it is confirmed or processing. The seller's EMD is released.",
      "A seller may cancel an order while it is confirmed or processing. The seller's EMD is forfeited to the buyer.",
      "Neither party may cancel an order after it has been marked shipped through the normal cancellation action.",
      "Every cancellation must include a reason selected from the available options and may include a short note.",
      "Cancellation updates the order, quotation, and requirement records and is visible to both parties.",
      "Repeated cancellations may affect account standing and access to marketplace features."
    ]
  },
  {
    id: "taxes-invoices",
    number: 10,
    title: "GST, invoices and taxes",
    icon: "receipt-outline",
    summary:
      "GST amounts are recorded by the platform, but sellers remain responsible for tax invoices and filings.",
    bullets: [
      "Sellers may quote GST at 0%, 5%, 12%, 18%, or 28%, with GST either included in or added to the quoted price.",
      "CGST and SGST are recorded when the buyer's delivery state matches the seller's state. IGST is recorded otherwise.",
      "A seller GSTIN is required for taxable quotations. Buyers must provide a valid GSTIN when required.",
      "The platform records the place of supply and tax snapshot but does not issue, file, or validate tax invoices.",
      "Sellers must issue valid invoices and comply with applicable GST, e-invoicing, and record-keeping requirements.",
      "Tax information on SupplyBridge is not legal, tax, or accounting advice."
    ]
  },
  {
    id: "payments-settlement",
    number: 11,
    title: "Payments and settlement",
    icon: "card-outline",
    summary:
      "Order payments are settled directly between the buyer and seller.",
    bullets: [
      "SupplyBridge does not process buyer-to-seller order payments, escrow order value, or guarantee payment.",
      "Buyers and sellers must agree on payment terms and verify each other's bank details independently.",
      "The wallet is used only for simulated EMD activity in this version.",
      "A party must not use SupplyBridge to request payment to an unrelated account or to conduct fraudulent transactions.",
      "Payment disputes should be raised directly with the other party and, where appropriate, with the relevant bank or authority.",
      "SupplyBridge may preserve order and message records where needed for fraud investigation or legal compliance."
    ]
  },
  {
    id: "quality-disputes",
    number: 12,
    title: "Quality, returns and disputes",
    icon: "hammer-outline",
    summary:
      "The buyer and seller are responsible for quality, returns, and commercial dispute resolution.",
    bullets: [
      "Sellers must supply goods that match the accepted specifications and applicable law.",
      "Buyers must inspect goods promptly and communicate any issue through the order conversation.",
      "Return, replacement, refund, and warranty terms are agreed directly between the parties unless the platform states otherwise.",
      "SupplyBridge may review available records but is not a party to the commercial contract and does not adjudicate quality disputes.",
      "Parties must not withhold EMD or misuse cancellation reasons to resolve an unrelated commercial disagreement.",
      "Serious safety, fraud, or legal issues should be reported to SupplyBridge support and the appropriate authority."
    ]
  },
  {
    id: "prohibited-goods",
    number: 13,
    title: "Prohibited goods and compliance",
    icon: "ban-outline",
    summary:
      "Users must comply with all applicable laws and may not trade prohibited or unsafe goods.",
    bullets: [
      "Illegal, stolen, counterfeit, explosive, narcotic, wildlife, and unlicensed restricted goods are prohibited.",
      "Users are responsible for permits, licences, quality certifications, and transport requirements for their goods.",
      "Buyers and sellers must comply with applicable company, tax, environmental, labour, and safety laws.",
      "SupplyBridge may remove content, cancel orders, freeze accounts, or report activity where prohibited goods are suspected.",
      "A user must not misrepresent the origin, quality, certification, or legality of goods."
    ]
  },
  {
    id: "conduct",
    number: 14,
    title: "Messaging and conduct",
    icon: "chatbubbles-outline",
    summary:
      "Communication must remain professional, relevant, and lawful.",
    bullets: [
      "Do not harass, threaten, discriminate, impersonate, or mislead another user.",
      "Do not use messages to send spam, phishing links, malware, or unrelated advertising.",
      "Do not attempt to bypass platform controls, manipulate EMD outcomes, or create duplicate accounts to avoid restrictions.",
      "Conversations may be reviewed where necessary for safety, dispute resolution, or legal compliance.",
      "Keep commercial terms inside SupplyBridge where possible so that both parties have a shared record.",
      "Report abusive or fraudulent behaviour to support."
    ]
  },
  {
    id: "data-privacy",
    number: 15,
    title: "Data, privacy and documents",
    icon: "lock-closed-outline",
    summary:
      "SupplyBridge uses account, business, order, and verification data to operate the marketplace.",
    bullets: [
      "Account, business, requirement, quotation, order, message, wallet, and verification data are stored to provide the service.",
      "Verification documents are stored separately from public uploads and are accessible only to authorised users and operators.",
      "Public business profiles expose only the fields intended for other businesses, not private documents or contact details.",
      "Users must have permission to upload documents and personal information belonging to their business or representatives.",
      "Data may be retained where required for legal, tax, fraud-prevention, security, or dispute-resolution purposes.",
      "Users should not upload unnecessary personal, financial, or sensitive information to requirement photos, messages, or portfolio entries."
    ]
  },
  {
    id: "platform-liability",
    number: 16,
    title: "Platform role, liability and changes",
    icon: "information-circle-outline",
    summary:
      "SupplyBridge provides marketplace tools; it is not the buyer, seller, carrier, bank, or tax adviser.",
    bullets: [
      "SupplyBridge facilitates discovery, quotations, EMD records, and order tracking. The commercial contract is between the buyer and seller.",
      "The platform does not guarantee that a business is trustworthy, that goods will be supplied, or that payment will be recovered.",
      "Users are responsible for their own due diligence, contracts, insurance, taxes, and compliance.",
      "SupplyBridge may change features, limits, fees, or these terms. Material changes will be reflected by a new terms version.",
      "Accounts may be suspended or terminated for fraud, abuse, safety risk, or repeated breach of these terms.",
      "Questions, complaints, and verification requests should be raised through the support contact provided in the application.",
      "These terms are marketplace rules and are not a substitute for legal advice."
    ]
  }
];

const TERMS_TEXT = TERMS_SECTIONS.map((section) => {
  return [`${section.number}. ${section.title}`, ...section.bullets].join("\n");
}).join("\n\n");

module.exports = {
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_TEXT
};
