# SupplyBridge

A B2B product requirement and supplier quotation marketplace.

Buyers post what they need in bulk or customized quantities, and sellers respond
with structured quotations that clearly state whether they can fulfil the full
requirement, only part of it, or the requirement with modifications.

> Core positioning: "Find suppliers who can actually fulfil your requirements."

**Current status:** Phases 1–14 are complete and API-tested. Phase 14 adds
persistent in-app notifications and authenticated real-time updates: a
notification center with unread badges, WebSocket delivery for quotation, order,
review, verification, and message events, and polling fallbacks. Phase 13 adds
security and production hardening: safe HTTP headers, CORS allowlisting, request
size limits, rate limiting, production error sanitization, stronger JWT/password
validation, upload signature checks, SecureStore token storage, and configurable
API deployment URLs. Phase 12 adds delivered-order ratings and reviews for both
buyers and sellers, business rating summaries across public profiles and
requirement details, and a richer requirement presentation. Earlier phases
provide versioned procurement terms, structured fulfilment, business
verification, portfolios, GST-aware quotations, the sandbox EMD wallet, and
repost rounds. The six regression suites pass (298 checks), the notification
transport/API suite passes (28 checks), the notification hook suite passes (36
checks), the reviews API test passes (25 checks), the security suite passes (28
checks), and Android export (1,040 modules) and Expo Doctor (20/20 checks) pass.
See [PROJECT_PROGRESS.md](./PROJECT_PROGRESS.md).

---

## Technology Stack

- **Mobile app:** React Native (JavaScript/JSX) with Expo
- **Backend:** Node.js with Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT with bcryptjs password hashing
- **Realtime:** Authenticated WebSocket (`ws`) at `/api/realtime`
- **Navigation:** React Navigation (native stack and bottom tabs)

No TypeScript is used for new application code.

---

## Folder Structure

```text
supply_bridge/
│
├── supplybridge-backend/            Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                MongoDB connection
│   │   ├── constants/
│   │   │   ├── communicationOptions.js Message limits and roles
│   │   │   ├── orderOptions.js      Order statuses and role transitions
│   │   │   ├── procurement.js       EMD policy, terms, cancellation reasons
│   │   │   ├── productOptions.js    Requirement categories and units
│   │   │   ├── quotationOptions.js  Quotation offer types and statuses
│   │   │   ├── taxOptions.js        GST rates, splits, and calculations
│   │   │   └── terms.js             Versioned procurement terms text
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    Verifies JWT tokens
│   │   │   ├── roleMiddleware.js    Buyer/seller permission checks
│   │   │   ├── uploadMiddleware.js  Public and private upload handling
│   │   │   ├── securityMiddleware.js Headers, CORS, and rate limiting
│   │   │   └── errorMiddleware.js   404 and error responses
│   │   ├── models/
│   │   │   ├── User.js              User schema
│   │   │   ├── Business.js          Business profile schema
│   │   │   ├── Conversation.js      Quotation-scoped chat thread
│   │   │   ├── Message.js           Text message schema
│   │   │   ├── Notification.js      Persistent recipient notification
│   │   │   ├── Order.js             Accepted-quotation order snapshot
│   │   │   ├── Requirement.js       Buyer requirement schema
│   │   │   ├── Quotation.js         Seller quotation schema
│   │   │   ├── Review.js            Delivered-order business review
│   │   │   ├── Wallet.js            Seller sandbox EMD wallet
│   │   │   └── WalletTransaction.js Append-only wallet ledger
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   └── auth.controller.js
│   │   │   ├── businesses/
│   │   │   │   ├── business.routes.js
│   │   │   │   ├── business.controller.js
│   │   │   │   └── business.validation.js
│   │   │   ├── requirements/
│   │   │   │   ├── requirement.routes.js
│   │   │   │   ├── requirement.controller.js
│   │   │   │   └── requirement.validation.js
│   │   │   ├── quotations/
│   │   │   │   ├── quotation.routes.js
│   │   │   │   ├── quotation.controller.js
│   │   │   │   └── quotation.validation.js
│   │   │   ├── conversations/
│   │   │   │   ├── conversation.routes.js
│   │   │   │   ├── conversation.controller.js
│   │   │   │   └── conversation.validation.js
│   │   │   ├── orders/
│   │   │   │   ├── order.routes.js
│   │   │   │   ├── order.controller.js
│   │   │   │   ├── order.service.js
│   │   │   │   └── order.validation.js
│   │   │   ├── procurement/          Policy endpoint
│   │   │   │   ├── procurement.routes.js
│   │   │   │   └── procurement.controller.js
│   │   │   ├── notifications/        Persistent notification API
│   │   │   │   ├── notification.routes.js
│   │   │   │   ├── notification.controller.js
│   │   │   │   └── notification.service.js
│   │   │   ├── reviews/              Business ratings and reviews
│   │   │   │   ├── review.routes.js
│   │   │   │   ├── review.controller.js
│   │   │   │   ├── review.service.js
│   │   │   │   └── review.validation.js
│   │   │   └── wallet/               Wallet and top-up endpoints
│   │   │       ├── wallet.routes.js
│   │   │       └── wallet.controller.js
│   │   ├── realtime/
│   │   │   └── realtime.js           Authenticated WebSocket registry
│   │   ├── services/
│   │   │   ├── procurement.service.js EMD settlement and reposting
│   │   │   └── wallet.service.js     Idempotent wallet ledger operations
│   │   ├── utils/
│   │   │   ├── businessSummary.js    Safe public business fields
│   │   │   ├── generateToken.js
│   │   │   ├── requirementExpiry.js  Lazy requirement/quote expiry
│   │   │   └── requirementSummary.js Shared safe requirement summary
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   │   ├── backfill-procurement.js  Legacy tax/EMD/status migration
│   │   └── review-business-verification.js Operator verification CLI
│   ├── uploads/                     Public photos and logos (not committed)
│   ├── private-uploads/             Verification documents (not committed)
│   ├── .env                         Local secrets (not committed)
│   ├── .env.example
│   └── package.json
│
├── supplybridge-app/                Expo React Native app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              Buttons, inputs, avatars, status pills
│   │   │   ├── forms/               Choice chips
│   │   │   ├── messages/            Conversation card
│   │   │   ├── notifications/       Notification bell with unread badge
│   │   │   ├── orders/              Order cards, shipment/delivery modals
│   │   │   ├── quotations/          Quotation card and status badge
│   │   │   ├── requirements/        Requirement card and status badge
│   │   │   └── reviews/             Star rating, review list, summary, modal
│   │   ├── constants/
│   │   │   ├── business.js          Business types and categories
│   │   │   ├── config.js            API address detection
│   │   │   ├── messages.js          Message limit and role labels
│   │   │   ├── orders.js            Order labels, statuses, and actions
│   │   │   ├── procurement.js       EMD, GST, terms, cancellation labels
│   │   │   ├── quotations.js        Quotation labels and status metadata
│   │   │   ├── requirements.js      Requirement units and statuses
│   │   │   └── theme.js             Colours, spacing, radius
│   │   ├── context/
│   │   │   ├── AuthContext.js       Session, login, role switching
│   │   │   ├── NotificationsContext.js Unread count and WebSocket events
│   │   │   └── UnreadMessagesContext.js Shared unread badge count
│   │   ├── navigation/
│   │   │   ├── RootNavigator.jsx    Shared stack incl. wallet/policy/repost routes
│   │   │   ├── AuthNavigator.jsx
│   │   │   ├── BuyerNavigator.jsx   Buyer tabs including Orders and Messages
│   │   │   └── SellerNavigator.jsx  Seller tabs including Orders and Messages
│   │   ├── screens/
│   │   │   ├── auth/                Login, Register
│   │   │   ├── business/            Profile, edit, verification, portfolio, public view
│   │   │   ├── buyer/               Buyer home
│   │   │   ├── messages/            Conversation list and message thread
│   │   │   ├── notifications/       Notification center with filters
│   │   │   ├── orders/              Order list, shipment, and delivery detail
│   │   │   ├── procurement/         Versioned procurement terms and policy
│   │   │   ├── quotations/          Quote form, detail, comparison, My Quotes
│   │   │   ├── requirements/        Post, repost, list, and view requirements
│   │   │   ├── seller/              Seller home and Find Needs feed
│   │   │   ├── wallet/              Seller EMD wallet and ledger
│   │   │   └── profile/             Shared profile and mode switch
│   │   ├── services/
│   │   │   ├── api.js               Shared fetch wrapper
│   │   │   ├── authService.js       Auth API calls
│   │   │   ├── businessService.js   Business API calls
│   │   │   ├── conversationService.js Conversation and message API calls
│   │   │   ├── notificationService.js Notification list and read-state calls
│   │   │   ├── orderService.js      Order API calls
│   │   │   ├── procurementService.js Policy API calls
│   │   │   ├── quotationService.js  Quotation API calls
│   │   │   ├── requirementService.js Requirement API calls
│   │   │   ├── reviewService.js     Review and rating API calls
│   │   │   └── walletService.js     Wallet/top-up API calls
│   │   └── utils/
│   │       ├── formatters.js        Dates, times, currency, quantity text
│   │       ├── ratings.js           Business rating helpers
│   │       ├── sessionStorage.js    SecureStore token and cached user
│   │       └── tax.js               GST and EMD previews
│   ├── App.js
│   ├── .env.example
│   └── package.json
│
├── README.md
└── PROJECT_PROGRESS.md
```

