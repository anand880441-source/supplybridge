import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import BusinessAvatar from "../../components/common/BusinessAvatar";
import QuotationAcceptanceModal from "../../components/quotations/QuotationAcceptanceModal";
import QuotationStatusBadge from "../../components/quotations/QuotationStatusBadge";
import RequirementStatusBadge from "../../components/requirements/RequirementStatusBadge";
import {
  getQuotationOfferTypeMeta,
  getQuotationStatusDescription
} from "../../constants/quotations";
import { getEmdStatusMeta } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { createConversation } from "../../services/conversationService";
import { createOrderFromQuotation } from "../../services/orderService";
import {
  acceptQuotation,
  getQuotationById,
  rejectQuotation,
  withdrawQuotation
} from "../../services/quotationService";
import {
  formatCurrency,
  formatDate,
  formatQuantity
} from "../../utils/formatters";

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

export default function QuotationDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { notificationVersion } = useNotifications();

  const { quotationId } = route.params;

  const [quotation, setQuotation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [isAcceptanceVisible, setIsAcceptanceVisible] = useState(false);

  const hasLoadedRef = useRef(false);

  const loadQuotation = useCallback(
    async ({ showSpinner = false } = {}) => {
      if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getQuotationById(token, quotationId);
        setQuotation(response.data);
        hasLoadedRef.current = true;
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    },
    [token, quotationId]
  );

  useFocusEffect(
    useCallback(() => {
      loadQuotation({ showSpinner: !hasLoadedRef.current });
    }, [loadQuotation])
  );

  useEffect(() => {
    if (notificationVersion > 0) {
      loadQuotation();
    }
  }, [notificationVersion, loadQuotation]);

  const runAction = async (actionName, action, successTitle, successMessage) => {
    setActiveAction(actionName);

    try {
      await action();
      await loadQuotation();
      Alert.alert(successTitle, successMessage);
    } catch (actionError) {
      Alert.alert("Action failed", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const confirmWithdraw = () => {
    Alert.alert(
      "Withdraw quotation",
      "The buyer will no longer see this offer and your EMD hold will be released. You cannot send another quotation for the same requirement.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: () =>
            runAction(
              "withdraw",
              () => withdrawQuotation(token, quotationId),
              "Quotation withdrawn",
              "Your offer has been removed from the buyer's comparison."
            )
        }
      ]
    );
  };

  const confirmAccept = async ({ buyerReference, ...termsPayload }) => {
    setActiveAction("accept");

    try {
      await acceptQuotation(token, quotationId, {
        ...termsPayload,
        buyerReference
      });
      setIsAcceptanceVisible(false);
      await loadQuotation();
      Alert.alert(
        "Order created",
        "The quotation is accepted. Open the order to view delivery and shipment details."
      );
    } catch (actionError) {
      Alert.alert("Could not accept quotation", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const openTerms = (sectionId = "quotations") => {
    setIsAcceptanceVisible(false);
    navigation.navigate("ProcurementPolicy", { sectionId });
  };

  const confirmReject = () => {
    Alert.alert(
      "Reject quotation",
      "The seller's EMD hold will be released. You can still accept another quotation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () =>
            runAction(
              "reject",
              () => rejectQuotation(token, quotationId),
              "Quotation rejected",
              "You can continue comparing or accept another offer."
            )
        }
      ]
    );
  };

  const openConversation = async () => {
    setActiveAction("message");

    try {
      const response = await createConversation(token, quotationId);

      navigation.navigate("Conversation", {
        conversationId: response.data.id
      });
    } catch (actionError) {
      Alert.alert("Could not open conversation", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  const openOrder = async () => {
    if (quotation.orderId) {
      navigation.navigate("OrderDetail", {
        orderId: String(quotation.orderId)
      });
      return;
    }

    setActiveAction("order");

    try {
      const response = await createOrderFromQuotation(token, quotationId);

      navigation.navigate("OrderDetail", {
        orderId: response.data.id
      });
    } catch (actionError) {
      Alert.alert("Could not open order", actionError.message);
    } finally {
      setActiveAction("");
    }
  };

  if (isLoading && !quotation) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading quotation...</Text>
      </View>
    );
  }

  if (!quotation) {
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

        <Text style={styles.stateTitle}>Could not load the quotation</Text>
        <Text style={styles.stateDescription}>{error}</Text>

        <AppButton
          title="Try again"
          onPress={() => loadQuotation({ showSpinner: true })}
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

  const requirement = quotation.requirement;
  const offerMeta = getQuotationOfferTypeMeta(quotation.offerType);
  const statusDescription = getQuotationStatusDescription(quotation.status);
  const emdMeta = getEmdStatusMeta(quotation.emdStatus);
  const unit = requirement?.unit || "unit";
  const isIntraState =
    Number(quotation.cgstAmount || 0) > 0 ||
    Number(quotation.sgstAmount || 0) > 0;
  const grandTotal = quotation.grandTotal ?? quotation.totalPrice;

  const canModify =
    quotation.isSeller &&
    quotation.status === "pending" &&
    requirement?.status === "open";

  const canRespond =
    quotation.isBuyer &&
    quotation.status === "pending" &&
    requirement?.status === "open";

  const canMessage =
    (quotation.isBuyer || quotation.isSeller) &&
    (quotation.status === "pending" || quotation.status === "accepted");

  const canViewOrder =
    (quotation.isBuyer || quotation.isSeller) && Boolean(quotation.orderId);

  const wasUpdated =
    quotation.updatedAt &&
    new Date(quotation.updatedAt).getTime() -
      new Date(quotation.createdAt).getTime() >
      1000;

  const canViewRequirement =
    requirement && (quotation.isBuyer || requirement.status === "open");

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.offerType}>{offerMeta.label}</Text>
            <QuotationStatusBadge status={quotation.status} />
          </View>

          <Text style={styles.headerTitle}>
            {quotation.isSeller
              ? "Your quotation"
              : quotation.business?.companyName || "Quotation"}
          </Text>

          <Text style={styles.totalPrice}>
            {formatCurrency(grandTotal)}
          </Text>
          <Text style={styles.unitPrice}>
            Grand total • {formatCurrency(quotation.unitPrice)} per {unit}
          </Text>
        </View>

        {statusDescription ? (
          <View style={styles.statusNote}>
            <Ionicons
              name={
                quotation.status === "accepted"
                  ? "checkmark-circle-outline"
                  : quotation.status === "pending"
                    ? "time-outline"
                    : quotation.status === "rejected" ||
                        quotation.status === "cancelled"
                      ? "close-circle-outline"
                      : "information-circle-outline"
              }
              size={18}
              color={colors.secondary}
            />
            <Text style={styles.statusNoteText}>{statusDescription}</Text>
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

        <InfoSection title="Price and GST">
          <InfoRow
            icon="cube-outline"
            label="Offered quantity"
            value={formatQuantity(quotation.offeredQuantity, unit)}
          />
          <InfoRow
            icon="pricetag-outline"
            label="Unit price"
            value={`${formatCurrency(quotation.unitPrice)} per ${unit}`}
          />
          <InfoRow
            icon="calculator-outline"
            label={`Taxable value (GST ${quotation.gstRate || 0}%, ${
              quotation.pricingMode === "inclusive" ? "included" : "extra"
            })`}
            value={formatCurrency(
              quotation.taxableValue ?? quotation.totalPrice
            )}
          />

          {quotation.gstRate > 0 && isIntraState ? (
            <>
              <InfoRow
                icon="receipt-outline"
                label={`CGST (${quotation.gstRate / 2}%)`}
                value={formatCurrency(quotation.cgstAmount || 0)}
              />
              <InfoRow
                icon="receipt-outline"
                label={`SGST (${quotation.gstRate / 2}%)`}
                value={formatCurrency(quotation.sgstAmount || 0)}
              />
            </>
          ) : (
            <InfoRow
              icon="receipt-outline"
              label={`IGST (${quotation.gstRate || 0}%)`}
              value={formatCurrency(quotation.igstAmount || 0)}
            />
          )}

          <InfoRow
            icon="wallet-outline"
            label="Grand total"
            value={formatCurrency(grandTotal)}
          />
          <InfoRow
            icon="calendar-outline"
            label="Delivery date"
            value={formatDate(quotation.deliveryDate)}
          />
        </InfoSection>

        <View style={styles.emdCard}>
          <View style={styles.emdHeader}>
            <View
              style={[
                styles.emdIconCircle,
                { backgroundColor: emdMeta.backgroundColor }
              ]}
            >
              <Ionicons
                name={emdMeta.icon}
                size={19}
                color={emdMeta.textColor}
              />
            </View>

            <View style={styles.emdHeaderText}>
              <Text style={styles.emdLabel}>Seller EMD</Text>
              <Text style={styles.emdStatus}>{emdMeta.label}</Text>
            </View>

            <Text style={styles.emdValue}>
              {formatCurrency(quotation.emdAmount || 0)}
            </Text>
          </View>

          <Text style={styles.emdDescription}>
            {quotation.emdRate || 0}% of the taxable quotation value.{" "}
            {quotation.emdStatus === "captured"
              ? "It is captured with the active order."
              : quotation.emdStatus === "held"
                ? "It is held in the seller's wallet while the buyer decides."
                : quotation.emdStatus === "forfeited"
                  ? "It was forfeited to the buyer after seller cancellation."
                  : quotation.emdStatus === "released"
                    ? "It was released back to the seller."
                    : "No EMD applied to this quotation."}
          </Text>
        </View>

        <InfoSection title="Tax records">
          <InfoRow
            icon="location-outline"
            label="Place of supply"
            value={quotation.placeOfSupply || "Not recorded"}
          />
          <InfoRow
            icon="document-text-outline"
            label="Seller GSTIN"
            value={quotation.sellerGstin || "Not provided"}
          />
          {quotation.buyerGstin ? (
            <InfoRow
              icon="business-outline"
              label="Buyer GSTIN"
              value={quotation.buyerGstin}
            />
          ) : null}
        </InfoSection>

        {quotation.termsAccepted ? (
          <InfoSection title="Accepted terms">
            <Text style={styles.bodyText}>
              Seller accepted version {quotation.termsVersion || "procurement-v2"}
              {quotation.termsAcceptedAt
                ? ` · ${formatDate(quotation.termsAcceptedAt)}`
                : ""}
            </Text>

            {quotation.buyerTermsAccepted ? (
              <Text style={[styles.bodyText, styles.termsSpacing]}>
                Buyer accepted version{" "}
                {quotation.buyerTermsVersion || "procurement-v2"}
                {quotation.buyerTermsAcceptedAt
                  ? ` · ${formatDate(quotation.buyerTermsAcceptedAt)}`
                  : ""}
              </Text>
            ) : null}

            {quotation.buyerReference ? (
              <InfoRow
                icon="pricetag-outline"
                label="Buyer reference"
                value={quotation.buyerReference}
              />
            ) : null}

            <AppButton
              title="Read current terms"
              onPress={() => openTerms("quotations")}
              variant="secondary"
              style={styles.termsButton}
            />
          </InfoSection>
        ) : null}

        <InfoSection title="Message">
          <Text style={styles.bodyText}>
            {quotation.message || "No message added."}
          </Text>
        </InfoSection>

        {quotation.isBuyer && quotation.business ? (
          <InfoSection title="Seller">
            <View style={styles.businessRow}>
              <BusinessAvatar business={quotation.business} size={46} />
              <View style={styles.businessTextBlock}>
                <Text style={styles.businessName}>
                  {quotation.business.companyName}
                </Text>
                <Text style={styles.businessMeta}>
                  {quotation.business.businessType}
                  {quotation.business.city
                    ? ` · ${quotation.business.city}`
                    : ""}
                  {quotation.business.state
                    ? `, ${quotation.business.state}`
                    : ""}
                </Text>
                <Text style={styles.verificationText}>
                  {quotation.business.verificationStatus === "verified"
                    ? "Verified business"
                    : "Verification not completed"}
                </Text>
              </View>
            </View>

            <AppButton
              title="View seller profile"
              onPress={() =>
                navigation.navigate("PublicBusinessProfile", {
                  businessId: String(quotation.business.id)
                })
              }
              variant="secondary"
              style={styles.requirementButton}
            />
          </InfoSection>
        ) : null}

        {requirement ? (
          <InfoSection title="Requirement">
            <View style={styles.requirementHeaderRow}>
              <Text style={styles.requirementName}>
                {requirement.productName}
              </Text>
              <RequirementStatusBadge status={requirement.status} />
            </View>
            <Text style={styles.businessMeta}>
              Requested {formatQuantity(requirement.quantity, unit)} • Deliver
              by {formatDate(requirement.deliveryDate)}
            </Text>
            <Text style={styles.businessMeta}>
              {requirement.deliveryLocation}
            </Text>

            {canViewRequirement ? (
              <AppButton
                title="View requirement"
                onPress={() =>
                  navigation.navigate("RequirementDetail", {
                    requirementId: requirement.id
                  })
                }
                variant="secondary"
                style={styles.requirementButton}
              />
            ) : null}
          </InfoSection>
        ) : null}

        <InfoSection title="Timeline">
          <Text style={styles.timelineText}>
            Sent {formatDate(quotation.createdAt)}
          </Text>

          {wasUpdated ? (
            <Text style={styles.timelineText}>
              Last updated {formatDate(quotation.updatedAt)}
            </Text>
          ) : null}

          {quotation.respondedAt ? (
            <Text style={styles.timelineText}>
              Responded {formatDate(quotation.respondedAt)}
            </Text>
          ) : null}

          {quotation.withdrawnAt ? (
            <Text style={styles.timelineText}>
              Withdrawn {formatDate(quotation.withdrawnAt)}
            </Text>
          ) : null}

          {quotation.cancelledAt ? (
            <Text style={styles.timelineText}>
              Cancelled {formatDate(quotation.cancelledAt)}
            </Text>
          ) : null}

          {quotation.emdSettledAt ? (
            <Text style={styles.timelineText}>
              EMD {quotation.emdStatus} {formatDate(quotation.emdSettledAt)}
            </Text>
          ) : null}
        </InfoSection>

        {canMessage || canViewOrder ? (
          <View style={styles.actionsBlock}>
            {canViewOrder ? (
              <AppButton
                title="View order"
                onPress={openOrder}
                loading={activeAction === "order"}
                disabled={Boolean(activeAction)}
              />
            ) : null}

            {canMessage ? (
              <AppButton
                title={
                  quotation.isSeller ? "Message buyer" : "Message seller"
                }
                onPress={openConversation}
                variant="secondary"
                loading={activeAction === "message"}
                disabled={Boolean(activeAction)}
                style={canViewOrder ? styles.actionSpacing : undefined}
              />
            ) : null}
          </View>
        ) : null}

        {canModify ? (
          <View style={styles.actionsBlock}>
            <AppButton
              title="Edit quotation"
              onPress={() =>
                navigation.navigate("QuotationForm", {
                  quotationId: quotation.id,
                  requirementId: requirement?.id
                })
              }
              variant="secondary"
            />

            <AppButton
              title="Withdraw quotation"
              onPress={confirmWithdraw}
              variant="danger"
              loading={activeAction === "withdraw"}
              disabled={Boolean(activeAction)}
              style={styles.actionSpacing}
            />
          </View>
        ) : null}

        {canRespond ? (
          <View style={styles.actionsBlock}>
            <AppButton
              title="Review and accept"
              onPress={() => setIsAcceptanceVisible(true)}
              disabled={Boolean(activeAction)}
            />

            <AppButton
              title="Reject quotation"
              onPress={confirmReject}
              variant="danger"
              loading={activeAction === "reject"}
              disabled={Boolean(activeAction)}
              style={styles.actionSpacing}
            />
          </View>
        ) : null}
      </ScrollView>

      <QuotationAcceptanceModal
        visible={isAcceptanceVisible}
        quotation={quotation}
        loading={activeAction === "accept"}
        onClose={() => setIsAcceptanceVisible(false)}
        onConfirm={confirmAccept}
        onOpenTerms={() => openTerms("orders")}
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
  offerType: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  statusNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  statusNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginLeft: spacing.sm
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
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary
  },
  emdCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  emdHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  emdIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  emdHeaderText: {
    flex: 1,
    marginRight: spacing.sm
  },
  emdLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  emdStatus: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 1
  },
  emdValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary
  },
  emdDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  businessTextBlock: {
    flex: 1,
    marginLeft: spacing.sm
  },
  businessName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  termsSpacing: {
    marginTop: spacing.sm
  },
  termsButton: {
    marginTop: spacing.md
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
  requirementHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  requirementName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginRight: spacing.sm
  },
  requirementButton: {
    marginTop: spacing.md
  },
  timelineText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary
  },
  actionsBlock: {
    marginTop: spacing.sm
  },
  actionSpacing: {
    marginTop: spacing.sm
  }
});
