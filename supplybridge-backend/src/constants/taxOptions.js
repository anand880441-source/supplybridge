const GST_RATES = [0, 5, 12, 18, 28];

const GST_PRICING_MODES = ["exclusive", "inclusive"];

const roundToTwo = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const normalizeState = (value) => {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
};

const calculateGst = ({
  quantity,
  unitPrice,
  gstRate,
  pricingMode,
  sellerState,
  buyerState
}) => {
  const quantityValue = Number(quantity);
  const unitPriceValue = Number(unitPrice);
  const rate = Number(gstRate);

  if (
    !Number.isFinite(quantityValue) ||
    !Number.isFinite(unitPriceValue) ||
    !Number.isFinite(rate) ||
    quantityValue <= 0 ||
    unitPriceValue < 0 ||
    rate < 0
  ) {
    return {
      error: "Quantity, unit price, and GST rate must be valid numbers"
    };
  }

  const enteredAmount = roundToTwo(quantityValue * unitPriceValue);
  const isInclusive = pricingMode === "inclusive";
  const taxableValue = isInclusive
    ? roundToTwo(enteredAmount / (1 + rate / 100))
    : enteredAmount;
  const totalTax = roundToTwo(taxableValue * (rate / 100));
  const grandTotal = roundToTwo(taxableValue + totalTax);
  const isSameState =
    normalizeState(sellerState) === normalizeState(buyerState);
  const cgstAmount = isSameState ? roundToTwo(totalTax / 2) : 0;
  const sgstAmount = isSameState ? roundToTwo(totalTax - cgstAmount) : 0;
  const igstAmount = isSameState ? 0 : totalTax;

  return {
    values: {
      gstRate: rate,
      pricingMode: isInclusive ? "inclusive" : "exclusive",
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      grandTotal,
      placeOfSupply: buyerState || "",
      sellerGstin: "",
      buyerGstin: ""
    }
  };
};

module.exports = {
  GST_RATES,
  GST_PRICING_MODES,
  calculateGst,
  roundToTwo
};
