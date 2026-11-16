import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import BusinessAvatar from "../../components/common/BusinessAvatar";
import StatusPill from "../../components/common/StatusPill";
import OrderDeliveryModal from "../../components/orders/OrderDeliveryModal";
import OrderProgress from "../../components/orders/OrderProgress";
import OrderShipmentModal from "../../components/orders/OrderShipmentModal";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import RatingStars from "../../components/reviews/RatingStars";
import ReviewCard from "../../components/reviews/ReviewCard";
import ReviewModal from "../../components/reviews/ReviewModal";
import { getCounterpartRoleLabel } from "../../constants/messages";
import {
  getOrderActionMeta,
  getOrderNextStep,
  getOrderStatusMeta,
  getOrderStatusTimelineNote
} from "../../constants/orders";
import {
  BUYER_CANCELLATION_REASONS,
  SELLER_CANCELLATION_REASONS,
  getCancellationReasonLabel,
  getEmdStatusMeta
} from "../../constants/procurement";
import { getQuotationOfferTypeMeta } from "../../constants/quotations";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { createConversation } from "../../services/conversationService";
import {
  getOrderById,
  updateOrderShipment,
  updateOrderStatus
} from "../../services/orderService";
import {
  createReview,
  getOrderReview
} from "../../services/reviewService";
import {
  formatCompactDateTime,
  formatCurrency,
  formatDate,
  formatQuantity
} from "../../utils/formatters";
import {
  formatRatingAverage,
  getBusinessRating
} from "../../utils/ratings";

