const roundToTwo = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const normalizeState = (value) => {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
};

export const calculateTaxPreview = ({
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
    return null;
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
    gstRate: rate,
    pricingMode: isInclusive ? "inclusive" : "exclusive",
    enteredAmount,
    taxableValue,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    grandTotal
  };
};

export const calculateEmdAmount = (taxableValue, emdRate) => {
  const value = Number(taxableValue);
  const rate = Number(emdRate);

  if (!Number.isFinite(value) || !Number.isFinite(rate) || value <= 0) {
    return 0;
  }

  return roundToTwo(value * (rate / 100));
};
