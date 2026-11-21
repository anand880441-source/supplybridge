# SupplyBridge

### A B2B Product Requirement & Supplier Quotation Marketplace

**Find suppliers who can actually fulfil your requirements.**

SupplyBridge is a B2B marketplace designed to simplify bulk procurement by connecting buyers with suppliers through structured product requirements and quotations.

Unlike traditional marketplaces that primarily focus on browsing existing products, SupplyBridge allows buyers to publish their exact procurement requirements, including product specifications, quantities, customization needs, budget, and delivery expectations.

Suppliers can discover relevant requirements and submit structured quotations indicating whether they can fulfil the complete requirement, a partial quantity, or a modified version.

The platform brings requirement discovery, supplier evaluation, quotation management, business communication, order tracking, and procurement safeguards into one unified mobile application.

---

## 1. Problem Statement

Traditional B2B procurement often involves several challenges:

- Buyers struggle to find suppliers who can meet their exact product specifications and bulk quantity requirements.
- Communicating requirements and collecting quotations through calls, emails, and messaging platforms can become difficult to manage.
- Comparing supplier quotations is time-consuming and lacks a standardized structure.
- Buyers have limited visibility into supplier credibility, business verification, and previous performance.
- Managing procurement terms, advance commitments, order fulfilment, and communication across different platforms creates unnecessary complexity.

## 2. Our Solution

SupplyBridge introduces a requirement-driven procurement marketplace where buyers describe what they need and suppliers respond with structured offers.

The platform provides:

- A centralized requirement discovery system.
- Structured quotations with full, partial, and modified fulfilment options.
- Business profiles with verification and portfolio information.
- GST-aware quotation calculations.
- An Earnest Money Deposit (EMD) mechanism using a sandbox wallet.
- Secure buyer-seller communication.
- Order lifecycle and shipment tracking.
- Business ratings and reviews based on delivered orders.
- Persistent in-app notifications and authenticated real-time updates.

The goal is to make B2B procurement more transparent, structured, and manageable.

---

## 3. Core Features

### Buyer Features

- **Post Requirements:** Publish bulk product requirements with specifications, quantities, categories, delivery dates, budgets, and images.
- **Discover Suppliers:** Receive structured quotations from suppliers interested in fulfilling requirements.
- **Compare Quotations:** Evaluate supplier offers, pricing, fulfilment capacity, GST, and delivery commitments.
- **Manage Procurement:** Accept or reject quotations and manage the resulting orders.
- **Track Orders:** Monitor processing, shipment, delivery, and order history.
- **Supplier Communication:** Communicate directly with suppliers through quotation-specific conversations.
- **Business Reputation:** View supplier profiles, verification status, portfolios, and ratings.
- **Reviews:** Submit ratings and feedback after successful order delivery.

### Seller Features

- **Find Requirements:** Discover open buyer requirements through searchable and filterable feeds.
- **Submit Quotations:** Send full, partial, or modified fulfilment offers.
- **Manage Quotations:** Edit pending quotations, withdraw offers, and monitor quotation statuses.
- **EMD Wallet:** Manage available and held sandbox EMD balances.
- **Business Profile:** Maintain company information, product categories, portfolios, and verification documents.
- **Order Management:** Process orders, provide shipment information, and track fulfilment.
- **Buyer Communication:** Communicate directly with buyers through quotation-specific conversations.
- **Business Reputation:** Receive ratings and reviews from buyers after delivered orders.

### Shared Platform Features

- Unified buyer and seller accounts with role switching.
- JWT-based authentication and authorization.
- Business verification workflow.
- GST calculations and procurement terms management.
- Versioned procurement terms and acceptance records.
- Persistent in-app notifications.
- Authenticated WebSocket communication.
- Unread message and notification indicators.
- Role-specific order management and permissions.

---

## 4. How SupplyBridge Works

The platform follows a structured procurement lifecycle:

1. **Buyer Registration:** A buyer creates an account and completes their business profile.
2. **Requirement Publication:** The buyer publishes a product requirement with quantity, specifications, and delivery details.
3. **Supplier Discovery:** Sellers browse available requirements and identify relevant opportunities.
4. **Quotation Submission:** Interested suppliers submit full, partial, or modified quotations.
5. **Quotation Evaluation:** The buyer compares available offers and evaluates suppliers.
6. **Quotation Acceptance:** The buyer accepts a suitable quotation after agreeing to the procurement terms.
7. **Order Creation:** The system automatically creates a confirmed order from the accepted quotation.
8. **Order Fulfilment:** The seller processes and dispatches the order with shipment details.
9. **Delivery Confirmation:** The buyer confirms successful delivery.
10. **Ratings and Reviews:** Both parties can review each other based on the completed transaction.

---

## 5. Technology Stack

SupplyBridge is built using the MERN ecosystem with React Native and Expo for the mobile application.

| Layer | Technology |
|---|---|
| Mobile Application | React Native |
| Development Framework | Expo |
| Programming Language | JavaScript / JSX |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT |
| Password Hashing | bcryptjs |
| Navigation | React Navigation |
| Real-time Communication | WebSocket (ws) |
| Native Secure Storage | Expo SecureStore |

**Development principle:** The project uses JavaScript throughout its application code, with no TypeScript introduced in newly developed application modules.

---