---

## Prerequisites

- Node.js 22 or newer
- npm
- MongoDB installed and running locally
- Expo Go installed on your phone
- The phone and computer on the **same Wi-Fi network**

This project was set up with Node.js v22.20.0 and npm 10.9.3.

---

## Backend Setup

```powershell
cd supplybridge-backend
npm install
Copy-Item .env.example .env
npm run dev
```

The API starts only after MongoDB connects successfully.

- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

**Important:** the backend must stay running in its own terminal while you use
the app. Closing that terminal stops the API and the app will show a connection
error.

The notification WebSocket shares the same HTTP server and port; there is no
separate realtime process. In production, terminate TLS at the same reverse proxy
and allow WebSocket upgrades on `/api/realtime`. Use `wss://` so the JWT query
parameter is encrypted in transit.

### MongoDB

The local database is named `supplybridge`. Check the Windows service:

```powershell
Get-Service MongoDB
```

If it is stopped, start it from an Administrator PowerShell:

```powershell
Start-Service MongoDB
```

Quick connection test (optional):

```powershell
mongosh --quiet --eval "db.runCommand({ ping: 1 })"
```

Expected output: `{ ok: 1 }`

### Environment Variables

`supplybridge-backend/.env`:

```text
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/supplybridge
JWT_SECRET=<a long random secret>
JWT_EXPIRES_IN=7d
NODE_ENV=development
HOST=0.0.0.0
CORS_ORIGINS=
TRUST_PROXY=
JSON_BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=3000
AUTH_FAILURE_WINDOW_MS=900000
AUTH_FAILURE_LIMIT=20
```

Generate a new secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`NODE_ENV=production` requires a JWT secret of at least 32 bytes and rejects the
example placeholder. Set `CORS_ORIGINS` to a comma-separated browser allowlist in
production; native requests without an `Origin` header remain allowed. Set
`TRUST_PROXY=1` only when the API runs behind a trusted reverse proxy. Rate
limits are in-memory and apply per API process.

`.env` is ignored by Git. Never commit real secrets.

---

## Mobile App Setup

```powershell
cd supplybridge-app
npm install
npx expo start -c
```

Scan the QR code with Expo Go.

The API address is detected automatically from the Expo development server
(`src/constants/config.js`). A physical phone cannot use `localhost`, because
`localhost` on the phone means the phone itself. If automatic detection ever
fails, a fallback LAN IP is stored in that file.

