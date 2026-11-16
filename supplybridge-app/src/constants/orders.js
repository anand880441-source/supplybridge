// Order statuses and transitions mirror the backend order module.
export const ACTIVE_ORDER_STATUSES = ["confirmed", "processing", "shipped"];

export const ORDER_STATUS_META = {
  confirmed: {
    label: "Confirmed",
    icon: "checkmark-circle-outline",
    backgroundColor: "#EDFDF3",
    textColor: "#164E43"
  },
  processing: {
    label: "Processing",
    icon: "construct-outline",
    backgroundColor: "#FDF3DD",
    textColor: "#8A5B00"
  },
  shipped: {
    label: "Shipped",
    icon: "car-outline",
    backgroundColor: "#EAF3FB",
    textColor: "#235C8A"
  },
  delivered: {
    label: "Delivered",
    icon: "checkmark-done-outline",
    backgroundColor: "#E6F7EF",
    textColor: "#1B6B4F"
  },
  cancelled: {
    label: "Cancelled",
    icon: "close-circle-outline",
    backgroundColor: "#FDEEE9",
    textColor: "#B14B2F"
  }
};

export const ORDER_PROGRESS_STEPS = [
  {
    value: "confirmed",
    label: "Confirmed",
    icon: "checkmark-circle-outline"
  },
  {
    value: "processing",
    label: "Processing",
    icon: "construct-outline"
  },
  {
    value: "shipped",
    label: "Shipped",
    icon: "car-outline"
  },
  {
    value: "delivered",
    label: "Delivered",
    icon: "checkmark-done-outline"
  }
];

export const ORDER_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" }
];

export const ORDER_STATUS_ACTION_META = {
  processing: {
    label: "Start processing",
    confirmTitle: "Start processing",
    confirmMessage:
      "Let the buyer know you have started preparing this order.",
    successMessage: "The buyer can now see that this order is processing."
  },
  shipped: {
    label: "Dispatch order",
    confirmTitle: "Dispatch order",
    confirmMessage:
      "Enter the courier, tracking number, dispatch date, and package count.",
    successMessage: "The buyer can now see the shipment and track it."
  },
  delivered: {
    label: "Confirm delivery",
    confirmTitle: "Confirm delivery",
    confirmMessage:
      "Confirm that you received the full consignment in acceptable condition. This completes the order and releases the seller's EMD.",
    successMessage: "Delivery is confirmed and the order is complete."
  },
  cancelled: {
    label: "Cancel order",
    confirmTitle: "Cancel order",
    confirmMessage:
      "This cancels the order for both sides. If the seller cancels, the EMD is forfeited to the buyer.",
    successMessage: "This order has been cancelled."
  }
};

export const getOrderStatusMeta = (status) => {
  return ORDER_STATUS_META[status] || ORDER_STATUS_META.confirmed;
};

export const getOrderActionMeta = (status) => {
  return (
    ORDER_STATUS_ACTION_META[status] || {
      label: "Update order",
      confirmTitle: "Update order",
      confirmMessage: "Change the status of this order?",
      successMessage: "The order status was updated."
    }
  );
};

export const getOrderProgressIndex = (status) => {
  const index = ORDER_PROGRESS_STEPS.findIndex(
    (step) => step.value === status
  );

  return index >= 0 ? index : 0;
};

export const getOrderStatusTimelineNote = (status) => {
  const notes = {
    confirmed: "Quotation accepted · EMD captured",
    processing: "Seller started preparation",
    shipped: "Goods dispatched · EMD still captured",
    delivered: "Buyer confirmed receipt · EMD released",
    cancelled: "Order cancelled · EMD settled"
  };

  return notes[status] || "";
};

export const getOrderNextStep = (order) => {
  const nextStatus = (order.allowedTransitions || []).find(
    (status) => status !== "cancelled"
  );

  if (order.status === "delivered") {
    return {
      tone: "success",
      icon: "checkmark-done-outline",
      eyebrow: "ORDER COMPLETE",
      title: "Delivered successfully",
      description:
        "The buyer confirmed receipt and this order is complete. No further action is needed.",
      nextStatus: null
    };
  }

  if (order.status === "cancelled") {
    return {
      tone: "danger",
      icon: "close-circle-outline",
      eyebrow: "ORDER CLOSED",
      title: "This order was cancelled",
      description:
        "This order will not be fulfilled. You can still message the other business if you need to clarify anything.",
      nextStatus: null
    };
  }

  if (order.isSeller) {
    if (order.status === "shipped") {
      return {
        tone: "info",
        icon: "navigate-outline",
        eyebrow: "IN TRANSIT",
        title: "Waiting for the buyer to confirm delivery",
        description:
          "The buyer confirms receipt after the consignment arrives. You can correct courier or tracking details while the order is in transit.",
        nextStatus: null
      };
    }

    const sellerGuidance = {
      processing: {
        title: "Start preparing this order",
        description:
          "Begin preparing the goods. Dispatch the order with courier and tracking details when they leave your premises."
      }
    };
    const guidance = sellerGuidance[nextStatus] || {
      title: "Update the order",
      description:
        "Update the order when the next fulfilment milestone is complete."
    };

    return {
      tone: "action",
      icon: getOrderStatusMeta(nextStatus).icon,
      eyebrow: "YOUR NEXT STEP",
      title: guidance.title,
      description: guidance.description,
      nextStatus
    };
  }

  if (order.status === "shipped") {
    return {
      tone: "action",
      icon: "checkmark-done-outline",
      eyebrow: "DELIVERY CONFIRMATION",
      title: "Confirm that the goods arrived",
      description:
        "Check the consignment against the order. Confirm delivery only after the full quantity is received in acceptable condition.",
      nextStatus: "delivered"
    };
  }

  const buyerGuidance = {
    confirmed: {
      title: "Waiting for the seller to begin",
      description:
        "The agreed terms are locked in. The seller has been notified and will start preparing the goods."
    },
    processing: {
      title: "Your order is being prepared",
      description:
        "The seller is preparing your goods. You can cancel until the order is dispatched."
    }
  };
  const guidance = buyerGuidance[order.status] || buyerGuidance.confirmed;

  return {
    tone: "info",
    icon: getOrderStatusMeta(order.status).icon,
    eyebrow: "WAITING ON SELLER",
    title: guidance.title,
    description: guidance.description,
    nextStatus: null
  };
};

export const getOrderCardNextStep = (order) => {
  if (order.status === "delivered") {
    return {
      tone: "success",
      icon: "checkmark-done-outline",
      text: "Completed"
    };
  }

  if (order.status === "cancelled") {
    return {
      tone: "danger",
      icon: "close-circle-outline",
      text: "No further action"
    };
  }

  if (order.isSeller) {
    if (order.status === "shipped") {
      return {
        tone: "info",
        icon: "navigate-outline",
        text: "Awaiting buyer delivery confirmation"
      };
    }

    const nextStatus = (order.allowedTransitions || []).find(
      (status) => status !== "cancelled"
    );

    return {
      tone: "action",
      icon: nextStatus
        ? getOrderStatusMeta(nextStatus).icon
        : "cube-outline",
      text: nextStatus
        ? `Next: ${getOrderActionMeta(nextStatus).label}`
        : "Update the order"
    };
  }

  const buyerText = {
    confirmed: "Waiting for the seller to start",
    processing: "Seller is preparing your order",
    shipped: "Confirm delivery after the goods arrive"
  };

  return {
    tone: order.status === "shipped" ? "action" : "info",
    icon: getOrderStatusMeta(order.status).icon,
    text: buyerText[order.status] || "Waiting for the seller"
  };
};
