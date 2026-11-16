import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TERMS_VERSION } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import { formatCurrency, formatDate } from "../../utils/formatters";
import AppButton from "../common/AppButton";
import AppInput from "../common/AppInput";
import BusinessAvatar from "../common/BusinessAvatar";

const ACCEPTANCE_POINTS = [
  "Accepting this quotation creates an order using the quantity, price, GST, delivery date, and business details shown here.",
  "The seller's EMD is captured with the order. Other pending quotations for this requirement are rejected.",
  "The seller dispatches the goods with courier and tracking details. You confirm delivery only after receiving the consignment.",
  "The accepted terms, buyer reference, and business snapshots are recorded for support and dispute review."
];

export default function QuotationAcceptanceModal({
  visible,
  quotation,
  loading,
  onClose,
  onConfirm,
  onOpenTerms
}) {
  const insets = useSafeAreaInsets();
  const [buyerReference, setBuyerReference] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (visible) {
      setBuyerReference("");
      setTermsAccepted(false);
    }
  }, [visible]);

  const grandTotal = quotation?.grandTotal ?? quotation?.totalPrice ?? 0;
  const seller = quotation?.business;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close quotation acceptance"
          >
            <Ionicons
              name="close"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Accept quotation</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.eyebrow}>ORDER SUMMARY</Text>

            {seller ? (
              <View style={styles.sellerRow}>
                <BusinessAvatar business={seller} size={42} />
                <View style={styles.sellerText}>
                  <Text style={styles.sellerName}>{seller.companyName}</Text>
                  <Text style={styles.sellerMeta}>
                    {seller.businessType}
                    {seller.city ? ` · ${seller.city}` : ""}
                    {seller.state ? `, ${seller.state}` : ""}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.productName}>
              {quotation?.requirement?.productName}
            </Text>
            <Text style={styles.quantityText}>
              {quotation?.offeredQuantity} {quotation?.requirement?.unit || "unit"}
            </Text>

            <View style={styles.amountRow}>
              <View>
                <Text style={styles.amountLabel}>Grand total</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(grandTotal)}
                </Text>
              </View>
              <View style={styles.deliveryBlock}>
                <Text style={styles.amountLabel}>Delivery by</Text>
                <Text style={styles.deliveryValue}>
                  {formatDate(quotation?.deliveryDate)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your purchase reference</Text>
            <Text style={styles.sectionDescription}>
              Optional. Add an internal PO, indent, or approval number so this
              order matches your records.
            </Text>

            <AppInput
              label="Buyer reference (optional)"
              value={buyerReference}
              onChangeText={setBuyerReference}
              placeholder="e.g. PO/2026/0184"
              autoCapitalize="characters"
              maxLength={80}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.termsHeader}>
              <View style={styles.termsIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>
              <View style={styles.termsHeaderText}>
                <Text style={styles.sectionTitle}>Terms version {TERMS_VERSION}</Text>
                <Text style={styles.sectionDescription}>
                  The quotation and order are governed by the current platform
                  terms.
                </Text>
              </View>
            </View>

            {ACCEPTANCE_POINTS.map((point) => (
              <View key={point} style={styles.pointRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color={colors.secondary}
                />
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}

            <Pressable
              onPress={() => setTermsAccepted((current) => !current)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              style={styles.checkboxRow}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked
                ]}
              >
                {termsAccepted ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : null}
              </View>

              <Text style={styles.checkboxText}>
                I have read and accept the{" "}
                <Text style={styles.termsLink} onPress={onOpenTerms}>
                  current terms, order, shipment, delivery, and cancellation
                  rules
                </Text>
                .
              </Text>
            </Pressable>
          </View>

          <View style={styles.warningCard}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              Accepting is a commitment to buy. The seller's EMD is captured,
              and every other pending quotation for this requirement is
              rejected.
            </Text>
          </View>

          <AppButton
            title="Accept and create order"
            onPress={() =>
              onConfirm({
                buyerReference: buyerReference.trim(),
                termsAccepted: true,
                termsVersion: TERMS_VERSION
              })
            }
            loading={loading}
            disabled={!termsAccepted || loading}
          />

          <AppButton
            title="Review full terms"
            onPress={onOpenTerms}
            variant="secondary"
            style={styles.secondaryButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center"
  },
  headerSpacer: {
    width: 24
  },
  content: {
    padding: spacing.lg
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "#BBD6CC",
    letterSpacing: 0.8,
    marginBottom: spacing.md
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md
  },
  sellerText: {
    flex: 1,
    marginLeft: spacing.sm
  },
  sellerName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.white
  },
  sellerMeta: {
    fontSize: 11,
    color: "#D7E7E0",
    marginTop: 2
  },
  productName: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.white,
    marginBottom: 2
  },
  quantityText: {
    fontSize: 12,
    color: "#D7E7E0"
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#2D6B5C",
    marginTop: spacing.md,
    paddingTop: spacing.md
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#BBD6CC",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  amountValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.white,
    marginTop: 2
  },
  deliveryBlock: {
    alignItems: "flex-end"
  },
  deliveryValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    marginTop: 3
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  sectionDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm
  },
  termsIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  termsHeaderText: {
    flex: 1
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm
  },
  pointText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginLeft: spacing.sm
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 1
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkboxText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSecondary
  },
  termsLink: {
    fontWeight: "800",
    color: colors.primary,
    textDecorationLine: "underline"
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.warning,
    marginLeft: spacing.sm
  },
  secondaryButton: {
    marginTop: spacing.sm
  }
});
