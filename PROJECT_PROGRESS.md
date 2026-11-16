# SupplyBridge — Project Progress

Last updated: 2026-11-16

---

## Phase 1 — Project Foundation (COMPLETE)

### Completed

- Initialized a Git repository at the workspace root.
- Created the Express backend and connected it to local MongoDB.
- Added a health-check endpoint.
- Created the Expo app from the JavaScript blank template.
- Added automatic API host detection using the Expo development server host.
- Verified Metro bundling and all Expo Doctor checks.

### Tested

- MongoDB connects on backend start.
- `GET /api/health` works on `localhost` and the LAN IP.
- Unknown routes return JSON 404 responses.
- Expo export (Android) bundles successfully.

---

## Phase 2 — Authentication and Roles (COMPLETE)

### Completed

- Added the `User` Mongoose model with validation and a unique email index.
- Added registration with name, email, phone, password, and role selection.
- Hash passwords with bcryptjs (10 rounds).
- JWT login tokens with a configurable expiry (default 7 days).
- Added `authMiddleware` to verify tokens and load the current user.
- Added `roleMiddleware` for future buyer/seller-only endpoints.
- Added endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `PATCH /api/auth/active-role`
- Kept `passwordHash` hidden with `select: false` and safe response formatting.
- Added persistent login using AsyncStorage.
- Added login and registration screens written in JSX.
- Added role selection (Buyer, Seller, Both) during registration.
- Added Buyer and Seller bottom-tab navigation shells.
- Added mode switching from the home screens and the shared profile screen.
- Added logout with confirmation.
- Added a shared theme (colours, spacing, radius) and reusable button, input,
  logo, placeholder, and role-home components.
- Removed the temporary Phase 1 connection-check screen after replacing it with
  the real authentication flow.

### Created Files

Backend:

- `src/models/User.js`
- `src/modules/auth/auth.routes.js`
- `src/modules/auth/auth.controller.js`
- `src/middleware/authMiddleware.js`
- `src/middleware/roleMiddleware.js`
- `src/utils/generateToken.js`

Backend files modified:

- `src/app.js` (mounts `/api/auth`)
- `src/server.js` (requires `JWT_SECRET` at startup)
- `.env` and `.env.example` (JWT settings)

Frontend:

- `src/constants/theme.js`
- `src/context/AuthContext.js`
- `src/services/authService.js`
- `src/components/common/AppButton.jsx`
- `src/components/common/AppInput.jsx`
- `src/components/common/BrandLogo.jsx`
- `src/components/common/PlaceholderScreen.jsx`
- `src/components/home/RoleHomeLayout.jsx`
- `src/navigation/RootNavigator.jsx`
- `src/navigation/AuthNavigator.jsx`
- `src/navigation/BuyerNavigator.jsx`
- `src/navigation/SellerNavigator.jsx`
- `src/screens/auth/LoginScreen.jsx`
- `src/screens/auth/RegisterScreen.jsx`
- `src/screens/buyer/BuyerHomeScreen.jsx`
- `src/screens/seller/SellerHomeScreen.jsx`
- `src/screens/profile/ProfileScreen.jsx`

Frontend files modified:

- `App.js` (AuthProvider + RootNavigator)
- `src/constants/config.js` (automatically detects the development host)
- `src/services/api.js` (token support and error status codes)
- `app.json` (Expo font plugin added by Expo)
- Removed `src/screens/BackendCheckScreen.jsx`

### Installed Dependencies (Phase 2)

Backend:

- `bcryptjs@3.0.3`
- `jsonwebtoken@9.0.3`

Frontend:

- `@react-navigation/native@7.5.1`
- `@react-navigation/native-stack@7.21.0`
- `@react-navigation/bottom-tabs@7.21.0`
- `react-native-screens@4.30.1`
- `@react-native-async-storage/async-storage@2.2.0`
- `@expo/vector-icons@15.x`
- `expo-font@~58.0.12`
- `expo-constants@~58.0.16`

Nodemon was intentionally removed. The backend uses Node's built-in
`node --watch` instead.

### Tested

