const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

export const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "";
  }

  try {
    return `₹${number.toLocaleString("en-IN", {
      maximumFractionDigits: 2
    })}`;
  } catch (error) {
    return `₹${number}`;
  }
};

export const formatBudget = (budgetMin, budgetMax) => {
  const hasMin = budgetMin !== null && budgetMin !== undefined;
  const hasMax = budgetMax !== null && budgetMax !== undefined;

  if (hasMin && hasMax) {
    return `${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)}`;
  }

  if (hasMin) {
    return `From ${formatCurrency(budgetMin)}`;
  }

  if (hasMax) {
    return `Up to ${formatCurrency(budgetMax)}`;
  }

  return "Not specified";
};

export const formatQuantity = (quantity, unit) => {
  return `${quantity} ${unit}`;
};

// Converts a stored requirement date to the YYYY-MM-DD text used by the form.
export const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

export const getTodayInputValue = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${today.getFullYear()}-${month}-${day}`;
};

export const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
};

export const formatCompactDateTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return isToday ? formatTime(value) : formatDate(value);
};