For a deployed backend, set `EXPO_PUBLIC_API_URL` before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_URL="https://api.example.com/api"
npx expo start -c
```

The value may be either the server base URL or the full `/api` URL. Restart
Metro after changing it. Native sessions store the JWT in `expo-secure-store`;
web falls back to AsyncStorage because SecureStore is unavailable there.

Other environments:

- Android emulator: `10.0.2.2`
- Expo web or iOS simulator: `127.0.0.1`

Use **LAN mode** (the Expo default). Tunnel mode cannot reach a local backend.

### Windows Firewall

Windows usually asks for permission the first time the backend starts. Allow
Node.js on private networks. If the phone cannot connect, check inbound rules
for "Node.js JavaScript Runtime" in Windows Defender Firewall.

---

## API Overview

Base URL: `http://<computer-ip>:5000/api`

| Method | Endpoint                  | Description                        | Auth |
| ------ | ------------------------- | ---------------------------------- | ---- |
| GET    | `/health`                 | API and MongoDB status             | No   |
| POST   | `/auth/register`          | Create an account and receive JWT  | No   |
| POST   | `/auth/login`             | Log in and receive JWT             | No   |
| GET    | `/auth/me`                | Fetch the logged-in user           | Yes  |
| PATCH  | `/auth/active-role`       | Switch Buyer/Seller mode           | Yes  |
| POST   | `/auth/accept-terms`      | Accept the current terms version    | Yes  |
| POST   | `/businesses`             | Create the user's business profile | Yes  |
| GET    | `/businesses/me`          | Fetch the user's own profile       | Yes  |
| GET    | `/businesses/:id`         | View a profile (public subset)     | Yes  |
| PATCH  | `/businesses/:id`         | Update the user's own profile      | Yes  |
| POST   | `/businesses/:id/logo`    | Upload a business logo             | Yes  |
| POST   | `/businesses/:id/portfolio` | Add a portfolio item             | Yes  |
| DELETE | `/businesses/:id/portfolio/:itemId` | Remove a portfolio item  | Yes  |
| POST   | `/businesses/:id/documents` | Upload a private verification doc | Yes |
| GET    | `/businesses/:id/documents/:documentId` | Download an owned verification doc | Yes |
| DELETE | `/businesses/:id/documents/:documentId` | Remove a verification doc | Yes |
| POST   | `/businesses/:id/verification` | Submit documents for review  | Yes  |
| POST   | `/requirements`           | Post a requirement (buyer only)    | Yes  |
| GET    | `/requirements`           | Browse open requirements (paged)   | Yes  |
| GET    | `/requirements/my`        | List the user's own requirements   | Yes  |
| GET    | `/requirements/:id`       | Fetch one requirement              | Yes  |
| PATCH  | `/requirements/:id`       | Update an open requirement         | Yes  |
| PATCH  | `/requirements/:id/close` | Close an open requirement          | Yes  |
| POST   | `/requirements/:id/repost` | Start a new round from a finished requirement | Yes |
| POST   | `/quotations`             | Send a quotation (seller only)     | Yes  |
| GET    | `/quotations/my`          | List the seller's quotations       | Yes  |
| GET    | `/quotations/requirement/:requirementId` | Compare a requirement's quotations | Yes |
| GET    | `/quotations/:id`         | Fetch one quotation                | Yes  |
| PATCH  | `/quotations/:id`         | Edit a pending quotation           | Yes  |
| PATCH  | `/quotations/:id/withdraw` | Withdraw a pending quotation      | Yes  |
| PATCH  | `/quotations/:id/accept`  | Accept a quotation (buyer only)    | Yes  |
| PATCH  | `/quotations/:id/reject`  | Reject a quotation (buyer only)    | Yes  |
| GET    | `/conversations`          | List the user's conversations      | Yes  |
| POST   | `/conversations`          | Open or reuse a quote conversation | Yes  |
| GET    | `/conversations/:id/messages` | Fetch a thread and mark it read | Yes  |
| POST   | `/conversations/:id/messages` | Send a text message             | Yes  |
| GET    | `/orders/my`              | List the user's buyer/seller orders | Yes |
| POST   | `/orders`                 | Get or create an accepted-quote order | Yes |
| GET    | `/orders/:id`             | Fetch one order                    | Yes  |
| PATCH  | `/orders/:id/status`      | Update fulfilment status           | Yes  |
| PATCH  | `/orders/:id/shipment`    | Correct shipment details in transit | Yes |
| GET    | `/reviews/business/:businessId` | List business reviews and rating summary | Yes |
| GET    | `/reviews/order/:orderId` | Check whether the user can review a delivered order | Yes |
| POST   | `/reviews`                | Submit one rating/review for a delivered order | Yes |
| GET    | `/notifications`          | List notifications (paged, optional unread filter) | Yes |
| GET    | `/notifications/unread-count` | Fetch the unread notification count | Yes |
| PATCH  | `/notifications/:id/read` | Mark one owned notification as read | Yes |
| PATCH  | `/notifications/read-all` | Mark all owned notifications as read | Yes |
| WS     | `/realtime?token=<JWT>`   | Authenticated notification and message events | Yes |
| GET    | `/wallet`                 | Wallet balances and recent ledger  | Yes |
| POST   | `/wallet/top-up`          | Add sandbox funds                  | Yes  |
| GET    | `/procurement/policy`     | Current procurement terms and policy | No |

`POST /requirements` and `PATCH /requirements/:id` accept either JSON or
multipart form data. Send photos in an `images` field (up to 3 files). In the
app, each photo is wrapped in an `expo-file-system` `File` before it is appended
to `FormData`, because Expo SDK 58's fetch does not accept the older React
Native `{ uri, name, type }` file format.

`GET /requirements` accepts `page`, `limit` (maximum 20), `search`, and
`category` query parameters. It returns a `pagination` object with the current
page, total results, total pages, and `hasNextPage`.

