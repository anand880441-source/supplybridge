const {
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_TEXT
} = require("./terms");

const EMD_RATE_MIN = 2;
const EMD_RATE_MAX = 5;
const EMD_RATES = [2, 3, 4, 5];

const CANCELLATION_REASONS = [
  "seller_unable_to_fulfil",
  "buyer_no_longer_needs",
  "mutual_agreement",
  "other"
];

const POLICY = {
  termsVersion: TERMS_VERSION,
  termsEffectiveDate: TERMS_EFFECTIVE_DATE,
  termsSections: TERMS_SECTIONS,
  termsText: TERMS_TEXT,
  emdRateMin: EMD_RATE_MIN,
  emdRateMax: EMD_RATE_MAX,
  emdRates: EMD_RATES,
  cancellationReasons: CANCELLATION_REASONS
};

module.exports = {
  EMD_RATE_MIN,
  EMD_RATE_MAX,
  EMD_RATES,
  TERMS_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_TEXT,
  CANCELLATION_REASONS,
  POLICY
};
