import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  getQuotationOfferTypeMeta
} from "../../constants/quotations";
import { getEmdStatusMeta } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import {
  formatCurrency,
  formatDate,
  formatQuantity
} from "../../utils/formatters";
import QuotationStatusBadge from "./QuotationStatusBadge";

function MetaRow({ icon, text }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function QuotationCard({
  quotation,
  showSeller = false,
  onPress
}) {
  const offerMeta = getQuotationOfferTypeMeta(quotation.offerType);
  const emdMeta = getEmdStatusMeta(quotation.emdStatus);
  const requirement = quotation.requirement;
  const unit = requirement?.unit || "unit";
  const grandTotal = quotation.grandTotal ?? quotation.totalPrice;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.headerRow}>
        <Text style={styles.offerType} numberOfLines={1}>
          {offerMeta.label}
        </Text>
        <QuotationStatusBadge status={quotation.status} />
      </View>

      {showSeller && quotation.business ? (
        <Text style={styles.sellerName} numberOfLines={1}>
          {quotation.business.companyName}
        </Text>
      ) : null}

      <Text style={styles.title} numberOfLines={2}>
        {requirement?.productName || "Requirement details unavailable"}
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.totalPrice}>
          {formatCurrency(grandTotal)}
        </Text>
        <Text style={styles.unitPrice}>
          {formatCurrency(quotation.unitPrice)} / {unit}
        </Text>
      </View>

      <Text style={styles.priceBreakdown}>
        Taxable {formatCurrency(quotation.taxableValue ?? quotation.totalPrice)}{" "}
        • GST {quotation.gstRate || 0}%{" "}
        {quotation.pricingMode === "inclusive" ? "included" : "extra"}
      </Text>

      <View style={styles.metaBlock}>
        <MetaRow
          icon="cube-outline"
          text={`Offering ${formatQuantity(
            quotation.offeredQuantity,
            unit
          )}`}
        />
        <MetaRow
          icon="calendar-outline"
          text={`Delivery by ${formatDate(quotation.deliveryDate)}`}
        />
        <MetaRow
          icon="shield-checkmark-outline"
          text={`EMD ${formatCurrency(quotation.emdAmount || 0)} • ${
            emdMeta.label
          }`}
        />

        {showSeller && quotation.business?.city ? (
          <MetaRow
            icon="location-outline"
            text={`${quotation.business.city}${
              quotation.business.state
                ? `, ${quotation.business.state}`
                : ""
            }`}
          />
        ) : null}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.sentDate}>
          Sent {formatDate(quotation.createdAt)}
        </Text>
        <Text style={styles.viewText}>View details</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  pressed: {
    opacity: 0.85
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
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
  sellerName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary
  },
  unitPrice: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: spacing.sm
  },
  priceBreakdown: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm
  },
  metaBlock: {
    marginBottom: spacing.sm
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginLeft: spacing.sm
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm
  },
  sentDate: {
    fontSize: 11,
    color: colors.textMuted
  },
  viewText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary
  }
});