`GET /quotations/my` accepts an optional `requirementId` filter. The buyer's
requirement detail response includes `quotationCount` for the owner only.
`GET /quotations/requirement/:requirementId` returns `{ data, requirement }` and
is limited to the requirement owner.

`POST /conversations` accepts `{ quotationId }` and is idempotent, so the buyer
and seller always share one thread per quotation. Empty threads stay hidden until
the first message. `GET /conversations/:id/messages` returns the latest 100
messages in chronological order, clears the current user's unread count, and
returns the new `unreadTotal`. Outgoing messages include `isRead`, which becomes
true after the other participant opens the thread. Messages are text-only and
limited to 2000 characters.

`POST /orders` accepts `{ quotationId }` and is idempotent. Accepting a quotation
automatically creates exactly one confirmed order; this endpoint retrieves it.
`GET /orders/my` accepts an optional `status` filter. Orders snapshot the agreed
product, quantity, unit price, taxable value, GST split, grand total, EMD, both
terms acceptances, buyer reference, structured delivery address, and both
business profiles, so later quotation or profile edits cannot change an existing
order.

Quotation acceptance requires `termsAccepted: true`, the current
`termsVersion`, and an optional `buyerReference`. New quotations require the same
seller consent, and sellers must add a GSTIN when the quote charges GST.
`PATCH /orders/:id/status` enforces role-specific fulfilment transitions:
sellers can start processing and dispatch with courier/tracking details; only the
buyer can confirm delivery with recipient details. `PATCH /orders/:id/shipment`
lets the seller correct shipment details while the order is shipped. Cancelling
accepts a role-appropriate reason and note. Reposting is available to the
requirement owner for `cancelled`, `closed`, or `expired` requirements and
creates a new round without changing prior quotations or orders.

Business verification documents use multipart uploads with a `type` field of
`pan`, `gst`, `registration`, or `address`; files are PDF/image up to 8 MB and
are stored outside the public `uploads/` tree. Only the owner can download them.
Submitting verification moves the profile to `pending` until an operator reviews
it with the CLI.

`GET /reviews/business/:businessId` accepts `role=buyer|seller|all` (default
`all`), returns up to 30 newest reviews, and includes overall plus per-role rating
summaries. `GET /reviews/order/:orderId` returns `canReview`, `myReview`,
`revieweeRole`, and `orderStatus` for the order's two participants.
`POST /reviews` accepts `{ orderId, rating, comment }`; `rating` is an integer
from 1 to 5 and `comment` is optional up to 500 characters. Reviews require a
delivered order, cannot target unrelated businesses, and each participant can
review that order once.

`GET /notifications` returns the signed-in user's notifications newest first.
It accepts `page`, `limit` (maximum 50), and `unread=true`; the response includes
`unreadCount` and pagination. `PATCH /notifications/:id/read` and
`PATCH /notifications/read-all` are idempotent and only affect the current user's
records. A missing or unrelated notification returns `404`.

The realtime endpoint is `/api/realtime?token=<JWT>` on the same host and port as
the API. The token is sent in the query string because browser WebSocket clients
cannot set an `Authorization` header; use `wss://` in production. Each user may
hold up to 5 connections. The server sends `ping` every 30 seconds, caps frames at
8 KB, and closes with `4001` (invalid/expired token), `4003` (inactive user), or
`4008` (too many connections). Event payloads are:

- `{ type: "connected" }`
- `{ type: "notification", data: {...}, unreadCount }`
- `{ type: "message", data: { conversationId, messageId, senderId, body, createdAt }, unreadTotal }`
- `{ type: "pong" }` in response to client pings

Notification records are the source of truth; WebSocket delivery is best-effort.
The app reconnects with exponential backoff, refreshes unread counts when the
socket opens, and keeps polling fallbacks for missed events.

Protected requests send:

```text
Authorization: Bearer <token>
```

Responses use `{ success, message, ... }`. Password hashes are never returned.
Other users only receive safe business fields; legal name, PAN, GSTIN, full
address, verification documents, and hidden contact details stay owner-only.

Requirement notes are private to the buyer. Other users never receive them.
Uploaded photos are served from `http://<computer-ip>:5000/uploads/...`.