## 6. Project Architecture

SupplyBridge follows a separated frontend-backend architecture.

- **Mobile Application:** Handles user interfaces, navigation, forms, buyer and seller experiences, and API communication.
- **Backend API:** Manages authentication, authorization, business logic, procurement workflows, and data validation.
- **Database:** MongoDB stores users, business profiles, requirements, quotations, conversations, messages, orders, reviews, notifications, and wallet transactions.
- **Real-time Layer:** An authenticated WebSocket endpoint delivers notification and messaging events.
- **Security Layer:** Backend middleware handles authentication, role permissions, request limits, CORS, security headers, and upload validation.

The mobile application communicates with the backend through REST APIs. It never accesses MongoDB directly.

### High-Level Architecture

```text
       React Native Mobile App
              (Expo)
                 |
          REST API / WebSocket
                 |
          Node.js + Express
                 |
       -----------------------
       |          |          |
    Modules   Middleware  Realtime
       |          |          |
       -----------------------
                 |
              Mongoose
                 |
              MongoDB
```

---

## 7. Procurement & Trust Mechanisms

SupplyBridge incorporates several mechanisms to improve transparency and accountability during procurement.

**Business Verification**

Businesses can submit PAN, GST, registration, and address documents for operator review. Verification status is controlled by the backend.

**GST-Aware Quotations**

The platform supports configurable GST rates, inclusive and exclusive pricing, and automatic CGST, SGST, or IGST calculations.

**Earnest Money Deposit (EMD)**

A sandbox wallet maintains seller EMD balances and transaction records. Deposits are reserved, captured, released, or forfeited according to quotation and order outcomes.

**Versioned Procurement Terms**

Buyers and sellers must accept the current procurement terms at the relevant stages of the transaction.

**Order Snapshots**

Accepted quotations generate immutable order snapshots containing agreed commercial terms, pricing, GST, delivery information, and business identities.

**Verified Transaction Reviews**

Only buyers and sellers involved in a delivered order can review each other, helping establish transaction-based business reputation.

---

## 8. Security & Reliability

Security and backend-controlled business rules are important parts of the project.

Implemented measures include:

- JWT authentication and server-side user validation.
- Role-based authorization for buyer and seller operations.
- bcryptjs password hashing.
- SecureStore for native JWT persistence.
- HTTP security headers and configurable CORS.
- API rate limiting and authentication failure limits.
- Production error sanitization.
- File signature validation for uploaded documents.
- Private storage for business verification documents.
- Ownership-based access to requirements, quotations, conversations, and orders.
- Idempotent operations for order creation and EMD settlements.
- Authenticated WebSocket connections with connection limits and heartbeat checks.

---

## 9. Current Development Status

<badge color="success">Phases 1–14 Completed</badge>

SupplyBridge has completed its first 14 development phases, covering the core marketplace, procurement workflows, business verification, communication, order management, security, and real-time functionality.

### Implementation Highlights

| Area | Status |
|---|---|
| Authentication & Authorization | Complete |
| Buyer & Seller Experiences | Complete |
| Business Profiles & Verification | Complete |
| Requirement Management | Complete |
| Supplier Discovery | Complete |
| Quotation Management | Complete |
| GST & Procurement Terms | Complete |
| EMD Sandbox Wallet | Complete |
| Buyer-Seller Messaging | Complete |
| Order & Shipment Management | Complete |
| Business Ratings & Reviews | Complete |
| Persistent Notifications | Complete |
| Authenticated Real-time Updates | Complete |
| Security Hardening | Complete |

### Testing & Validation

The following validation results have been recorded:

- Six regression suites: **298 checks passed**.
- Notification transport/API suite: **28 checks passed**.
- Notification hook suite: **36 checks passed**.
- Reviews API test: **25 checks passed**.
- Security suite: **28 checks passed**.
- Android export: **1,040 modules**.
- Expo Doctor: **20/20 checks passed**.

For detailed implementation history and development progress, see [PROJECT_PROGRESS.md](./PROJECT_PROGRESS.md).

---

## 10. Current Scope & Future Improvements

The current implementation focuses on establishing a complete procurement workflow within a mobile-first marketplace.

Potential future improvements include:

- Real payment gateway integration.
- OS-level push notifications.
- Dedicated administration dashboard.
- Dispute resolution and returns management.
- Procurement analytics and reporting.
- Advanced marketplace insights.

**Note:** The current EMD wallet is a sandbox implementation and does not process real payments. Business-to-business payments are handled directly between the participating businesses.

---

## 11. Project Structure

```text
supply_bridge/
│
├── supplybridge-backend/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── modules/
│   │   ├── realtime/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   ├── uploads/
│   └── package.json
│
├── supplybridge-app/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── services/
│   │   └── utils/
│   ├── App.js
│   └── package.json
│
├── README.md
└── PROJECT_PROGRESS.md
```

---

## 12. Project Vision

SupplyBridge aims to make business procurement more accessible by creating a structured environment where buyers can communicate their exact requirements and suppliers can demonstrate their actual fulfilment capabilities.

Rather than simply connecting buyers and sellers, the platform focuses on the entire procurement journey — from requirement discovery to quotation, agreement, order fulfilment, and business reputation.

**SupplyBridge — Find suppliers who can actually fulfil your requirements.**