| Test | Result |
| --- | --- |
| Health check | Passed |
| Register buyer | Passed (201, token returned) |
| Register seller with both roles | Passed (201, token returned) |
| Duplicate email | Passed (409) |
| Invalid role | Passed (400) |
| Short password | Passed (400) |
| Login with wrong password | Passed (401) |
| Login with correct password | Passed (200, token returned) |
| `GET /auth/me` with token | Passed (200) |
| `GET /auth/me` without token | Passed (401) |
| `GET /auth/me` with invalid token | Passed (401) |
| Buyer-only user switches to seller | Passed (403) |
| Seller switches to seller mode | Passed (200) |
| Password hash excluded from responses | Passed |
| Test users removed from database | Passed |
| Expo export (Android) | Passed (952 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Physical phone registration | Confirmed (the user created a real account) |

### Known Issues / Notes

- The backend must be running in a separate terminal. If port 5000 is not
  listening, the app reports "Cannot reach the server". This was the cause of
  the earlier connection failure.
- The API host is detected from Expo's development server, so restart Expo
  after switching Wi-Fi networks. The fallback IP lives in
  `src/constants/config.js`.
- Use Expo LAN mode. Tunnel mode cannot reach a local backend.
- The token is stored in AsyncStorage in this early phase; Phase 13 migrates
  native tokens to SecureStore while keeping AsyncStorage for the cached profile
  and web fallback.
- Rate limiting was added in Phase 13; refresh tokens remain future work.
- The workspace is inside a OneDrive-synced folder. If Metro file watching
  becomes unreliable, move the project to a non-synced folder.
- The Expo template generated `AGENTS.md` / `CLAUDE.md`, which recommend Expo
  Router. Project requirements mandate React Navigation, so those template
  suggestions are intentionally not followed.
- No `.ts`/`.tsx` application files were created.

---

## Phase 3 — Business Profiles (COMPLETE)

### Completed

- Added the `Business` Mongoose model with all required fields and validation.
- Enforced one business profile per user with a unique `ownerId` index.
- New profiles always start as `unverified`.
- The update endpoint does not accept `verificationStatus`, so users cannot
  verify their own business. Entering a GSTIN does not change the status.
- Added endpoints:
  - `POST /api/businesses`
  - `GET /api/businesses/me`
  - `GET /api/businesses/:id`
  - `PATCH /api/businesses/:id`
- Every endpoint requires authentication.
- Ownership checks use the authenticated user from the JWT.
- Other logged-in users receive only safe public fields. Phone, email, full
  address, PIN code, contact person, and GSTIN are hidden.
- Added a business profile screen with create, view, and edit modes.
- Added loading, empty, error, and success states.
- Added a shared business types and categories constants file.
- Added a reusable choice-chip selector for business types and categories.
- Restructured navigation: a small root stack hosts the shared business profile
  screen above the buyer/seller tabs.
- Added a "Open business profile" entry point in the shared Profile tab.

### Created Files

Backend:

- `src/models/Business.js`
- `src/modules/businesses/business.routes.js`
- `src/modules/businesses/business.controller.js`
- `src/modules/businesses/business.validation.js`

Backend files modified:

- `src/app.js` (mounts `/api/businesses`)

Frontend:

- `src/constants/business.js`
- `src/services/businessService.js`
- `src/components/forms/ChoiceChips.jsx`
- `src/screens/business/BusinessProfileScreen.jsx`

Frontend files modified:

- `src/navigation/RootNavigator.jsx` (authenticated root stack)
- `src/screens/profile/ProfileScreen.jsx` (business profile entry point)

### Installed Dependencies

None. All required packages were already present.

### Tested

| Test | Result |
| --- | --- |
| Create business with valid data | Passed (201) |
| Client tries `verificationStatus: "verified"` on create | Ignored; stored as `unverified` |
| Duplicate business for same user | Passed (409) |
| `GET /businesses/me` with a profile | Passed (200) |
| `GET /businesses/:id` as owner | Full details returned |
| `GET /businesses/:id` as another user | Phone, email, GSTIN, address hidden |
| Another user tries to update the profile | Passed (403) |
| Owner updates city and PIN code | Passed (200) |
| Invalid PIN code update | Passed (400) |
| Empty update body | Passed (400) |
| Update containing only `verificationStatus` | Passed (400); status unchanged |
| Create with no categories | Passed (400) |
| Invalid business id | Passed (400) |
| Non-existent business | Passed (404) |
| Unauthenticated request | Passed (401) |
| Expo export (Android) | Passed (956 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Business profile create/edit on phone | To be confirmed by the user |

Automated test users and businesses were removed after testing. The user's real
account created on the phone was preserved.

### Known Issues / Notes

- The Profile tab card does not display the saved company name yet; it opens the
  full business screen.
- Verification review is not implemented yet. Profiles stay `unverified`
  (with `pending`, `verified`, and `rejected` reserved for a future process).
- Business profiles cannot be deleted yet; this is not part of the current
  requirements.
- The business form is long and scrollable. iOS keyboard avoidance is basic.

---

## Phase 4 — Buyer Requirements (COMPLETE)

### Completed

- Added the `Requirement` Mongoose model with buyer and business references,
  product details, quantity and unit, specifications, customization, optional
  budget range, delivery location and date, up to 3 photos, notes, and status.
- Posting requires the buyer role and an existing business profile.
- Added endpoints:
  - `POST /api/requirements` (JSON or multipart)
  - `GET /api/requirements` (open feed with pagination, search, category filter)
  - `GET /api/requirements/my`
  - `GET /api/requirements/:id`
  - `PATCH /api/requirements/:id` (JSON or multipart)
  - `PATCH /api/requirements/:id/close`
- Ownership checks for updates and closing.
- Closed requirements are hidden from other users. Private notes are visible to
  the owner only.
- Added `Open`, `Closed`, and `Expired` statuses. Past-due open requirements are
  marked expired before reads, without a background job.
- Added local image uploads with multer: JPG, PNG, or WebP, up to 3 photos and
  5 MB each. Files are cleaned up when removed from a requirement.
- Requirement photos are served statically from `/uploads/...`.
- Rebuilt the Buyer Home screen with real data: requirement counts, business
  profile prompt, recent requirements, and quick actions.
- Added the Post Requirement form with photo selection, create and edit modes,
  and client-side validation.
- Added the My Needs tab with requirement cards, pull-to-refresh, and empty,
  loading, and error states.
- Added requirement detail with edit and close actions for the owner.
- Added a root-stack entry for requirement detail and form screens.
- Added shared requirement card, status badge, formatting helpers, API service,
  and frontend requirement constants.
- Fixed photo uploads on Expo Go: Expo SDK 58's fetch rejects React Native's
  legacy `{ uri, name, type }` FormData parts ("Unsupported FormDataPart
  implementation"). Photos are now appended as `expo-file-system` `File` objects.

### Created Files

Backend:

- `src/constants/productOptions.js`
- `src/models/Requirement.js`
- `src/middleware/uploadMiddleware.js`
- `src/modules/requirements/requirement.routes.js`
- `src/modules/requirements/requirement.controller.js`
- `src/modules/requirements/requirement.validation.js`

Backend files modified:

- `src/app.js` (mounts `/api/requirements` and serves `/uploads`)
- `.gitignore` (excludes uploaded files)

Frontend:

- `src/constants/requirements.js`
- `src/services/requirementService.js`
- `src/utils/formatters.js`
- `src/components/requirements/RequirementCard.jsx`
- `src/components/requirements/RequirementStatusBadge.jsx`
- `src/screens/requirements/RequirementFormScreen.jsx`
- `src/screens/requirements/MyRequirementsScreen.jsx`
- `src/screens/requirements/RequirementDetailScreen.jsx`

Frontend files modified:

- `src/services/api.js` (FormData support)
- `src/constants/config.js` (server URL and image URL helper)
- `src/navigation/RootNavigator.jsx` (requirement screens)
- `src/navigation/BuyerNavigator.jsx` (real My Needs tab)
- `src/screens/buyer/BuyerHomeScreen.jsx` (live dashboard)

### Installed Dependencies

- Backend: `multer` ^2.5.0
- App: `expo-image-picker` ~58.0.10 (installed with `npx expo install`)
- App: `expo-file-system` ~58.0.13 (required for multipart photo uploads)

### Tested

| Test | Result |
| --- | --- |
| Buyer creates a requirement with a photo | Passed (201, photo served) |
| Seller tries to post | Passed (403) |
| Buyer without a business profile tries to post | Passed (400) |
| Validation: past date, bad category, bad unit, short specs, bad budget | Passed (400) |
| More than 3 photos | Passed (400) |
| Non-image upload | Passed (400) |
| Seller feed includes the requirement without private notes | Passed |
| Feed search and category filters | Passed |
| Invalid category filter | Passed (400) |
| Buyer lists their requirements | Passed |
| Owner sees full detail; other users see public detail | Passed |
| Non-owner update | Passed (403) |
| Owner update, including budget range checks | Passed (200/400) |
| Empty update | Passed (400) |
| Remove and replace requirement photos | Passed; removed file deleted |
| Invalid and missing requirement ids | Passed (400/404) |
| Unauthenticated feed request | Passed (401) |
| Close requirement; closed hidden from feed and other users | Passed |
| Edit or close a closed requirement | Passed (400) |
| Past-due requirement becomes expired; excluded from feed | Passed |
| Expired requirement cannot be edited or closed | Passed (400) |
| Expo export (Android, after photo-upload fix) | Passed (986 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Requirement flow on phone | Passed by the user |

The 32-check API test created 3 temporary users, their business profiles, and
requirements. All were removed afterwards, and the uploads folder was emptied of
test images. The user's real account was not touched.

### Known Issues / Notes

- Photos are stored on the local backend disk. This is suitable for development;
  production should use cloud storage.
- The delivery date is typed as `YYYY-MM-DD` in the app. A native date picker can
  be added later.
- Requirements can be closed but not deleted.
- Closed and expired requirements remain visible to their owner.
- The photo picker allows one image at a time; up to 3 can be added.
- Keyboard handling on the long requirement form is basic.

---

## Phase 5 — Seller Discovery (COMPLETE)

### Completed

- Replaced the Find Needs placeholder with a real open-requirements feed.
- Loads `GET /api/requirements` with server-side pagination (10 per page).
- Added debounced text search across product names, subcategories, and
  specifications.
- Added horizontal category filters with an All option and a clear-filters
  action.
- Added pull-to-refresh, an updating indicator, end-of-list message, and
  loading, empty, error, and no-match states.
- Added infinite scrolling with duplicate-request guards, stale-response
  protection, and de-duplicated appended pages.
- Requirement cards open the shared requirement detail screen.
- Rebuilt Seller Home with live data: open requirement count, latest three
  needs, business profile prompt, selling steps, and buyer-mode switch.
- Added a seller prompt on open requirement details explaining that quotation
  sending arrives in Phase 6 and linking to the business profile.
- Sellers still never receive the buyer's private notes or contact details.
- Removed the unused shared `RoleHomeLayout` component now that both home
  screens use their own live layouts.

### Created Files

- `src/screens/seller/FindNeedsScreen.jsx`

Frontend files modified:

- `src/screens/seller/SellerHomeScreen.jsx` (live dashboard)
- `src/navigation/SellerNavigator.jsx` (real Find Needs tab)
- `src/screens/requirements/RequirementDetailScreen.jsx` (seller quote prompt)

Frontend files removed:

- `src/components/home/RoleHomeLayout.jsx` (unused)

### Installed Dependencies

- None; the feed uses the existing requirement service.

### Tested

| Test | Result |
| --- | --- |
| Feed API pagination, search, and category filters | Passed in Phase 4 API tests |
| Expo export (Android) | Passed (986 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Seller Find Needs flow on phone | To be confirmed by the user |

### Known Issues / Notes

- Search is a case-insensitive substring match; there is no sorting control yet.
- Location, budget, and quantity filters are not implemented yet.
- Seller Home shows only the latest three open requirements; the full feed is in
  Find Needs.
- A requirement closed by its buyer disappears from the feed after a refresh.

---

## Phase 6 — Quotations (COMPLETE)

### Completed

- Added the `Quotation` Mongoose model with requirement, seller, and business
  references, offer details, status timestamps, and indexes.
- Enforced one quotation per seller per requirement with a unique compound
  index. Withdrawal is final; the same seller cannot submit another quotation
  for that requirement (`409`).
- Added full, partial, and modified offer types:
  - Full offers automatically use the requirement quantity.
  - Partial offers must be less than the requested quantity.
  - Modified offers may use up to the requested quantity.
- Calculated `totalPrice` on the server from quantity and unit price, rounded
  to 2 decimals. The app shows a preview only.
- Enforced a positive unit price, a non-past delivery date, and a seller
  delivery date no later than the buyer's required date.
- Added endpoints:
  - `POST /api/quotations`
  - `GET /api/quotations/my` (optional `requirementId` filter)
  - `GET /api/quotations/requirement/:requirementId`
  - `GET /api/quotations/:id`
  - `PATCH /api/quotations/:id`
  - `PATCH /api/quotations/:id/withdraw`
  - `PATCH /api/quotations/:id/accept`
  - `PATCH /api/quotations/:id/reject`
- Restricted quotation detail to its seller and the requirement owner. Other
  users receive `404`.
- The requirement owner's detail response now includes `quotationCount`;
  withdrawn quotations are excluded from the count and comparison list.
- Accepting a quotation closes the requirement and automatically rejects all
  other pending quotations. Rejecting a quotation leaves the requirement open.
- Manually closing a requirement rejects its pending quotations.
- Moved requirement expiry into a shared lazy-expiry utility that also marks
  pending quotations as expired.
- Added shared public business-summary helpers and reused them for quotations.
- Added the seller quotation form with create/edit modes, offer-type selection,
  quantity rules, price preview, delivery-date validation, and an optional
  message.
- Added seller **My Quotes** with live status counts, filters, pull-to-refresh,
  quote cards, and empty states.
- Added buyer **Compare quotations**, with the requirement summary, response
  and pending counts, lowest pending offer, and pending-first/lowest-total
  ordering.
- Added quotation detail with seller edit/withdraw and buyer accept/reject
  actions, confirmation alerts, status timeline, and requirement navigation.
- Added owner quotation count and compare entry on requirement detail.
- Added seller quotation summary and send action on requirement detail.
- Replaced the Phase 6 placeholder on Seller Home and My Quotes.
- Fixed Expo SDK 58 `Unsupported BodyInit type` errors by serializing quotation
  create/update payloads with `JSON.stringify` in the app service.

### Created Files

Backend:

- `src/constants/quotationOptions.js`
- `src/models/Quotation.js`
- `src/utils/businessSummary.js`
- `src/utils/requirementExpiry.js`
- `src/modules/quotations/quotation.routes.js`
- `src/modules/quotations/quotation.controller.js`
- `src/modules/quotations/quotation.validation.js`

Backend files modified:

- `src/app.js` (mounts `/api/quotations`)
- `src/modules/requirements/requirement.controller.js` (owner quote count,
  pending quote rejection on close, shared expiry helper)

Frontend:

- `src/constants/quotations.js`
- `src/services/quotationService.js`
- `src/components/quotations/QuotationStatusBadge.jsx`
- `src/components/quotations/QuotationCard.jsx`
- `src/screens/quotations/QuotationFormScreen.jsx`
- `src/screens/quotations/QuotationDetailScreen.jsx`
- `src/screens/quotations/RequirementQuotesScreen.jsx`
- `src/screens/quotations/MyQuotesScreen.jsx`

Frontend files modified:

- `src/navigation/RootNavigator.jsx` (quotation routes)
- `src/navigation/SellerNavigator.jsx` (real My Quotes tab)
- `src/screens/requirements/RequirementDetailScreen.jsx` (owner compare card,
  seller quote summary/send action)
- `src/screens/seller/SellerHomeScreen.jsx` (live quotation copy)

### Installed Dependencies

- None; all required packages were already installed.

### Tested

| Test | Result |
| --- | --- |
| Phase 6 API test suite | Passed (42/42 checks) |
| Role, owner, and visibility rules | Passed |
| Full, partial, and modified offer validation | Passed |
| Edit, withdraw, accept, reject, and auto-reject flows | Passed |
| Manual close rejects pending quotations | Passed |
| Lazy expiry expires pending quotations | Passed |
| Duplicate quotation and withdrawn re-quote | Passed (409) |
| Buyer quotation count and list exclude withdrawn | Passed |
| Test users and quotations removed | Passed |
| Expo export (Android, after Phase 6 UI) | Passed (994 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Quotation flow on a physical phone | Confirmed by the user |

The automated test used a temporary API server on port 5010 and temporary users
with the `phase6.test.` prefix. All test records were removed afterward; the
user's real account was untouched.

### Known Issues / Notes

- A seller can send only one quotation per requirement, even after withdrawing
  it. This is deliberately stricter than "one active quotation" and is enforced
  by a unique database index.
- The buyer comparison list is client-sorted (pending first, then lowest total
  for pending offers). It is not paginated because a requirement is expected to
  have a small number of bidders.
- Accepting a quotation now creates a confirmed Phase 8 order automatically; see
  the Phase 8 section below.
- Phase 10 adds EMD wallet, GST, T&C acceptance, cancellation reasons, and repost
  behavior around quotations; see the Phase 10 section below.
- There are no push or in-app notifications yet. Sellers see status changes when
  they open or refresh My Quotes.
- Quoted delivery dates are typed as `YYYY-MM-DD`; a native date picker can be
  added later.
- If quotation endpoints appear missing, restart the backend process so it loads
  the new `/api/quotations` routes.
- Seller messages are optional and limited to 1000 characters.

---

## Phase 7 — Communication (COMPLETE, PHONE TEST PENDING)

### Completed

- Added `Conversation` and `Message` Mongoose models. A conversation stores the
  requirement, quotation, buyer, seller, both business profiles, last-message
  preview, per-participant unread counters, and last-read timestamps.
- Enforced one conversation per quotation with a unique index and a fallback for
  simultaneous creation. Buyer and seller always open the same thread.
- Added endpoints:
  - `POST /api/conversations` with `{ quotationId }` (idempotent get-or-create)
  - `GET /api/conversations`
  - `GET /api/conversations/:id/messages`
  - `POST /api/conversations/:id/messages` with `{ body }`
- Limited every conversation endpoint to its buyer and seller. Unrelated users
  receive `404`.
- Allowed new conversations only for pending or accepted quotations. Existing
  threads remain accessible after a quotation is rejected, withdrawn, or
  expires.
- Hid conversations with no messages from the list until the first message.
- Ordered the conversation list by latest message, capped it at 100 threads, and
  returned `unreadTotal` alongside the list.
- Opening a thread clears the current participant's unread count and returns the
  latest 100 messages in chronological order.
- Added plain-text message validation with trimming and a 2000-character limit.
- Extracted shared requirement-summary fields/formatting into
  `utils/requirementSummary.js`, reused by quotations and conversations.
- Added the conversation service, conversation card, Messages list, and message
  thread with pull-to-refresh, send states, empty/error states, unread badges,
  and automatic scroll to the latest message.
- Added **Sent** and **Read** indicators to outgoing messages. A message becomes
  read when the other participant opens the thread; the open thread refreshes
  every 15 seconds so the sender sees the update without leaving the screen.
- Added a shared unread-total context. The Messages tab shows a badge with the
  total unread count, refreshed every 30 seconds and when the app becomes active.
- Added a **Messages** tab for both buyer and seller modes.
- Added **Message seller** / **Message buyer** actions to pending and accepted
  quotation details.

### Created Files

Backend:

- `src/constants/communicationOptions.js`
- `src/models/Conversation.js`
- `src/models/Message.js`
- `src/utils/requirementSummary.js`
- `src/modules/conversations/conversation.routes.js`
- `src/modules/conversations/conversation.controller.js`
- `src/modules/conversations/conversation.validation.js`

Backend files modified:

- `src/app.js` (mounts `/api/conversations`)
- `src/modules/quotations/quotation.controller.js` (uses shared requirement
  summary)

Frontend:

- `src/constants/messages.js`
- `src/services/conversationService.js`
- `src/components/messages/ConversationCard.jsx`
- `src/screens/messages/ConversationsScreen.jsx`
- `src/screens/messages/ConversationScreen.jsx`
- `src/context/UnreadMessagesContext.js`

Frontend files modified:

- `src/navigation/RootNavigator.jsx` (Conversation route, unread provider)
- `src/navigation/BuyerNavigator.jsx` (real Messages tab and badge)
- `src/navigation/SellerNavigator.jsx` (Messages tab and badge)
- `src/screens/quotations/QuotationDetailScreen.jsx` (message action)
- `src/utils/formatters.js` (time and compact date-time formatting)

### Installed Dependencies

- None; all required packages were already installed.

### Tested

| Test | Result |
| --- | --- |
| Phase 7 API test suite | Passed (27/27 checks) |
| Phase 6 regression suite after requirement-summary refactor | Passed (42/42 checks) |
| Participant-only conversation access | Passed |
| One shared thread per quotation and separate seller threads | Passed |
| Empty threads hidden until the first message | Passed |
| Unread counts, read clearing, and thread ordering | Passed |
| Sent-to-Read status for both participants | Passed |
| Empty and over-length messages rejected | Passed |
| Pending/accepted creation and rejected/withdrawn/existing-thread rules | Passed |
| Expo export (Android, after badge updates) | Passed (999 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Communication flow on a physical phone | Pending user confirmation |

The Phase 7 automated test used a temporary API server on port 5011 and temporary
users with the `phase7.test.` prefix. All test records were removed afterward;
the user's real account was untouched. The Phase 6 suite was rerun against the
same temporary server.

### Phone Test Checklist

1. If the backend was started before the Phase 7 code was added, restart it so
   `/api/conversations` loads.
2. As a seller, open a pending quotation and tap **Message buyer**; send a
   message. As a buyer, open the same quotation and confirm **Message seller**
   opens the same thread.
3. Confirm the Messages tab badge and per-thread unread badge appear for the
   recipient, and that opening the thread clears them.
4. Send replies from both sides and confirm ordering, timestamps, automatic
   scrolling, and that **Sent** changes to **Read** after the recipient opens
   the thread.
5. Accept a quotation and confirm the conversation remains available. Check that
   an existing thread survives rejection, while a never-used rejected quote has
   no Message action.

### Known Issues / Notes

- Messages are text-only; attachments, voice notes, editing, and deletion are
  not implemented.
- There is no real-time socket or push notification. The open thread refreshes
  every 15 seconds and the unread tab badge every 30 seconds; both also refresh
  when their screen gains focus, when the app becomes active, and on pull.
- Only the latest 100 messages are loaded; older-message pagination is not
  implemented.
- A new conversation can only be created for a pending or accepted quotation.
  Rejected, withdrawn, and expired quotations keep an existing thread, but a
  thread that was never used stays hidden and cannot be created later.
- Read receipts use the participant's latest thread-read timestamp. A read
  receipt updates after the recipient opens or refreshes the thread.
- If conversation endpoints appear missing or read badges do not update, restart
  the backend so it loads the latest `/api/conversations` code.

---

## Phase 8 — Orders (COMPLETE, PHONE TEST PENDING)

### Completed

- Added the `Order` Mongoose model. Each order is a locked snapshot of an accepted
  quotation: requirement, buyer/seller and business IDs, product, category, offer
  type, quantity, unit, unit price, total price, delivery date, delivery location,
  status, and a status-history timeline.
- Enforced exactly one order per accepted quotation with a unique `quotationId`
  index. A unique formatted order number uses `SB-YYYYMMDD-XXXXXX`, with retry and
  race fallback handling.
- Accepting a quotation now creates the confirmed order automatically. The order
  is created after the requirement closes and the other pending quotations are
  rejected.
- Added `POST /api/orders` with `{ quotationId }` as an idempotent get-or-create
  endpoint. It retrieves the auto-created order for either participant and
  backfills accepted quotations created before Phase 8 when either participant
  opens **View order**.
- Added endpoints:
  - `POST /api/orders`
  - `GET /api/orders/my` (optional `status` filter)
  - `GET /api/orders/:id`
  - `PATCH /api/orders/:id/status`
- Limited order reads and updates to that order's buyer and seller. Other users
  receive `404`.
- Enforced server-side transitions:
  - Seller: confirmed → processing or cancelled; processing → shipped; shipped →
    delivered.
  - Buyer: confirmed or processing → cancelled.
  - Delivered and cancelled are final.
- Appended every status change to `statusHistory` with the acting user and time.
- Returned `isBuyer`, `isSeller`, counterpart business summary, accepted-quotation
  summary, and `allowedTransitions` so the app renders only valid actions.
- Added the order service, status metadata, order card, status badge, Orders list,
  and order detail screen.
- Added an **Orders** tab for both buyer and seller modes, active/delivered/
  cancelled stats, status filters, empty/error states, and pull-to-refresh.
- Added an **Active** order filter and made the Active/Delivered/Cancelled summary
  cards tappable filters. The list heading now shows how many orders match the
  current filter.
- Added a collapsible, role-aware **How orders work** guide. It opens
  automatically for a first order and stays compact when several orders exist.
- Added a compact order-stage bar and a plain-language next-step line to every
  order card, with clearer product/status hierarchy and simplified metadata.
- Added a root `OrderDetail` screen with order terms, counterpart, status history,
  message action, accepted-quotation link, and role-aware progression/cancel
  actions.
- Added a four-step order progress tracker and a prominent role-specific next-step
  card to order detail. Seller fulfilment actions now sit inside this card, while
  cancellation is clearly separated with a role-aware cancellation hint.
- Reworked status history with milestone icons, plain-language descriptions, and
  timestamps.
- Added a **View order** action to accepted quotation details, usable by both the
  buyer and seller.
- Updated seller home copy to mark order fulfilment as live.
- No real payment, invoice, dispute, or returns flow is included; those are handled
  directly between businesses for now.

### Created Files

Backend:

- `src/constants/orderOptions.js`
- `src/models/Order.js`
- `src/modules/orders/order.routes.js`
- `src/modules/orders/order.controller.js`
- `src/modules/orders/order.service.js`
- `src/modules/orders/order.validation.js`

Backend files modified:

- `src/app.js` (mounts `/api/orders`)
- `src/modules/quotations/quotation.controller.js` (auto-creates the order on
  acceptance, with a logged fallback if creation fails)

Frontend:

- `src/constants/orders.js`
- `src/services/orderService.js`
- `src/components/orders/OrderStatusBadge.jsx`
- `src/components/orders/OrderCard.jsx`
- `src/components/orders/OrderGuideCard.jsx`
- `src/components/orders/OrderProgress.jsx`
- `src/screens/orders/OrdersScreen.jsx`
- `src/screens/orders/OrderDetailScreen.jsx`

Frontend files modified:

- `src/navigation/RootNavigator.jsx` (OrderDetail route)
- `src/navigation/BuyerNavigator.jsx` (Orders tab)
- `src/navigation/SellerNavigator.jsx` (Orders tab)
- `src/screens/quotations/QuotationDetailScreen.jsx` (View order action)
- `src/screens/seller/SellerHomeScreen.jsx` (live order fulfilment copy)

### Installed Dependencies

- None; all required packages were already installed.

### Tested

| Test | Result |
| --- | --- |
| Phase 8 API test suite | Passed (19/19 checks) |
| Phase 6 regression suite after order auto-creation | Passed (42/42 checks) |
| Phase 7 regression suite after order auto-creation | Passed (27/27 checks) |
| Auto-created confirmed order snapshot and formatted order number | Passed |
| Idempotent buyer/seller retrieval without duplicate orders | Passed |
| Buyer/seller order access and outsider isolation | Passed |
| Status filters and invalid id/status handling | Passed |
| Confirmed → processing → shipped → delivered lifecycle | Passed |
| Buyer cancellation while processing and final-state locking | Passed |
| Rejected quotations cannot become orders | Passed |
| Orders UX clarity pass (guide, progress, next step, Active filter) | Passed |
| Final Phase 6/7/8 regression after UX work | Passed (42/42, 27/27, 19/19) |
| Expo export (Android, after Orders UX polish) | Passed (1007 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Orders flow on a physical phone | Pending user confirmation |

The Phase 8 automated test used a temporary API server on port 5011 and temporary
users with the `phase8.test.` prefix. All test orders and test records were
removed afterward; the user's real account and real order data were untouched.
The Phase 6 and Phase 7 suites were rerun against the same temporary server to
confirm order auto-creation did not break earlier flows.

### Phone Test Checklist

1. Confirm the backend is running the latest code so `/api/orders` loads.
2. As a buyer, accept a pending quotation. Open **Orders** and confirm the new
   order is **Confirmed**, shows the agreed price/quantity/delivery terms, and has
   the correct order number.
3. Switch to the seller account and open the same order from **Orders** or the
   accepted quotation's **View order** action. Confirm both sides see each other's
   business summary and the same terms.
4. As the seller, mark the order **Processing**, then **Shipped**, then
   **Delivered**. Confirm the buyer sees each update on focus or pull-to-refresh,
   and that the timeline records every change.
5. Create another accepted order and confirm the buyer can cancel it while
   confirmed/processing. Also confirm a seller can cancel a processing order
   (Phase 10) and that cancelled and delivered orders show no further status
   actions.
6. From an order, tap **Message** and confirm the quotation conversation opens,
   and tap **View accepted quotation** to confirm navigation works.

### Known Issues / Notes

- One order exists per accepted quotation. Orders are snapshots, so editing the
  source quotation or requirement later does not rewrite agreed terms.
- Real payment, invoice generation, disputes, returns, and delivery-proof
  uploads are not implemented. Phase 10 adds only a sandbox EMD wallet.
- There are no order push notifications. The list refreshes on focus, pull, and
  after a status action; the detail screen also supports pull-to-refresh.
- Sellers can cancel while an order is confirmed or processing; Phase 10 adds
  EMD forfeiture for seller-fault cancellation. Buyers can cancel while it is
  confirmed or processing; their EMD is released. Shipped orders can only
  progress to delivered.
- Accepted quotations created before Phase 8 are backfilled when either
  participant opens **View order**; new acceptances create the order automatically.
- If order screens return `404`, restart the backend so it loads `/api/orders`.

---

## Phase 9 — Final Testing (IN PROGRESS)

### Completed So Far

- Completed the Orders UX clarity pass before starting final QA:
  - Added the **How orders work** guide and **Active** filter.
  - Made summary cards tappable filters with filtered-result counts.
  - Added order stage bars and next-step text to order cards.
  - Added the four-step progress tracker, role-specific next-step card, separated
    cancellation guidance, and plain-language status history to order detail.
- Reran the complete automated API regression through the combined harness:
  - Phase 6: **42/42 checks passed**
  - Phase 7: **27/27 checks passed**
  - Phase 8: **19/19 checks passed**
  - Phase 9 smoke: **28/28 checks passed**
  - Phase 9 procurement lifecycle: **125/125 checks passed**
  - Total: **241/241 checks passed**
- Verified the Android production bundle after the Phase 10 UI changes:
  **1014 modules exported successfully**.
- Re-ran Expo Doctor: **20/20 checks passed**.
- Ran `node --check` across every backend source file: **passed**.
- Confirmed the app source contains no `console.log`, `console.warn`, or
  `console.debug` statements.
- Audited the database after cleanup: **no `phase6.test.`, `phase7.test.`, or
  `phase8.test.` users remain**. Existing non-test order data was preserved.
- Applied the procurement data migration to local MongoDB and verified the real
  requirements, quotations, and orders were preserved (see Phase 10).
- No new runtime dependencies were added. Expo was patch-upgraded from 58.0.24
  to 58.0.25 to satisfy Expo Doctor.

### Remaining Final QA

- Physical phone walkthrough using the final UX and backend build.
- Confirm the app behaves correctly after a clean Expo cache restart and backend
  restart.
- Record final phone sign-off for Phases 7, 8, and 9.

### Final Phone Checklist

1. Log in, switch roles, and confirm the business profile loads correctly.
2. As a seller, top up the sandbox wallet and confirm available balance and the
   ledger entry.
3. As a buyer, post a requirement with a 2–5% EMD rate. Confirm the rate locks
   after the first quotation.
4. As a seller, send a quotation with GST and terms accepted; confirm the EMD
   hold appears in the wallet and the GST totals match the preview.
5. Edit the quotation and confirm the EMD adjustment. Reject or withdraw it and
   confirm the hold releases.
6. As a buyer, accept a quotation; confirm the order's taxable value, GST split,
   grand total, EMD, and terms snapshot.
7. In **Orders**, open **How orders work**, test the **Active** filter and tappable
   summary cards, and confirm each card shows the correct stage and next step.
8. Open order detail and confirm the progress tracker, role-specific next-step
   card, progress action, cancellation reason flow, and status-history notes.
9. As the seller, move the order through **Processing**, **Shipped**, and
   **Delivered**. Confirm the buyer sees every update after refresh/focus and the
   captured EMD is released on delivery.
10. Create another order and confirm buyer cancellation releases EMD while seller
    cancellation during processing forfeits it to the buyer wallet.
11. Repost a finished requirement and confirm it creates a new round without
    changing prior quotations or orders.
12. Confirm unread message badges, **Sent → Read** updates, and message ordering
    still work.
13. Test pull-to-refresh and network-error states on Wallet, Orders, Messages, and
    quotes.
14. Restart the backend and reload Expo with a cleared cache; confirm no screen
    shows stale or missing data.

### Known Risks / Notes

- The mobile UI has only been verified through Expo export and Expo Doctor; the
  final visual and touch test still needs a physical device.
- Automated tests use temporary users and clean up after themselves. The
  `phase*.test.` email prefix is the safety boundary; existing real accounts and
  orders must never be bulk-deleted.
- Production hardening was outside this phase at the time. Phase 13 adds
  SecureStore token storage, rate limiting, security headers, and upload checks;
  push notifications, cloud image storage, and deployment remain future work.

---

## Phase 10 — Procurement Safeguards (COMPLETE, PHONE TEST PENDING)

### Completed

- Added buyer-selected **EMD rate** of 2–5% (default 2%), calculated on taxable
  value excluding GST and locked once the first quotation arrives.
- Added a sandbox seller **EMD wallet** with available/held balances, top-up,
  append-only ledger, and recent transactions. No payment gateway is involved.
- Implemented EMD settlement: hold on quotation creation, adjust on edit, release
  on withdrawal/rejection/expiry, capture (still held) on acceptance, release on
  delivery or buyer cancellation, and forfeiture to the buyer's wallet on
  seller-fault cancellation.
- Made wallet settlement idempotent with per-operation keys. Quotation EMD
  adjustments use a persisted `emdAdjustmentSequence` so repeated edits cannot
  reuse a ledger key.
- Added GST rates **0/5/12/18/28%**, **exclusive/inclusive** pricing, taxable
  value, CGST/SGST vs IGST split, grand totals, and GSTIN-required validation.
- Added terms version **`emd-v1`** acceptance to new quotations and stored the
  accepted version on quotations and orders.
- Expanded requirement lifecycle to **Open/Awarded/Fulfilled/Cancelled/Closed/
  Expired**, with owner-only visibility for non-open requirements and a summary
  count for awarded requirements.
- Added **Repost** for cancelled/closed/expired requirements. Reposting clones
  the product and photos into a new round with fresh quotations, EMD, and orders;
  the original round stays immutable.
- Added role-specific cancellation reasons and seller cancellation from
  **Processing**. Orders snapshot tax, EMD, and T&C terms.
- Added the **EMD Wallet** and **GST/EMD policy** screens, Profile entry points,
  GST/EMD quote previews, a locked EMD field after quoting starts, cancellation
  reason UI, and scrollable cancellation modals.
- Added the legacy backfill script and applied it locally:
  - Dry run: `npm run migrate:procurement`
  - Apply: `npm run migrate:procurement:apply`
  - Backup:
    `C:\Users\Kishan Suthar\AppData\Local\Temp\opencode\supplybridge-procurement-backup-1794724751209.json`
- Fixed a migration defect where the schema default could write `taxableValue: 0`
  for legacy quotations; the backfill now falls back to the stored quote total.
- Replaced deprecated Mongoose `new: true` options with
  `returnDocument: "after"` in wallet/quotation updates.

### Created Files

Backend:

- `src/constants/procurement.js`, `src/constants/taxOptions.js`
- `src/models/Wallet.js`, `src/models/WalletTransaction.js`
- `src/services/wallet.service.js`, `src/services/procurement.service.js`
- `src/modules/wallet/*`, `src/modules/procurement/*`
- `scripts/backfill-procurement.js`

App:

- `src/constants/procurement.js`, `src/utils/tax.js`
- `src/services/walletService.js`, `src/services/procurementService.js`
- `src/screens/wallet/WalletScreen.jsx`
- `src/screens/procurement/ProcurementPolicyScreen.jsx`
- `src/screens/requirements/RequirementRepostScreen.jsx`

### Tested

| Test / Check | Result |
| --- | --- |
| Phase 6 API regression | Passed (42/42 checks) |
| Phase 7 API regression | Passed (27/27 checks) |
| Phase 8 API regression | Passed (19/19 checks) |
| Phase 9 backend smoke | Passed (28/28 checks) |
| Phase 9 procurement lifecycle | Passed (125/125 checks) |
| Combined harness | Passed (241/241 checks) |
| Android production export | Passed (1014 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Backend syntax check | Passed |
| Migration dry run / apply | Passed; local MongoDB updated |
| Real-data preservation | Verified; prior requirements, quotations, and orders remain |

The lifecycle suite covers terms validation, intra-state GST, repeated EMD
adjustment cycles, EMD-rate locking, rejection release, inclusive GST, buyer
cancellation release, repost guard (`201`, then `409`), delivery release,
insufficient/exact balance, top-up idempotency, expiry release, and manual close
release.

### Phone Test Checklist

1. Top up the seller wallet and confirm available/held balances and ledger.
2. Post a requirement with a non-default EMD rate; confirm it locks after the
   first quotation.
3. Send a quote with GST and terms accepted; confirm EMD hold and GST totals.
4. Edit, withdraw, and reject quotes and confirm EMD is adjusted or released.
5. Accept a quote and confirm the order shows matching tax, EMD, and T&C values.
6. Deliver an order and confirm the captured EMD is released and no further
   action is available.
7. Buyer-cancel an order and confirm the seller's EMD is released.
8. Seller-cancel a processing order and confirm the buyer receives the forfeited
   EMD.
9. Repost a finished requirement and confirm prior rounds remain unchanged.
10. Check wallet/policy screens on a clean Expo cache and final backend build.

### Known Issues / Notes

- Sandbox only: top-ups and EMD are motivational bookkeeping, not real money.
- No GST filing, invoice PDF, TCS/TDS, GeM ₹5 lakh threshold, or MSE/Udyam
  exemption support.
- `forfeitEmd` is not fully retry-safe if the seller ledger entry succeeds and the
  buyer credit fails. Conditional updates and compensation exist, but a later
  hardening pass should make the two-sided credit atomic or fully reconcile it.
- MongoDB is assumed to be a standalone local instance, so implementation favors
  conditional updates and idempotency over multi-document transactions.
- Legacy quotations edited after this phase require a seller wallet/GSTIN; this
  is expected but has not been phone-tested.
- Automated suites use temporary `phase*.test.` / `phase9.lifecycle.*` users and
  clean up; real accounts and orders must never be bulk-deleted.

---

## Phase 11 - Procurement Terms, Fulfilment, and Business Trust (COMPLETE, PHONE TEST PENDING)

### Completed

- Replaced the short EMD terms with versioned **`procurement-v2`** terms:
  16 sections, effective 2026-11-15, covering accounts, verification,
  requirements, quotations, EMD, orders, shipment, delivery, cancellations,
  taxes, payments, disputes, prohibited goods, conduct, privacy, and liability.
- Added terms acceptance to registration, quotation creation, buyer acceptance,
  and signed-in legacy users. `POST /api/auth/accept-terms` records the version
  and timestamp; the public policy endpoint returns the full text and section
  metadata for deep links.
- Added buyer reference and both terms acceptances to quotations and orders.
- Added structured delivery details to requirements and snapshotted them into
  orders: contact, phone, address, city, state, PIN code, and instructions.
- Reworked order fulfilment: seller dispatch requires courier, tracking,
  dispatch date, and package count; sellers can correct shipment details while
  shipped; only buyers can confirm delivery with recipient details; sellers can
  no longer mark delivered. Status history stores actor roles and actual notes.
- Added shipment, delivery, terms, buyer-reference, business-avatar, public
  profile, and share-track actions to order detail, with dedicated shipment and
  delivery modals.
- Extended business profiles with logo, website, year established, legal name,
  PAN, registration number, verification documents, verification workflow,
  portfolio (maximum 6), and `showContactOnProfile`.
- Added private verification storage outside `uploads/`, document upload/delete,
  owner-only download, submission, pending lock, and operator review CLI.
- Added business screens: overview, create/edit, verification, portfolio, and
  public profile. Added business routes to the root navigator.
- Added v2 acceptance banner to Profile and updated the policy entry label.
- Polished buyer/seller homes with active-order previews, order shortcuts, and
  verification prompts.
- Migrated all backend fixtures to v2 consent, buyer references, shipment, and
  buyer delivery; added a Phase 11 API suite covering terms, structured
  delivery, shipment/delivery roles, legal fields, logo, portfolio, documents,
  verification lock, public privacy, and contact visibility.

### Created Files

Backend:

- `src/constants/terms.js`
- `scripts/review-business-verification.js`

App:

- `src/screens/business/BusinessEditScreen.jsx`
- `src/screens/business/BusinessVerificationScreen.jsx`
- `src/screens/business/BusinessPortfolioScreen.jsx`
- `src/screens/business/PublicBusinessProfileScreen.jsx`
- `src/components/orders/OrderShipmentModal.jsx`
- `src/components/orders/OrderDeliveryModal.jsx`
- `src/components/common/BusinessAvatar.jsx`

### Tested

| Test / Check | Result |
| --- | --- |
| Phase 6 API regression | Passed (42/42 checks) |
| Phase 7 API regression | Passed (27/27 checks) |
| Phase 8 API regression | Passed (19/19 checks) |
| Phase 9 backend smoke | Passed (28/28 checks) |
| Phase 9 procurement lifecycle | Passed (125/125 checks) |
| Phase 11 API regression | Passed (57/57 checks) |
| Combined harness | Passed (298/298 checks) |
| Android production export | Passed (1027 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Backend syntax check | Passed |

The Phase 11 suite covers registration consent, old-version rejection, structured
delivery visibility, buyer terms/reference capture, order snapshots, dispatch
validation, shipment correction, seller delivery rejection, buyer delivery
confirmation, EMD release, status notes, legal validation, logo/portfolio
uploads, four document types, pending lock, public privacy, and hidden contact.

### Phone Test Checklist

1. Register a new account and confirm the v2 terms checkbox is required; sign in
   as an older user and accept terms from the Profile banner.
2. Post a requirement with structured delivery details and confirm sellers see
   only city/state before acceptance.
3. Quote, accept with a buyer reference, and confirm the order shows both terms
   records and the delivery snapshot.
4. Process and dispatch with full shipment details; correct the tracking number,
   track from the buyer account, and confirm delivery from the buyer only.
5. Edit business legal fields, upload a logo and portfolio item, upload all four
   verification documents, submit, and confirm the pending lock.
6. Toggle public contact visibility and open the public business profile from an
   order or quotation.
7. Check the new active-order and verification cards on buyer/seller homes.

### Known Issues / Notes

- There is no admin web UI; verification review is CLI-only.
- Verification document download exists on the backend but has no app screen.
- `forfeitEmd` still has the pre-existing two-sided retry-safety gap.
- Documents are stored on local disk; production would use private object
  storage.
- Phase 11 regression scripts live in the temp validation folder, not the repo.

---

## Phase 12 - Ratings, Reviews, and Requirement Presentation (COMPLETE, PHONE TEST PENDING)

### Completed

- Added a `Review` model tied to delivered orders. Reviews store the reviewer and
  reviewee business identities, roles, an integer rating from 1 to 5, and an
  optional 500-character comment. A unique compound index on order and reviewer
  allows one review per participant.
- Added authenticated review endpoints:
  - `GET /api/reviews/business/:businessId` lists the newest 30 reviews with an
    optional `role=buyer|seller|all` filter and overall/buyer/seller summaries.
  - `GET /api/reviews/order/:orderId` returns review eligibility, the current
    user's review, the counterpart role, and order status.
  - `POST /api/reviews` requires a delivered order and a participant, rejects
    duplicates with `409`, and refreshes the target business rating cache.
- Added cached buyer/seller rating averages and counts to `Business`. The Review
  collection remains the source of truth, and the cache refreshes after each
  submission.
- Extended public business summaries and business formatters with overall,
  buyer, and seller rating summaries.
- Added reusable app review components: star display/input, rating summary,
  review card, and a delivered-order review bottom sheet.
- Upgraded requirement cards with a full-width 4:3 cover photo, photo-count
  badge, round label, quantity/budget tiles, EMD indicator, buyer business
  avatar, buyer rating (or **New buyer**), and posted date.
- Upgraded requirement detail with a 5:4 hero gallery and additional thumbnails,
  a richer buyer business card with verification status, EMD, rating, and a
  public-profile link, plus a recent buyer-review section.
- Enlarged requirement photo previews, switched them to a two-column 5:4 layout,
  and added cover-photo guidance to the form.
- Added a hero rating and full ratings/reviews section to the public business
  profile.
- Added counterpart ratings, a delivered-order review prompt, submitted review
  card, and review modal to order detail.
- Added a 25-check reviews API integration test covering participant gating,
  delivered-only submission, duplicate prevention, role filters, cached rating
  summaries, public requirement summaries, validation, and cleanup.

### Created Files

Backend:

- `src/models/Review.js`
- `src/modules/reviews/review.routes.js`
- `src/modules/reviews/review.controller.js`
- `src/modules/reviews/review.service.js`
- `src/modules/reviews/review.validation.js`

App:

- `src/services/reviewService.js`
- `src/components/reviews/RatingStars.jsx`
- `src/components/reviews/ReviewSummary.jsx`
- `src/components/reviews/ReviewCard.jsx`
- `src/components/reviews/ReviewModal.jsx`
- `src/utils/ratings.js`

### Files Modified

Backend:

- `src/models/Business.js` (cached rating fields)
- `src/utils/businessSummary.js` (rating fields and summaries)
- `src/modules/businesses/business.controller.js` (ratings in formatters)
- `src/app.js` (mounts `/api/reviews`)

App:

- `src/components/requirements/RequirementCard.jsx`
- `src/screens/requirements/RequirementDetailScreen.jsx`
- `src/screens/requirements/RequirementFormScreen.jsx`
- `src/screens/business/PublicBusinessProfileScreen.jsx`
- `src/screens/orders/OrderDetailScreen.jsx`

### Tested

| Test / Check | Result |
| --- | --- |
| Reviews API integration test | Passed (25 checks) |
| Review fixture cleanup | Passed (0 users/businesses/requirements/orders/reviews left) |
| Phase 6 API regression | Passed (42/42 checks) |
| Phase 7 API regression | Passed (27/27 checks) |
| Phase 8 API regression | Passed (19/19 checks) |
| Phase 9 backend smoke | Passed (28/28 checks) |
| Phase 9 procurement lifecycle | Passed (125/125 checks) |
| Phase 11 API regression | Passed (57/57 checks) |
| Combined regression harness | Passed (298/298 checks) |
| Android production export | Passed (1,033 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Backend syntax check | Passed on all changed files |

### Phone Test Checklist

1. Open a requirement feed and confirm cards show the cover photo, photo count,
   quantity/budget, EMD, buyer business, buyer rating or **New buyer**, and date.
2. Open a requirement and check the large gallery, buyer trust card, public
   profile link, and recent buyer-review section.
3. Post or edit a requirement and confirm the enlarged two-column photo previews
   and cover-photo hint.
4. Deliver an order from the buyer account, then open order detail as the buyer
   and submit a seller review with and without a comment.
5. Open the same order as the seller and submit a buyer review; confirm the
   review prompt disappears and the submitted review card appears.
6. Confirm a second submission is blocked, and that submitting before delivery
   is unavailable.
7. Open the reviewed business from the order, requirement, or search results and
   confirm the hero rating, role breakdown, and review list.
8. Check that requirement cards for the reviewed buyer update to the new rating.

### Known Issues / Notes

- Reviews cannot be edited or deleted; the public review list is capped at 30
  newest entries with no pagination.
- Cached rating totals on `Business` are denormalized for fast list/detail
  responses. The Review collection remains authoritative, and the cache is
  refreshed after each new review.
- After submitting a review, the order header's counterpart rating updates on
  the next order refresh; the submitted review card updates immediately.
- Review regression scripts live in the temp validation folder, not the repo.

---

## Phase 13 - Security and Production Hardening (COMPLETE)

### Completed

- Added centralized security middleware with `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, a restrictive
  Content-Security-Policy, cross-origin resource policy, and conditional HSTS.
  `X-Powered-By` is disabled and API responses use `Cache-Control: no-store`.
- Replaced open CORS with an allowlist driven by `CORS_ORIGINS`. Native requests
  without an `Origin` header remain allowed; production browser origins require
  configuration, while development still allows local browser tools.
- Added request limits: 1 MB JSON bodies by default, malformed/oversized-body
  handling, and a 3,000-request/15-minute per-IP API limit. Failed auth attempts
  are limited separately to 20 per 15 minutes per IP and email address.
- Added production error sanitization so unexpected 500 responses no longer
  expose internal messages, while malformed JSON and oversized payloads return
  safe 400/413 responses.
- Strengthened JWT startup validation: production requires a non-placeholder
  secret of at least 32 bytes. Added optional `TRUST_PROXY` handling, configurable
  `HOST`, stricter port validation, graceful SIGINT/SIGTERM shutdown, and
  unhandled-rejection logging.
- Limited passwords to 72 characters (the bcrypt input limit) and names to 80
  characters; login rejects overlong credentials with the generic auth error.
- Hardened uploads by deriving extensions from the validated MIME type and
  checking real JPEG, PNG, WebP, and PDF signatures. Spoofed files are deleted and
  rejected before reaching controllers.
- Added native SecureStore session storage. Tokens migrate from the legacy
  AsyncStorage key on restore; the cached user profile remains in AsyncStorage.
- Added `EXPO_PUBLIC_API_URL` support so app builds can target a deployed API
  without editing `config.js`. Added Expo scheme and platform bundle/package
  identifiers.
- Added Phase 13 security coverage for headers, HSTS, CORS, malformed/oversized
  JSON, auth throttling, bcrypt limits, spoofed uploads, error sanitization, and
  production JWT secret rejection.

### Created Files

Backend:

- `src/middleware/securityMiddleware.js`
- `.env.example` additions for production/security settings

App:

- `src/utils/sessionStorage.js`
- `.env.example` with `EXPO_PUBLIC_API_URL`

### Files Modified

Backend:

- `src/app.js`
- `src/server.js`
- `src/middleware/errorMiddleware.js`
- `src/middleware/uploadMiddleware.js`
- `src/modules/auth/auth.routes.js`
- `src/modules/auth/auth.controller.js`
- `.gitignore` at the workspace root (private verification uploads)

App:

- `src/context/AuthContext.js`
- `src/constants/config.js`
- `app.json`
- `package.json` / `package-lock.json`

### Installed Dependencies

- App: `expo-secure-store` `~58.0.3` (via `npx expo install`)
- Backend: none

### Tested

| Test / Check | Result |
| --- | --- |
| Phase 13 security suite | Passed (28 checks) |
| Phase 6 API regression | Passed (42/42 checks) |
| Phase 7 API regression | Passed (27/27 checks) |
| Phase 8 API regression | Passed (19/19 checks) |
| Phase 9 backend smoke | Passed (28/28 checks) |
| Phase 9 procurement lifecycle | Passed (125/125 checks) |
| Phase 11 API regression | Passed (57/57 checks) |
| Combined regression harness | Passed (298/298 checks) |
| Android production export | Passed (1,036 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Backend syntax check | Passed on all changed files |
| Backend startup and health check | Passed (MongoDB connected) |
| Backend `npm audit --omit=dev` | Passed (0 vulnerabilities) |
| App `npm audit --omit=dev` | 3 moderate advisories in Expo fingerprint/minimatch tooling; no safe non-breaking fix |

The security suite used a production-mode test app, a nonexistent login account,
and a spoofed upload. It did not create or modify live marketplace records. No
test users or upload files were left behind.

### Known Issues / Notes

- Rate limiting is in-memory and per API process. A multi-instance deployment
  should use a shared store such as Redis.
- HTTPS/HSTS requires TLS termination at a reverse proxy or hosting layer; the
  local development server still runs over plain HTTP.
- CORS in production intentionally blocks browser origins until `CORS_ORIGINS`
  is configured. Native app requests are unaffected.
- Native tokens use SecureStore when available. Web and unsupported environments
  fall back to AsyncStorage; the cached user profile is non-sensitive.
- Upload files still use local disk. Production should use public/private object
  storage with malware scanning and retention rules.
- App `npm audit` reports 3 moderate advisories through Expo's
  `@expo/fingerprint` → `minimatch` tooling. The suggested fix downgrades Expo to
  SDK 52, so it was not applied; recheck when Expo ships an updated fingerprint
  package. The backend audit is clean.
- Push/OS notifications, an admin verification UI, disputes/returns, and
  marketplace analytics remain future phases. In-app persistent notifications and
  realtime updates are addressed in Phase 14.

---

## Phase 14 - Notifications and Real-time Updates (COMPLETE, PHONE TEST PENDING)

### Completed

- Added a persistent `Notification` model with recipient, type, title, message,
  optional related type/id, read state, timestamps, and recipient/date plus
  recipient/read indexes.
- Added authenticated notification endpoints:
  - `GET /api/notifications` lists the current user's notifications newest first,
    with `page`, `limit` (maximum 50), and `unread=true`, plus `unreadCount` and
    pagination.
  - `GET /api/notifications/unread-count` returns the unread badge count.
  - `PATCH /api/notifications/:id/read` marks one owned notification read
    idempotently.
  - `PATCH /api/notifications/read-all` marks every owned notification read.
- Added an authenticated WebSocket server at `/api/realtime` on the existing HTTP
  server. JWT authentication uses a query token because browser WebSocket clients
  cannot set an `Authorization` header in the handshake.
- Added a per-user connection registry with at most 5 connections per user, a
  30-second heartbeat, an 8 KB frame limit, token-expiry close scheduling, and
  graceful server shutdown. Close codes are `4001` invalid/expired token, `4003`
  inactive user, and `4008` too many connections.
- Added the realtime events `connected`, `notification`, `message`, `ping`, and
  `pong`. Notification and message delivery is best-effort; persisted records and
  REST remain authoritative.
- Added notification hooks for:
  - quotation received, updated, withdrawn, accepted, and rejected;
  - requirement closure rejecting pending quotations;
  - order creation, status changes, and shipment corrections;
  - reviews received after delivery;
  - business verification approval/rejection from the operator CLI.
- Added the app notification API client, `NotificationsProvider`, bell badge,
  notification center, and shared stack route. The provider manages unread count,
  socket reconnect/backoff, close-code logout, notification/message version
  signals, and the last message event.
- Added notification bells to buyer and seller home screens and a notification row
  with unread count to Profile.
- Added the **Notifications** screen with All/Unread filters, pagination,
  pull-to-refresh, mark one/mark all read, icons, empty/error states, and
  deep-links to quotations, orders, requirements, conversations, and business
  verification.
- Added realtime refresh wiring to conversation list/thread, order list/detail,
  quotation detail/comparison/My Quotes, and requirement detail.
- Kept polling fallbacks: notifications every 60 seconds, message badge every 30
  seconds, and the open thread every 15 seconds, plus focus/app-resume refreshes.
- No new app dependency was needed because React Native provides the WebSocket
  client. The backend uses `ws@^8.23.0`.

### Created Files

Backend:

- `src/models/Notification.js`
- `src/realtime/realtime.js`
- `src/modules/notifications/notification.routes.js`
- `src/modules/notifications/notification.controller.js`
- `src/modules/notifications/notification.service.js`

App:

- `src/services/notificationService.js`
- `src/context/NotificationsContext.js`
- `src/components/notifications/NotificationBell.jsx`
- `src/screens/notifications/NotificationsScreen.jsx`

### Files Modified

Backend:

- `src/app.js` (mounts `/api/notifications`)
- `src/server.js` (HTTP server, realtime attach, graceful shutdown)
- `src/modules/conversations/conversation.controller.js` (message events)
- `src/modules/quotations/quotation.controller.js` (quotation hooks)
- `src/modules/requirements/requirement.controller.js` (closure hooks)
- `src/modules/orders/order.controller.js` (order/shipment hooks)
- `src/modules/reviews/review.controller.js` (review hook)
- `scripts/review-business-verification.js` (verification hooks)
- `package.json` / `package-lock.json` (`ws`)

App:

- `src/navigation/RootNavigator.jsx` (provider, screen, header)
- `src/screens/buyer/BuyerHomeScreen.jsx`
- `src/screens/seller/SellerHomeScreen.jsx`
- `src/screens/profile/ProfileScreen.jsx`
- `src/screens/messages/ConversationsScreen.jsx`
- `src/screens/messages/ConversationScreen.jsx`
- `src/screens/orders/OrderDetailScreen.jsx`
- `src/screens/orders/OrdersScreen.jsx`
- `src/screens/quotations/QuotationDetailScreen.jsx`
- `src/screens/quotations/RequirementQuotesScreen.jsx`
- `src/screens/quotations/MyQuotesScreen.jsx`
- `src/screens/requirements/RequirementDetailScreen.jsx`

### Installed Dependencies

- Backend: `ws` `^8.23.0`
- App: none

### Tested

| Test / Check | Result |
| --- | --- |
| Notification API and WebSocket integration suite | Passed (28 checks) |
| Controller notification hook suite | Passed (36 checks) |
| Phase 6 API regression | Passed (42/42 checks) |
| Phase 7 API regression | Passed (27/27 checks) |
| Phase 8 API regression | Passed (19/19 checks) |
| Phase 9 backend smoke | Passed (28/28 checks) |
| Phase 9 procurement lifecycle | Passed (125/125 checks) |
| Phase 11 API regression | Passed (57/57 checks) |
| Combined regression harness | Passed (298/298 checks) |
| Reviews API integration test | Passed (25 checks) |
| Phase 13 security suite | Passed (28 checks) |
| Android production export | Passed (1,040 modules) |
| Expo Doctor | Passed (20/20 checks) |
| Backend syntax check | Passed (64 JS files) |
| Live notification cleanup | Passed (0 orphan notifications) |

The notification suites used temporary users and marketplace records, verified
REST pagination/read state and WebSocket delivery, and removed their users,
businesses, requirements, quotations, orders, reviews, wallets, and notifications.
Two requirements left by an earlier failed hook-test attempt were also removed.
Live buyer/seller accounts, orders, wallets, and conversation messages remain
untouched.

### Phone Test Checklist

1. Confirm the bell appears on buyer and seller home screens and on Profile, and
   that the badge matches the unread notification count.
2. Send a quotation as the seller and confirm the buyer's bell and notification
   list update without reopening the app.
3. Mark one notification read and mark all read; verify the badge clears and the
   read state survives reopening the screen.
4. Open quotation, order, requirement, conversation, and verification
   notifications and confirm each opens the correct screen.
5. Move an order through processing, shipping, shipment correction, and delivery;
   confirm the counterparty receives updates.
6. Submit a review and confirm the counterparty receives the review notification.
7. Background and resume the app, and confirm unread counts and message badges
   recover if a realtime event was missed.
8. Sign out or let a token expire while connected; confirm the app returns to
   authentication instead of reconnecting with an invalid token.

### Known Issues / Notes

- Notifications are in-app only. OS push notifications and per-type notification
  preferences are not implemented.
- The WebSocket token travels in the query string because browser clients cannot
  set handshake headers. Production must use `wss://`, allow upgrades at the
  proxy, and avoid logging full realtime URLs.
- The connection registry is in-memory. Multiple backend instances would need a
  shared pub/sub layer such as Redis for cross-instance delivery.
- Marking a notification read while the **Unread** filter is active leaves that
  card visible until the next refresh or screen focus; the server state is
  correct.
- Notification integration scripts live in the temp validation folder, not the
  repository.

---

## Progress History

| Phase | Description | Status |
| --- | --- | --- |
| 1 | Project foundation and connectivity | Complete |
| 2 | Authentication and roles | Complete |
| 3 | Business profiles | Complete |
| 4 | Buyer requirements | Complete |
| 5 | Seller discovery | Complete |
| 6 | Quotations | Complete, phone confirmed |
| 7 | Communication | Complete, phone test pending |
| 8 | Orders | Complete, phone test pending |
| 9 | Final testing | Complete, automated checks passed |
| 10 | Procurement safeguards (EMD, GST, T&C, repost) | Complete, phone test pending |
| 11 | v2 terms, fulfilment, verification, portfolios | Complete, phone test pending |
| 12 | Ratings, reviews, and requirement presentation | Complete, phone test pending |
| 13 | Security and production hardening | Complete |
| 14 | Notifications and real-time updates | Complete, phone test pending |