API responses include `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive
Content-Security-Policy, and `Cache-Control: no-store`. HSTS is added when the
request is HTTPS. `X-Powered-By` is disabled. The API accepts JSON bodies up to
1 MB by default, limits requests to 3,000 per 15 minutes per IP, and limits failed
login/registration attempts to 20 per 15 minutes per IP and email. Production
errors are sanitized, and upload content is checked against real JPEG, PNG, WebP,
and PDF signatures instead of trusting the declared MIME type.

Push/OS notifications, an admin web UI, disputes/returns, and marketplace
analytics remain future work. In-app notifications and real-time updates are
implemented.

---

## Authentication Rules

- A user can register as a buyer, a seller, or both.
- One login works for both modes; `activeRole` decides which experience appears.
- Roles are validated on the backend; the app cannot grant itself a new role.
- Passwords are hashed with bcryptjs and limited to 72 characters.
- JWTs expire after the configured duration (default 7 days).
- Native sessions store the JWT in `expo-secure-store`; web uses AsyncStorage.
  Existing AsyncStorage tokens migrate to SecureStore on the next session restore.
  The cached user profile remains in AsyncStorage.

---

## Business Profile Rules

- Each user can have one business profile, used in both modes.
- Company name, business type, contact person, phone, email, address, city,
  state, PIN code, and at least one product category are required.
- Description, GSTIN, logo, website, year established, legal name, PAN, and
  registration number are optional. A GSTIN is required before the seller can
  send a quotation that charges GST.
- Only the owner can update a profile; ownership comes from the JWT, not from
  the app. Public profiles show categories, portfolio, verification status, and
  contact details only when `showContactOnProfile` is enabled.
- New profiles start as **Unverified**. Entering a GSTIN does not verify the
  business, and the app cannot set the verification status. Owners upload PAN,
  GST, registration, and address documents, then submit for review.
- The owner can upload a logo and up to 6 portfolio items. Logos and portfolio
  images are public; verification documents are private and owner-only.
- Validation is enforced on both the app and the backend.

---

## Buyer Requirement Rules

- Posting requires the buyer role and an existing business profile.
- Required details: product name, category, quantity, unit, specifications,
  delivery location, and delivery date. Budget, customization, notes, and photos
  are optional.
- Optional structured delivery details include contact name, phone, address,
  city, state, PIN code, and instructions. They are snapshotted into an order at
  acceptance; sellers only see city and state before that.
- Up to 3 photos are allowed (JPG, PNG, or WebP, maximum 5 MB each). They are
  stored in `supplybridge-backend/uploads/` during development.
- Buyers select an **EMD rate** of 2–5% when posting. It defaults to 2% and is
  locked once the first quotation arrives.
- Requirements start as **Open**. Buyers can edit or close their own open
  requirements.
- Lifecycle statuses are **Open**, **Awarded** (an accepted quotation has an
  active order), **Fulfilled** (order delivered), **Cancelled** (order
  cancelled), **Closed** (buyer closed before award), and **Expired**.
- When the delivery date passes, a requirement automatically becomes
  **Expired** the next time requirements or quotations are read. Finished
  requirements cannot be edited.
- Other users can view only open requirements; owners can view every status.
  Private buyer notes are never shared.
- A **Cancelled**, **Closed**, or **Expired** requirement can be reposted as a
  new round. The new round copies the product details and photos but starts with
  fresh quotations, EMD, orders, and a new delivery date. Fulfilled and awarded
  requirements cannot be reposted.
- The open-requirements feed supports pagination, text search, and category
  filtering.

---

## Seller Discovery Rules

- Sellers browse only open requirements whose delivery date has not passed.
- Search matches product names, subcategories, and specifications. Category
  filters use the same fixed category list as business profiles.
- Results load newest first, 10 at a time, with pull-to-refresh and automatic
  loading of the next page near the end of the list.
- Search is debounced in the app, and changing a search term or category resets
  the feed to page 1.
- Sellers see the same public requirement detail as other users: buyer business
  summary, specifications, quantity, budget, delivery details, and photos.
  Private buyer notes are never included.
- Sellers can send a quotation from an open requirement. A completed business
  profile is required first.

---

## Quotation Rules

- Quoting requires the seller role, a completed business profile, and enough
  sandbox wallet balance for the EMD. Buyers cannot quote their own requirements.
- Sellers choose a GST rate of **0/5/12/18/28%** and an **exclusive** or
  **inclusive** pricing mode. The backend calculates taxable value, CGST/SGST or
  IGST, and the grand total. GST split is intra-state when the buyer's and
  seller's states match; otherwise IGST applies.
- A GSTIN is required on the seller's business profile whenever the quote
  charges GST.
- New quotations require acceptance of terms version **`procurement-v2`**. The
  app blocks sending until the seller ticks the terms box.
- The seller's EMD is **2–5% of the quoted taxable value** (excluding GST). It is
  reserved from the wallet when the quotation is sent and adjusted when the
  quotation price changes.
- Sellers choose a **full**, **partial**, or **modified** offer:
  - Full offers automatically use the exact requested quantity.
  - Partial offers must be less than the requested quantity.
  - Modified offers may change the quantity up to the requested amount.
- Unit price is per unit and must be greater than zero. The backend calculates
  and rounds the total price; the app preview is for convenience only.
- The seller delivery date cannot be in the past or later than the buyer's
  required delivery date.
- A seller can send only one quotation per requirement, even after withdrawing
  it. Withdrawal is final, and attempting to quote again returns `409`.
- Sellers can edit or withdraw a pending quotation while the requirement is
  open. Accepted, rejected, withdrawn, and expired quotations are read-only.
- Only the requirement owner can list and compare quotations. Withdrawn
  quotations are excluded from the buyer's comparison list and response count.
- The requirement owner can accept or reject a pending quotation. Accepting
  requires the current terms consent and records an optional buyer reference.
  It awards the requirement, marks its EMD captured (still held), releases every
  other pending quote's EMD, and creates one confirmed order. Rejecting one
  releases its EMD and leaves the requirement open.
- Closing a requirement manually rejects its pending quotations and releases
  their EMD. Lazy expiry marks pending quotations as expired and releases their
  EMD when the delivery date passes.
- Withdrawing a quotation releases its EMD.
- Sellers track their offers and statuses in the **My Quotes** tab.

---

## Communication Rules

- Each conversation is private to the requirement buyer and the seller behind
  one quotation. Both participants open the same thread from either side.
- A new thread can be started while the quotation is pending or accepted.
  Existing threads remain accessible after rejection, withdrawal, or expiry.
- Threads with no messages stay hidden from the conversation list. The list
  appears after the first message and is ordered by latest activity.
- Opening a thread clears that participant's unread count; the list shows
  per-conversation unread counts, a total, and a badge on the Messages tab.
- Outgoing messages show **Sent** until the other participant opens the thread,
  then **Read**. Read state is based on the recipient's latest thread-read time.
- Messages are plain text, trimmed before saving, and limited to 2000
  characters. Attachments are not supported yet.
- Messages use authenticated realtime events when the socket is connected. The
  open thread and tab badge still poll (15 seconds and 30 seconds) and refresh on
  focus, app resume, and pull-to-refresh as fallbacks.
- Incoming message events update the Messages tab badge immediately. The
  notification center and bells show persistent activity badges for quotations,
  orders, reviews, and verification decisions.
- Buyers and sellers both have a **Messages** tab. Pending and accepted
  quotation details also show a **Message seller/buyer** action.

---

## Order Rules

- Accepting a quotation creates exactly one order, idempotently, from the
  accepted quotation. The order number uses the `SB-YYYYMMDD-XXXXXX` format.
- An order snapshots the requirement product/category, agreed quantity and unit,
  unit price, taxable value, GST split and grand total, EMD amount, both terms
  acceptances, buyer reference, structured delivery address, and the buyer and
  seller business profiles. Later changes to quotations or profiles do not
  rewrite it.
- Order statuses are **Confirmed**, **Processing**, **Shipped**, **Delivered**,
  and **Cancelled**.
- Sellers move a confirmed order to processing. Only sellers can dispatch an
  order, and dispatch requires courier name, tracking number, dispatch date, and
  optional tracking URL, package count, and note. While shipped, the seller can
  correct those shipment details.
- Only the buyer can confirm delivery, and confirmation requires a recipient
  name plus optional note and condition flag. Sellers cannot mark an order
  delivered.
- Buyers and sellers can cancel while the order is confirmed or processing.
  Once shipped, the order can no longer be cancelled; it must go through
  delivery.
- Cancelling requires a role-appropriate reason. Acceptance captures the EMD
  while keeping it held; delivery releases the captured hold. Buyer cancellation
  releases it, while seller cancellation is treated as seller fault and forfeits
  it to the buyer. Cancellation is final and EMD settlement is idempotent.
- Delivered and cancelled orders are final. Invalid role/status changes are
  rejected by the backend, not just hidden in the app.
- Only the order's buyer and seller can list or open it. Other users receive
  `404`.
- Every status change is appended to the order timeline with the actor and time.
- There is no real payment gateway, invoice file, dispute, or returns flow yet.
  Payment and invoicing are handled directly between businesses; the EMD wallet
  is a sandbox balance only.
- Buyers and sellers both have an **Orders** tab. Accepted quotation details also
  show a **View order** action.
- The Orders tab explains the flow with a collapsible **How orders work** guide,
  supports an **Active** filter and tappable summary cards, and shows each card's
  current stage plus its next step.
- Order detail shows a four-step progress tracker and a role-specific next-step
  card. Seller fulfilment actions sit inside that card, while cancellation is
  separated with a role-aware explanation.
- A shipment card shows courier, tracking, dispatch date, package count, and
  note, with track and seller-correction actions. The buyer receives a delivery
  prompt once the order is shipped.
- Order detail also shows the structured ship-to snapshot, buyer reference, both
  business identities, a public business-profile link, and the recorded terms
  versions and acceptance times.
- Status history uses milestone icons, actor roles, actual notes when provided,
  and timestamps.
- Order status and shipment changes create persistent notifications for the
  counterparty and refresh open order screens through realtime events. There is
  no OS push notification.

---

## Rating and Review Rules

- Only the buyer and seller on a **delivered** order can review each other, and
  each participant can submit one review per order. The counterparty is derived
  from the order, so a user cannot review an unrelated business.
- Reviews use an integer rating from 1 to 5 and an optional comment up to 500
  characters. The reviewer and target are stored as business identities.
- A review records the reviewer role and reviewee role, so buyer and seller
  reputation stay separate. Public profiles show an overall rating with buyer
  and seller breakdowns.
- Business rating summaries include the average and count for each role. The
  `Review` collection is the source of truth, while `Business` stores cached
  summary values for fast listing/detail responses; the cache is refreshed after
  each new review.
- Requirement cards and details show the buyer's rating, or **New buyer** when
  there are no reviews yet. Requirement detail also shows up to three recent
  buyer reviews with a link to the full public profile.
- Order detail shows the counterpart's rating and a review prompt after delivery.
  A submitted review appears on the order and in the business review list.
- Reviews cannot be edited or deleted yet, and the review list is capped at 30
  newest entries with no pagination.

---

## Notification and Real-time Rules

- Notifications are stored per user and remain available across sessions and
  devices. The app shows unread badges on both role home screens, the Profile
  screen, and a dedicated notification center with **All** and **Unread** filters.
- Notification types cover quotation received/updated/withdrawn/accepted/rejected,
  order created/status updated, review received, and business verification
  approved/rejected. Messages use realtime events and the existing conversation
  unread badge instead of creating a notification for every chat message.
- Opening a notification marks it read and deep-links to its quotation, order,
  requirement, conversation, or business verification screen. Marking one or all
  notifications read is idempotent.
- The backend creates notifications for quotation lifecycle changes, requirement
  closure, order status and shipment updates, delivered-order reviews, and the
  verification operator CLI. Notification creation never blocks the underlying
  marketplace action.
- `/api/realtime` uses JWT authentication, a per-user connection registry, a
  30-second heartbeat, an 8 KB frame limit, and automatic close on token expiry.
  Close codes are `4001` invalid/expired token, `4003` inactive user, and `4008`
  too many connections.
- The app reconnects with exponential backoff, refreshes unread counts on open,
  and signs the user out on `4001`/`4003`. It falls back to notification polling
  every 60 seconds, while existing message polling remains at 30 seconds for the
  badge and 15 seconds for an open thread.
- The JWT is passed in the WebSocket query string because browser clients cannot
  set custom headers during the handshake. Use `wss://` in production, allow
  WebSocket upgrades at the proxy, and avoid logging full realtime URLs.