function InfoSection({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.secondary} />

      <View style={styles.infoTextBlock}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function OrderDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { notificationVersion } = useNotifications();

  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isShipmentModalVisible, setIsShipmentModalVisible] = useState(false);
  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);
  const [shipmentMode, setShipmentMode] = useState("dispatch");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationNote, setCancellationNote] = useState("");
  const [reviewState, setReviewState] = useState(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const hasLoadedRef = useRef(false);

  const loadOrder = useCallback(
    async ({ showSpinner = false, refresh = false } = {}) => {
      if (showSpinner) {
        setIsLoading(true);
      }

      if (refresh) {
        setIsRefreshing(true);
      }

      setError("");

      try {
        const response = await getOrderById(token, orderId);
        setOrder(response.data);
        hasLoadedRef.current = true;
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, orderId]
  );

  useFocusEffect(
    useCallback(() => {
      loadOrder({ showSpinner: !hasLoadedRef.current });
    }, [loadOrder])
  );

  useEffect(() => {
    if (notificationVersion > 0) {
      loadOrder();
    }
  }, [notificationVersion, loadOrder]);

  const loadReviewState = useCallback(async () => {
    try {
      const response = await getOrderReview(token, orderId);
      setReviewState(response.data);
    } catch (reviewError) {
      setReviewState(null);
    }
  }, [token, orderId]);

  useEffect(() => {
    if (order?.status === "delivered") {
      loadReviewState();
    } else {
      setReviewState(null);
    }
  }, [order?.status, loadReviewState]);

  const runStatusUpdate = async (nextStatus, details = {}) => {
    const actionMeta = getOrderActionMeta(nextStatus);

    setActiveAction(nextStatus);

    try {
      const response = await updateOrderStatus(
        token,
        orderId,
        nextStatus,
        details
      );
      setOrder(response.data);
      Alert.alert("Order updated", actionMeta.successMessage);
    } catch (actionError) {
      Alert.alert("Could not update order", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const confirmStatusUpdate = (nextStatus) => {
    if (nextStatus === "shipped") {
      setShipmentMode("dispatch");
      setIsShipmentModalVisible(true);
      return;
    }

    if (nextStatus === "delivered") {
      setIsDeliveryModalVisible(true);
      return;
    }

    const actionMeta = getOrderActionMeta(nextStatus);

    Alert.alert(actionMeta.confirmTitle, actionMeta.confirmMessage, [
      { text: "Not now", style: "cancel" },
      {
        text: actionMeta.label,
        style: nextStatus === "cancelled" ? "destructive" : "default",
        onPress: () => runStatusUpdate(nextStatus)
      }
    ]);
  };

  const submitShipment = async (shipment) => {
    setActiveAction("shipment");

    try {
      const response =
        shipmentMode === "update"
          ? await updateOrderShipment(token, orderId, shipment)
          : await updateOrderStatus(token, orderId, "shipped", shipment);

      setOrder(response.data);
      setIsShipmentModalVisible(false);
      Alert.alert(
        shipmentMode === "update" ? "Shipment updated" : "Order dispatched",
        shipmentMode === "update"
          ? "The buyer can see the corrected tracking details."
          : "The buyer can now track the shipment."
      );
    } catch (actionError) {
      Alert.alert("Could not save shipment", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const submitDelivery = async (delivery) => {
    setActiveAction("delivered");

    try {
      const response = await updateOrderStatus(
        token,
        orderId,
        "delivered",
        delivery
      );
      setOrder(response.data);
      setIsDeliveryModalVisible(false);
      Alert.alert(
        "Delivery confirmed",
        "The order is complete and the seller's EMD has been released."
      );
    } catch (actionError) {
      Alert.alert("Could not confirm delivery", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const submitReview = async ({ rating, comment }) => {
    setActiveAction("review");

    try {
      const response = await createReview(token, {
        orderId,
        rating,
        comment
      });

      setReviewState((currentState) => ({
        ...(currentState || {}),
        canReview: false,
        myReview: response.data.review
      }));
      setIsReviewModalVisible(false);
      Alert.alert(
        "Review submitted",
        "Your feedback is now visible to other businesses."
      );
    } finally {
      setActiveAction("");
    }
  };

  const openTracking = async () => {
    const shipment = order?.shipment;
    const destination =
      shipment?.trackingUrl ||
      (shipment?.trackingNumber
        ? `https://www.google.com/search?q=${encodeURIComponent(
            `${shipment.courierName || "courier"} ${shipment.trackingNumber} tracking`
          )}`
        : "");

    if (!destination) {
      return;
    }

    try {
      await Linking.openURL(destination);
    } catch (error) {
      Alert.alert("Could not open tracking", "Please check the tracking link.");
    }
  };

  const shareOrder = async () => {
    try {
      await Share.share({
        message: [
          `SupplyBridge order ${order.orderNumber}`,
          order.productName,
          `${order.quantity} ${order.unit}`,
          `Amount: ${formatCurrency(order.grandTotal ?? order.totalPrice)}`,
          `Delivery by: ${formatDate(order.deliveryDate)}`,
          order.shipment?.trackingNumber
            ? `Tracking: ${order.shipment.courierName} ${order.shipment.trackingNumber}`
            : ""
        ]
          .filter(Boolean)
          .join("\n")
      });
    } catch (error) {
      // The share sheet may be dismissed without a message.
    }
  };

  const openTerms = (sectionId) => {
    setIsShipmentModalVisible(false);
    setIsDeliveryModalVisible(false);
    navigation.navigate("ProcurementPolicy", { sectionId });
  };

  const openCancelModal = () => {
    setCancellationReason("");
    setCancellationNote("");
    setIsCancelModalVisible(true);
  };

  const submitCancellation = async () => {
    if (!cancellationReason) {
      Alert.alert("Choose a reason", "Please select a cancellation reason.");
      return;
    }

    setActiveAction("cancelled");

    try {
      const response = await updateOrderStatus(token, orderId, "cancelled", {
        cancellationReason,
        cancellationNote: cancellationNote.trim()
      });

      setOrder(response.data);
      setIsCancelModalVisible(false);
      Alert.alert(
        "Order cancelled",
        order.isSeller
          ? "The order was cancelled and your EMD was forfeited to the buyer."
          : "The order was cancelled and the seller's EMD was released."
      );
    } catch (actionError) {
      Alert.alert("Could not cancel order", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const openConversation = async () => {
    setActiveAction("message");

    try {
      const response = await createConversation(token, order.quotationId);

      navigation.navigate("Conversation", {
        conversationId: response.data.id
      });
    } catch (actionError) {
      Alert.alert("Could not open conversation", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  if (isLoading && !order) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />

        <View style={styles.stateIconCircle}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.coral}
          />
        </View>

        <Text style={styles.stateTitle}>Could not load the order</Text>
        <Text style={styles.stateDescription}>{error}</Text>

        <AppButton
          title="Try again"
          onPress={() => loadOrder({ showSpinner: true })}
          style={styles.stateButton}
        />

        <AppButton
          title="Go back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.stateButton}
        />
      </View>
    );
  }

  const counterpart = order.counterpart || {};
  const business = counterpart.business || {};
  const counterpartRole = getCounterpartRoleLabel(counterpart.role);
  const counterpartRating = getBusinessRating(business, counterpart.role);
  const offerMeta = getQuotationOfferTypeMeta(order.offerType);
  const nextStep = getOrderNextStep(order);
  const allowedTransitions = order.allowedTransitions || [];
  const canCancel = allowedTransitions.includes("cancelled");
  const canUpdateShipment =
    order.isSeller && order.status === "shipped" && Boolean(order.shipment);
  const canConfirmDelivery =
    order.isBuyer && order.status === "shipped";
  const isCancelled = order.status === "cancelled";
  const shipment = order.shipment;
  const deliveryAddress = order.deliveryAddress;
  const statusHistory = order.statusHistory || [];
  const emdMeta = getEmdStatusMeta(order.emdStatus);
  const grandTotal = order.grandTotal ?? order.totalPrice;
  const isIntraState =
    Number(order.cgstAmount || 0) > 0 ||
    Number(order.sgstAmount || 0) > 0;
  const cancellationReasonOptions = order.isSeller
    ? SELLER_CANCELLATION_REASONS
    : BUYER_CANCELLATION_REASONS;
  const cancelHint = order.isSeller
    ? "Seller cancellation is final and forfeits the EMD to the buyer."
    : "Buyer cancellation releases the seller's EMD. You can cancel until the seller marks it shipped.";
  const nextStepTone =
    {
      action: {
        card: styles.nextStepCardAction,
        iconCircle: styles.nextStepIconAction,
        iconColor: "#8A5B00"
      },
      info: {
        card: styles.nextStepCardInfo,
        iconCircle: styles.nextStepIconInfo,
        iconColor: colors.secondary
      },
      success: {
        card: styles.nextStepCardSuccess,
        iconCircle: styles.nextStepIconSuccess,
        iconColor: colors.success
      },
      danger: {
        card: styles.nextStepCardDanger,
        iconCircle: styles.nextStepIconDanger,
        iconColor: colors.error
      }
    }[nextStep.tone] || {
      card: styles.nextStepCardInfo,
      iconCircle: styles.nextStepIconInfo,
      iconColor: colors.secondary
    };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadOrder({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <OrderStatusBadge status={order.status} />
          </View>

          <View style={styles.businessHeaderRow}>
            <BusinessAvatar business={business} size={40} />
            <View style={styles.businessHeaderText}>
              <Text style={styles.businessHeaderName} numberOfLines={1}>
                {business.companyName || counterpartRole}
              </Text>
              <Text style={styles.businessHeaderMeta}>
                {counterpartRole}
                {order.buyerReference ? ` · Ref ${order.buyerReference}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={shareOrder}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Share order summary"
              style={styles.shareButton}
            >
              <Ionicons
                name="share-outline"
                size={19}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <Text style={styles.headerTitle}>{order.productName}</Text>
          <Text style={styles.totalPrice}>
            {formatCurrency(grandTotal)}
          </Text>
          <Text style={styles.unitPrice}>
            Grand total · {formatCurrency(order.unitPrice)} per {order.unit} ·{" "}
            {offerMeta.label}
          </Text>
        </View>

        <OrderProgress status={order.status} />

        {shipment ? (
          <View style={styles.shipmentCard}>
            <View style={styles.shipmentHeader}>
              <View style={styles.shipmentIcon}>
                <Ionicons
                  name="car-outline"
                  size={19}
                  color={colors.info}
                />
              </View>
              <View style={styles.shipmentHeaderText}>
                <Text style={styles.shipmentEyebrow}>SHIPMENT</Text>
                <Text style={styles.shipmentTitle}>
                  {shipment.courierName}
                </Text>
              </View>
              <StatusPill
                label={order.status === "delivered" ? "Delivered" : "In transit"}
                tone={order.status === "delivered" ? "success" : "info"}
              />
            </View>

            <View style={styles.shipmentTrackingBox}>
              <Text style={styles.trackingLabel}>TRACKING NUMBER</Text>
              <Text style={styles.trackingValue}>
                {shipment.trackingNumber}
              </Text>
            </View>

            <View style={styles.shipmentMetaRow}>
              <View style={styles.shipmentMetaBlock}>
                <Text style={styles.shipmentMetaLabel}>Dispatched</Text>
                <Text style={styles.shipmentMetaValue}>
                  {formatDate(shipment.dispatchDate)}
                </Text>
              </View>
              <View style={styles.shipmentMetaBlock}>
                <Text style={styles.shipmentMetaLabel}>Packages</Text>
                <Text style={styles.shipmentMetaValue}>
                  {shipment.packageCount}
                </Text>
              </View>
            </View>

            {shipment.dispatchNote ? (
              <Text style={styles.shipmentNote}>{shipment.dispatchNote}</Text>
            ) : null}

            <View style={styles.shipmentActions}>
              <AppButton
                title="Track shipment"
                onPress={openTracking}
                variant="secondary"
                style={styles.shipmentActionButton}
              />

              {canUpdateShipment ? (
                <AppButton
                  title="Update details"
                  onPress={() => {
                    setShipmentMode("update");
                    setIsShipmentModalVisible(true);
                  }}
                  variant="secondary"
                  style={styles.shipmentActionButton}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {canConfirmDelivery ? (
          <View style={styles.deliveryPromptCard}>
            <View style={styles.deliveryPromptTop}>
              <View style={styles.deliveryPromptIcon}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={22}
                  color={colors.success}
                />
              </View>
              <View style={styles.deliveryPromptText}>
                <Text style={styles.deliveryPromptTitle}>
                  Has the consignment arrived?
                </Text>
                <Text style={styles.deliveryPromptDescription}>
                  Check the quantity and condition. Only you can confirm
                  delivery and complete the order.
                </Text>
              </View>
            </View>
            <AppButton
              title="Confirm delivery"
              onPress={() => setIsDeliveryModalVisible(true)}
              style={styles.deliveryPromptButton}
            />
          </View>
        ) : null}

        {isCancelled ? (
          <View style={styles.cancellationCard}>
            <View style={styles.cancellationHeader}>
              <Ionicons
                name="close-circle-outline"
                size={18}
                color={colors.error}
              />
              <Text style={styles.cancellationTitle}>Order cancelled</Text>
            </View>
            <Text style={styles.cancellationReason}>
              {getCancellationReasonLabel(order.cancellationReason)}
            </Text>
            {order.cancellationNote ? (
              <Text style={styles.cancellationNote}>
                {order.cancellationNote}
              </Text>
            ) : null}
            {order.cancelledByRole ? (
              <Text style={styles.cancellationMeta}>
                Cancelled by {order.cancelledByRole}
                {order.cancelledAt
                  ? ` • ${formatDate(order.cancelledAt)}`
                  : ""}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!isCancelled ? (
          <View style={[styles.nextStepCard, nextStepTone.card]}>
            <View
              style={[
                styles.nextStepIconCircle,
                nextStepTone.iconCircle
              ]}
            >
              <Ionicons
                name={nextStep.icon}
                size={22}
                color={nextStepTone.iconColor}
              />
            </View>

            <View style={styles.nextStepTextBlock}>
              <Text style={styles.nextStepEyebrow}>
                {nextStep.eyebrow}
              </Text>
              <Text style={styles.nextStepTitle}>{nextStep.title}</Text>
              <Text style={styles.nextStepDescription}>
                {nextStep.description}
              </Text>

              {nextStep.nextStatus ? (
                <AppButton
                  title={getOrderActionMeta(nextStep.nextStatus).label}
                  onPress={() => confirmStatusUpdate(nextStep.nextStatus)}
                  loading={activeAction === nextStep.nextStatus}
                  disabled={Boolean(activeAction)}
                  style={styles.nextStepButton}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {order.status === "delivered" && reviewState?.canReview ? (
          <View style={styles.reviewPromptCard}>
            <View style={styles.reviewPromptHeader}>
              <View style={styles.reviewPromptIcon}>
                <Ionicons
                  name="star-outline"
                  size={22}
                  color={colors.warning}
                />
              </View>
              <View style={styles.reviewPromptText}>
                <Text style={styles.reviewPromptTitle}>
                  Rate your experience
                </Text>
                <Text style={styles.reviewPromptDescription}>
                  How did {business.companyName || counterpartRole} handle
                  this order? Reviews are public and linked to the delivered
                  order.
                </Text>
              </View>
            </View>

            <View style={styles.reviewPromptRating}>
              <RatingStars value={0} size={18} />
              <Text style={styles.reviewPromptRatingText}>
                {counterpartRating.count > 0
                  ? `Currently rated ${formatRatingAverage(
                      counterpartRating.average
                    )} by ${counterpartRating.count} ${
                      counterpartRating.count === 1 ? "business" : "businesses"
                    }`
                  : "Be the first to review this business"}
              </Text>
            </View>

            <AppButton
              title={`Review ${counterpartRole.toLowerCase()}`}
              onPress={() => setIsReviewModalVisible(true)}
              style={styles.reviewPromptButton}
            />
          </View>
        ) : null}

        {reviewState?.myReview ? (
          <View style={styles.reviewSection}>
            <View style={styles.reviewSectionHeader}>
              <Text style={styles.reviewSectionTitle}>Your review</Text>
              <Text style={styles.reviewSectionDate}>
                {formatDate(reviewState.myReview.createdAt)}
              </Text>
            </View>
            <ReviewCard review={reviewState.myReview} />
          </View>
        ) : null}

        {canCancel ? (
          <View style={styles.cancelBlock}>
            <View style={styles.cancelHintRow}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={colors.textMuted}
              />
              <Text style={styles.cancelHint}>{cancelHint}</Text>
            </View>
            <AppButton
              title={getOrderActionMeta("cancelled").label}
              onPress={openCancelModal}
              variant="danger"
              disabled={Boolean(activeAction)}
              style={styles.cancelButton}
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <InfoSection title={counterpartRole}>
          <View style={styles.businessRow}>
            <BusinessAvatar business={business} size={46} />
            <View style={styles.businessRowText}>
              <Text style={styles.businessName}>
                {business.companyName || counterpartRole}
              </Text>
              <Text style={styles.businessMeta}>
                {business.businessType || counterpartRole}
                {business.city ? ` · ${business.city}` : ""}
                {business.state ? `, ${business.state}` : ""}
              </Text>
              <Text style={styles.verificationText}>
                {business.verificationStatus === "verified"
                  ? "Verified business"
                  : "Verification not completed"}
              </Text>

              {counterpartRating.count > 0 ? (
                <View style={styles.businessRatingRow}>
                  <RatingStars value={counterpartRating.average} size={11} />
                  <Text style={styles.businessRatingText}>
                    {formatRatingAverage(counterpartRating.average)} (
                    {counterpartRating.count}{" "}
                    {counterpartRating.count === 1 ? "review" : "reviews"})
                  </Text>
                </View>
              ) : (
                <Text style={styles.businessNoRating}>No reviews yet</Text>
              )}
            </View>
          </View>

          {business.id ? (
            <AppButton
              title={`View ${counterpartRole.toLowerCase()} profile`}
              onPress={() =>
                navigation.navigate("PublicBusinessProfile", {
                  businessId: String(business.id)
                })
              }
              variant="secondary"
              style={styles.sectionButton}
            />
          ) : null}

          <AppButton
            title={`Message ${counterpartRole.toLowerCase()}`}
            onPress={openConversation}
            variant="secondary"
            loading={activeAction === "message"}
            disabled={Boolean(activeAction)}
            style={styles.sectionButton}
          />
        </InfoSection>

        <InfoSection title="Delivery terms">
          <InfoRow
            icon="cube-outline"
            label="Quantity"
            value={formatQuantity(order.quantity, order.unit)}
          />
          <InfoRow
            icon="calendar-outline"
            label="Delivery date"
            value={formatDate(order.deliveryDate)}
          />

          {deliveryAddress ? (
            <>
              <InfoRow
                icon="person-outline"
                label="Delivery contact"
                value={`${deliveryAddress.contactName || "Not recorded"}${
                  deliveryAddress.phone ? ` · ${deliveryAddress.phone}` : ""
                }`}
              />
              <InfoRow
                icon="location-outline"
                label="Ship-to address"
                value={[
                  deliveryAddress.line1,
                  deliveryAddress.landmark,
                  deliveryAddress.city,
                  deliveryAddress.state,
                  deliveryAddress.pincode
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
              {deliveryAddress.instructions ? (
                <InfoRow
                  icon="information-circle-outline"
                  label="Delivery instructions"
                  value={deliveryAddress.instructions}
                />
              ) : null}
            </>
          ) : (
            <InfoRow
              icon="location-outline"
              label="Delivery location"
              value={order.deliveryLocation}
            />
          )}
          <InfoRow
            icon="pricetag-outline"
            label="Agreed unit price"
            value={`${formatCurrency(order.unitPrice)} per ${order.unit}`}
          />
          <InfoRow
            icon="wallet-outline"
            label={`Agreed taxable value (GST ${order.gstRate || 0}%)`}
            value={formatCurrency(order.taxableValue ?? order.totalPrice)}
          />
          {order.gstRate > 0 && isIntraState ? (
            <>
              <InfoRow
                icon="receipt-outline"
                label={`CGST (${order.gstRate / 2}%)`}
                value={formatCurrency(order.cgstAmount || 0)}
              />
              <InfoRow
                icon="receipt-outline"
                label={`SGST (${order.gstRate / 2}%)`}
                value={formatCurrency(order.sgstAmount || 0)}
              />
            </>
          ) : (
            <InfoRow
              icon="receipt-outline"
              label={`IGST (${order.gstRate || 0}%)`}
              value={formatCurrency(order.igstAmount || 0)}
            />
          )}
          <InfoRow
            icon="checkmark-circle-outline"
            label="Grand total"
            value={formatCurrency(grandTotal)}
          />
        </InfoSection>

        <InfoSection title="Tax, terms, and EMD records">
          <InfoRow
            icon="location-outline"
            label="Place of supply"
            value={order.placeOfSupply || "Not recorded"}
          />
          <InfoRow
            icon="document-text-outline"
            label="Seller GSTIN"
            value={order.sellerGstin || "Not provided"}
          />
          {order.buyerGstin ? (
            <InfoRow
              icon="business-outline"
              label="Buyer GSTIN"
              value={order.buyerGstin}
            />
          ) : null}
          <InfoRow
            icon="shield-checkmark-outline"
            label={`${emdMeta.label} (${order.emdRate || 0}%)`}
            value={formatCurrency(order.emdAmount || 0)}
          />
          {order.sellerTermsVersion || order.termsVersion ? (
            <InfoRow
              icon="reader-outline"
              label="Seller terms accepted"
              value={`${order.sellerTermsVersion || order.termsVersion}${
                order.sellerTermsAcceptedAt
                  ? ` · ${formatDate(order.sellerTermsAcceptedAt)}`
                  : ""
              }`}
            />
          ) : null}
          {order.buyerTermsVersion ? (
            <InfoRow
              icon="reader-outline"
              label="Buyer terms accepted"
              value={`${order.buyerTermsVersion}${
                order.buyerTermsAcceptedAt
                  ? ` · ${formatDate(order.buyerTermsAcceptedAt)}`
                  : ""
              }`}
            />
          ) : null}
          {order.buyerReference ? (
            <InfoRow
              icon="pricetag-outline"
              label="Buyer reference"
              value={order.buyerReference}
            />
          ) : null}
          {order.emdSettledAt ? (
            <InfoRow
              icon="time-outline"
              label="EMD settled"
              value={formatDate(order.emdSettledAt)}
            />
          ) : null}

          <AppButton
            title="Read order and delivery terms"
            onPress={() => openTerms("orders")}
            variant="secondary"
            style={styles.sectionButton}
          />
        </InfoSection>

        <InfoSection title="Status history">
          {statusHistory.map((entry, index) => {
            const entryMeta = getOrderStatusMeta(entry.status);
            const isLatest = index === statusHistory.length - 1;

            return (
              <View
                key={`${entry.status}-${entry.changedAt}`}
                style={styles.timelineRow}
              >
                <View
                  style={[
                    styles.timelineIconCircle,
                    isLatest && styles.timelineIconCircleActive
                  ]}
                >
                  <Ionicons
                    name={entryMeta.icon}
                    size={12}
                    color={isLatest ? colors.white : colors.textMuted}
                  />
                </View>
                <View style={styles.timelineTextBlock}>
                  <Text
                    style={[
                      styles.timelineStatus,
                      isLatest && styles.timelineStatusActive
                    ]}
                  >
                    {entryMeta.label}
                  </Text>
                  <Text style={styles.timelineNote}>
                    {entry.note || getOrderStatusTimelineNote(entry.status)}
                  </Text>
                  <Text style={styles.timelineDate}>
                    {entry.actorRole === "seller"
                      ? "Seller"
                      : entry.actorRole === "buyer"
                        ? "Buyer"
                        : "SupplyBridge"}{" "}
                    · {formatCompactDateTime(entry.changedAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </InfoSection>

        <View style={styles.actionsBlock}>
          <AppButton
            title="View accepted quotation"
            onPress={() =>
              navigation.navigate("QuotationDetail", {
                quotationId: order.quotationId
              })
            }
            variant="secondary"
          />
        </View>

        <Text style={styles.footerNote}>
          Payment and tax invoicing are handled directly between both
          businesses. SupplyBridge records the agreed order, GST snapshot, EMD
          outcome, and fulfilment status.
        </Text>
      </ScrollView>

      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsCancelModalVisible(false)}
          />

          <ScrollView
            contentContainerStyle={[
              styles.modalCard,
              { paddingBottom: insets.bottom + spacing.md }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTitle}>Cancel this order?</Text>
            <Text style={styles.modalDescription}>
              {order.isSeller
                ? "The buyer will see that you cancelled. Your captured EMD will be forfeited and credited to the buyer."
                : "The seller's captured EMD will be released back to them. This action cannot be undone."}
            </Text>

            <Text style={styles.modalFieldLabel}>Reason *</Text>
            {cancellationReasonOptions.map((option) => {
              const isSelected = cancellationReason === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCancellationReason(option.value)}
                  style={[
                    styles.reasonRow,
                    isSelected && styles.reasonRowSelected
                  ]}
                >
                  <View
                    style={[
                      styles.reasonRadio,
                      isSelected && styles.reasonRadioSelected
                    ]}
                  >
                    {isSelected ? (
                      <View style={styles.reasonRadioDot} />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.reasonLabel,
                      isSelected && styles.reasonLabelSelected
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}

            <AppInput
              label="Note (optional)"
              value={cancellationNote}
              onChangeText={setCancellationNote}
              placeholder="Add a short explanation"
              multiline
              maxLength={500}
            />

            <AppButton
              title="Confirm cancellation"
              onPress={submitCancellation}
              loading={activeAction === "cancelled"}
              variant="danger"
            />

            <AppButton
              title="Keep order"
              onPress={() => setIsCancelModalVisible(false)}
              variant="secondary"
              style={styles.modalCancelButton}
            />
          </ScrollView>
        </View>
      </Modal>

      <OrderShipmentModal
        visible={isShipmentModalVisible}
        order={order}
        isUpdate={shipmentMode === "update"}
        loading={activeAction === "shipment"}
        onClose={() => setIsShipmentModalVisible(false)}
        onConfirm={submitShipment}
        onOpenTerms={() => openTerms("shipment")}
      />

      <OrderDeliveryModal
        visible={isDeliveryModalVisible}
        order={order}
        loading={activeAction === "delivered"}
        onClose={() => setIsDeliveryModalVisible(false)}
        onConfirm={submitDelivery}
        onOpenTerms={() => openTerms("delivery")}
      />

      <ReviewModal
        visible={isReviewModalVisible}
        businessName={business.companyName}
        revieweeRole={counterpart.role}
        loading={activeAction === "review"}
        onClose={() => setIsReviewModalVisible(false)}
        onSubmit={submitReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  centeredState: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center"
  },
  stateDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg
  },
  stateButton: {
    width: "100%",
    marginBottom: spacing.sm
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  orderNumber: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 0.6,
    marginRight: spacing.sm
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  totalPrice: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary
  },
  unitPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  nextStepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  nextStepCardAction: {
    backgroundColor: "#FFF9EC",
    borderColor: "#F0D190"
  },
  nextStepCardInfo: {
    backgroundColor: colors.mint,
    borderColor: "#D5EBE0"
  },
  nextStepCardSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: "#CDE8DC"
  },
  nextStepCardDanger: {
    backgroundColor: colors.errorSoft,
    borderColor: "#F4CFC4"
  },
  nextStepIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  nextStepIconAction: {
    backgroundColor: "#FDF3DD"
  },
  nextStepIconInfo: {
    backgroundColor: colors.white
  },
  nextStepIconSuccess: {
    backgroundColor: colors.white
  },
  nextStepIconDanger: {
    backgroundColor: colors.white
  },
  nextStepTextBlock: {
    flex: 1
  },
  nextStepEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2
  },
  nextStepTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 2
  },
  nextStepDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary
  },
  nextStepButton: {
    marginTop: spacing.md
  },
  cancelBlock: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  cancelHintRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  cancelHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginLeft: spacing.xs
  },
  cancelButton: {
    marginTop: spacing.sm
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm
  },
  sectionButton: {
    marginTop: spacing.md
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  infoTextBlock: {
    flex: 1,
    marginLeft: spacing.md
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary
  },
  businessName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  businessMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary,
    marginTop: spacing.xs
  },
  businessRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs
  },
  businessRatingText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: spacing.xs
  },
  businessNoRating: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  reviewPromptCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#F0D190",
    padding: spacing.md,
    marginBottom: spacing.md
  },
  reviewPromptHeader: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  reviewPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  reviewPromptText: {
    flex: 1
  },
  reviewPromptTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  reviewPromptDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2
  },
  reviewPromptRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#F0D190",
    padding: spacing.sm,
    marginTop: spacing.md
  },
  reviewPromptRatingText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginLeft: spacing.sm
  },
  reviewPromptButton: {
    marginTop: spacing.sm
  },
  reviewSection: {
    marginBottom: spacing.md
  },
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  reviewSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  reviewSectionDate: {
    fontSize: 10,
    color: colors.textMuted
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md
  },
  timelineIconCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  timelineIconCircleActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  timelineTextBlock: {
    flex: 1,
    paddingTop: 1
  },
  timelineStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary
  },
  timelineStatusActive: {
    fontWeight: "800",
    color: colors.textPrimary
  },
  timelineNote: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1
  },
  timelineDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  businessHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md
  },
  businessHeaderText: {
    flex: 1,
    marginLeft: spacing.sm
  },
  businessHeaderName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary
  },
  businessHeaderMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  shipmentCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  shipmentHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  shipmentIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  shipmentHeaderText: {
    flex: 1
  },
  shipmentEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6
  },
  shipmentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 1
  },
  shipmentTrackingBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.sm,
    marginTop: spacing.sm
  },
  trackingLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2
  },
  trackingValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.6
  },
  shipmentMetaRow: {
    flexDirection: "row",
    marginTop: spacing.sm
  },
  shipmentMetaBlock: {
    flex: 1
  },
  shipmentMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase"
  },
  shipmentMetaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 1
  },
  shipmentNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  shipmentActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  shipmentActionButton: {
    flex: 1
  },
  deliveryPromptCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#CDE8DC",
    padding: spacing.md,
    marginBottom: spacing.md
  },
  deliveryPromptTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  deliveryPromptIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  deliveryPromptText: {
    flex: 1
  },
  deliveryPromptTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary
  },
  deliveryPromptDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2
  },
  deliveryPromptButton: {
    marginTop: spacing.sm
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  businessRowText: {
    flex: 1,
    marginLeft: spacing.sm
  },
  actionsBlock: {
    marginTop: spacing.sm
  },
  footerNote: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg
  },
  cancellationCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#F4CFC4",
    padding: spacing.md,
    marginBottom: spacing.md
  },
  cancellationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.error,
    marginLeft: spacing.xs
  },
  cancellationReason: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary
  },
  cancellationNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  cancellationMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textTransform: "capitalize"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 42, 31, 0.45)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: "90%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  modalDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  reasonRowSelected: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft
  },
  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  reasonRadioSelected: {
    borderColor: colors.error
  },
  reasonRadioDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.error
  },
  reasonLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary
  },
  reasonLabelSelected: {
    fontWeight: "700",
    color: colors.textPrimary
  },
  modalCancelButton: {
    marginTop: spacing.sm
  }
});