- Notifications are in-app only. OS push notifications and a notification
  preferences screen are not implemented.

---

## Procurement Safeguards (EMD, GST, Terms)

- Every seller has one sandbox EMD wallet tied to their business profile. The
  wallet shows **available** and **held** balances, recent ledger entries, and a
  demo-only **Add funds** action. It is not connected to a payment gateway or
  real money.
- Quotations reserve EMD from available balance. Editing a quote adjusts the
  hold; withdrawing, rejection, and expiry release it. Acceptance captures it
  (marked captured, still held), and delivery or buyer cancellation releases the
  captured hold. Seller-fault cancellation forfeits it and credits the buyer's
  wallet. The ledger is append-only and settlement calls use idempotency keys so
  retries cannot double-charge or double-credit.
- EMD is calculated on taxable value and never includes GST. GST is snapshotted
  on the quotation and order; the backend is authoritative for splits and totals.
  The GSTIN is required only when the quote charges GST.
- Terms version **`procurement-v2`** is stored on quotations and orders. The
  policy endpoint is public, the app deep-links relevant sections, and both
  sellers (before quoting) and buyers (before accepting) must accept the current
  version. Signed-in users with an older version see an acceptance banner on the
  Profile screen and can accept via `POST /auth/accept-terms`.
- Reposting a cancelled, closed, or expired requirement creates a new round with
  fresh quotations, EMD holds, and orders. Prior rounds stay immutable for
  history; awarded and fulfilled requirements are not repostable.
- Existing local data was migrated with
  `npm run migrate:procurement:apply`. The migration is idempotent and can be
  re-run; it also runs a dry run via `npm run migrate:procurement`.
- Out of scope: real payments, GST filing/invoice documents, TCS/TDS, GeM
  thresholds, and MSE/Udyam exemptions.

---

## Useful Commands

Backend (`supplybridge-backend`):

| Command                               | Purpose                              |
| ------------------------------------- | ------------------------------------ |
| `npm run dev`                         | Start with automatic restart on save |
| `npm start`                           | Start once                           |
| `npm run migrate:procurement`         | Preview legacy tax/EMD migration     |
| `npm run migrate:procurement:apply`   | Apply the legacy migration           |
| `npm run review:business -- --list`   | List businesses awaiting verification |
| `npm run review:business -- --approve <businessId>` | Approve a business |
| `npm run review:business -- --reject <businessId> --note "Reason"` | Reject a business |

Mobile app (`supplybridge-app`):

| Command            | Purpose                        |
| ------------------ | ------------------------------ |
| `npx expo start -c`| Start Expo with a clear cache  |
| `npx expo-doctor`  | Check dependency health        |
| `npx expo export --platform android --output-dir dist` | Verify the production bundle |

---

## Architectural Decisions (Short Version)

1. **Separate frontend and backend projects.** Screens never query MongoDB
   directly; they call the REST API.
2. **One unified app for buyers and sellers.** `roles` stores every role a user
   has, and `activeRole` decides which navigator is shown.
3. **JWT sessions with server-side user lookup.** The backend loads the user
   from the token on every protected request instead of trusting a user ID sent
   by the app.
4. **Roles are authorization, active mode is UI state.** A buyer-only account
   cannot switch to seller mode even if the app is modified.
5. **React Navigation** with separate buyer and seller bottom-tab navigators
   under a shared root navigator.
6. **Built-in `fetch` with one small wrapper.** All screens go through
   `src/services/api.js`.
7. **The server does not start until MongoDB connects**, so database problems
   are immediately visible.
8. **`node --watch` instead of nodemon.** Node.js already provides automatic
   restarts, so no extra dependency is needed.
9. **Business verification is server-controlled.** The profile update endpoint
   ignores `verificationStatus`, so a user cannot mark their own business as
   verified.
10. **Shared screens sit above the role tabs.** A small root stack hosts the
    business profile, requirement, and quotation screens.
11. **Photos are stored on the backend during development.** Multer saves up to
    3 images per requirement to `uploads/`, and Express serves them statically.
    The app wraps picked photos in `expo-file-system` `File` objects so Expo's
    fetch can build the multipart request. A cloud storage service can replace
    local storage later without changing the app screens.
12. **Requirement expiry is lazy, not scheduled.** Before reading requirements
    or quotations, the backend marks past-due open requirements as expired and
    expires their pending quotations. This avoids running a separate background
    job for a small project.
13. **Template files are preserved.** The Expo template's own files stay
    untouched; new code is JavaScript/JSX. The template-generated `AGENTS.md`
    suggests Expo Router, but this project's specification requires React
    Navigation.
14. **Seller discovery is server-driven.** Pagination, search, and category
    filtering happen in the API. The app debounces search, resets to page 1 when
    filters change, ignores stale responses, and de-duplicates appended pages.
15. **Quotation pricing is authoritative on the server.** The app previews the
    total, but the backend recalculates and stores it. A unique compound index on
    requirement and seller prevents duplicate offers, including after withdrawal.
16. **Comparison is private to the requirement owner.** Quotation detail is
    limited to the seller and buyer; other users receive a 404. Withdrawn offers
    are omitted from the buyer's comparison list and count.
17. **Conversations are quotation-scoped and participant-only.** A unique index
    gives each quotation one thread shared by its buyer and seller. The API
    filters lists and enforces access by participant ID, hides empty threads, and
    stores unread counters on the conversation itself. Read receipts are derived
    from each participant's last-read timestamp, and lightweight polling keeps
    badges current without adding a real-time service.
18. **Orders are immutable snapshots with server-owned transitions.** A unique
    quotation ID gives each accepted quotation one order. The API controls which
    role can move which status, records every change in a timeline, and limits
    reads to the two participants. No payment gateway or document workflow is
    implied by an order.
19. **EMD is a server-owned sandbox ledger.** Balances are derived from an
    append-only wallet transaction collection, not from a client-supplied
    number. Idempotency keys plus conditional wallet updates prevent duplicate
    holds, releases, captures, and forfeitures without assuming MongoDB
    transactions.
20. **Procurement terms and tax are versioned snapshots.** Quotations store GST
    mode/rate, taxable value, grand total, EMD, and `procurement-v2` acceptance;
    orders copy those values plus the buyer acceptance and reference once. This
    keeps old records stable if policy or product prices change later.
21. **Repost creates a new round instead of reopening history.** The old
    requirement, quotes, and orders remain untouched, while the new round gets a
    fresh delivery date, quotations, and EMD lifecycle.
22. **Shipment and delivery are separate role-owned records.** Seller dispatch
    captures courier data, buyer confirmation captures receipt data, and only
    the buyer can close the order. The timeline stores actor roles and actual
    notes instead of relying on UI-only labels.
23. **Verification documents live outside public uploads.** Public logos and
    portfolio images are served by Express, while PAN/GST/registration/address
    proofs are owner-download-only and reviewed by an operator CLI. No admin web
    UI is implied.
24. **Business identity is public, contact data is opt-in.** Public profiles
    expose company identity, verification status, categories, portfolio, and
    website; phone, email, and contact person appear only when the owner enables
    `showContactOnProfile`.
25. **Reviews are delivered-order proof of work.** A unique order/reviewer index
    enforces one review per participant, role-specific summaries keep buyer and
    seller reputation separate, and cached Business totals are refreshed from the
    Review collection after each submission.
26. **Security is enforced at the API edge and in the session store.** Headers,
    CORS, body limits, rate limits, error sanitization, upload signature checks,
    and production secret validation are centralized on the backend. The app keeps
    only the JWT in native SecureStore, while the non-sensitive cached user profile
    stays in AsyncStorage.
27. **Notifications are persistent and realtime is authenticated.** The REST API
    and MongoDB are the source of truth; WebSocket delivery is a best-effort
    accelerator. The same HTTP server hosts `/api/realtime`, each user has a
    bounded connection registry, and token expiry closes sockets. The app uses
    React Native's built-in WebSocket client and polling fallbacks, so no extra
    mobile dependency is required.

---

## Troubleshooting

| Problem | Likely cause and fix |
| ------- | -------------------- |
| App shows "Cannot reach the server" | Backend terminal is not running (`npm run dev`), phone is on another network, or firewall is blocking Node.js |
| Login says invalid email or password | Check the exact registered email; passwords are case-sensitive |
| Backend exits with "Failed to start the server" | MongoDB is not running or `MONGODB_URI` is wrong |
| `EADDRINUSE` on port 5000 | Another process is using port 5000. Stop it or change `PORT` in `.env` |
| App shows old screens after an update | Stop Expo and run `npx expo start -c`, then reload Expo Go |
| API returns `429 Too Many Requests` | Wait for the rate-limit window to reset, or adjust `RATE_LIMIT_MAX` / `AUTH_FAILURE_LIMIT` in development |
| API returns `413 Request body is too large` | Reduce the JSON payload or raise `JSON_BODY_LIMIT` for a trusted deployment |
| Backend exits with a JWT secret error | In production use a random secret of at least 32 bytes, not the `.env.example` placeholder |
| Browser client is blocked by CORS | Set `CORS_ORIGINS` to the allowed browser origins in production |
| Upload is rejected as not matching its declared type | The file must contain a real JPEG, PNG, WebP, or PDF signature, not only a renamed extension |
| `EXPO_PUBLIC_API_URL` is ignored | Restart Metro with `npx expo start -c`; Expo embeds `EXPO_PUBLIC_*` values at bundle time |
| Native session does not persist | Confirm `expo-secure-store` is installed and the app was rebuilt or reloaded after installing it |
| Photo upload is rejected | Use JPG, PNG, or WebP under 5 MB, with at most 3 photos |
| "Unsupported FormDataPart implementation" when posting | `expo-file-system` is missing or out of date. Run `npx expo install expo-file-system`, restart Expo with `npx expo start -c`, and reload the app |
| A saved photo does not appear | The backend must be running; photos load from the same LAN address as the API |
| Expo QR works but API fails after Wi-Fi change | The app auto-detects the host; restart Expo so it picks up the new IP |
| Quotation, conversation, or order screens return 404 | The backend on port 5000 is running old code. Restart it (`npm run dev` or `npm start`) |
| Cannot quote the same requirement again after withdrawing | This is intentional: one quotation is allowed per seller per requirement |
| Message action is missing on a quotation | New conversations require a pending or accepted quotation; rejected, withdrawn, and expired threads are available from the Messages tab only if they already had messages |
| Orders tab is empty after accepting a quotation | Pull to refresh or reopen the Orders tab. If the backend predates Phase 8, restart it so the acceptance creates the order |
| An order status button is missing | The backend returns role-specific allowed transitions. Sellers dispatch, only buyers confirm delivery, and delivered/cancelled orders are final |
| Shipping is rejected | Add courier name, tracking number, dispatch date, and package count before dispatching |
| Buyer cannot confirm delivery | Delivery is only available after the seller dispatches the order, and requires a recipient name |
| Review prompt is missing | Reviews unlock only when the order is delivered; pull to refresh the order detail after reopening the app |
| Cannot submit a second review | Each participant can review a delivered order once. The existing review is shown on the order |
| Business rating still shows zero | Pull to refresh the profile or requirement. If the backend predates Phase 12, restart it so review routes and rating caches are loaded |
| Business verification is locked | Documents and submission are locked while status is `pending`; an operator must approve or reject it with `npm run review:business` |
| Verification document download fails | Only the owning business can download private documents; public users cannot access them |
| Public business contact details are missing | The owner has hidden contact details with `showContactOnProfile` |
| "Insufficient EMD balance" when quoting | Top up the sandbox wallet from **Profile → EMD Wallet**, then return to the quote form |
| "GSTIN is required" when quoting | Add the seller GSTIN in the business profile, or set the GST rate to 0% |
| Wallet, policy, or business endpoints return 404 | Restart the backend so the current routes are loaded |
| Old quotations or orders show ₹0 taxable value or no EMD | Run `npm run migrate:procurement:apply` and restart the backend. Use the dry run first to review changes |
| An EMD hold looks stale after editing a quotation | Reopen the wallet to refresh; holds adjust on each quote edit and are released on withdrawal/rejection/expiry |
| Quote form warns about the wallet before a profile exists | Complete the seller business profile first, then reopen the quote form. The wallet is created on first top-up |
| Notification bell stays empty after an action | Confirm the backend is running current code and the app has a valid session. The notification list and unread count refresh on screen focus; pull to refresh the list |
| Realtime events do not arrive | Check that the proxy allows WebSocket upgrades on `/api/realtime` and use `wss://` behind TLS. The app still polls every 60 seconds as a fallback |
| WebSocket repeatedly disconnects | `4001`/`4003` close codes require signing in again; `4008` means the 5-connection-per-user limit was reached. Close other sessions and retry |
| Notification deep link shows a missing record | The related quotation, order, requirement, conversation, or business may have been removed, or the current user no longer has access |
