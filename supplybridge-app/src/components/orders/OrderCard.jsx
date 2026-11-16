import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getCounterpartRoleLabel } from "../../constants/messages";
import { colors, radius, spacing } from "../../constants/theme";
import {
  ORDER_PROGRESS_STEPS,
  getOrderCardNextStep,
  getOrderProgressIndex,
  getOrderStatusMeta
} from "../../constants/orders";
import {
  formatCurrency,
  formatDate,
  formatQuantity
} from "../../utils/formatters";
import OrderStatusBadge from "./OrderStatusBadge";

const NEXT_STEP_TONES = {
  action: {
    container: "nextStepAction",
    text: "nextStepActionText",
    icon: "#8A5B00"
  },
  info: {
    container: "nextStepInfo",
    text: "nextStepInfoText",
    icon: colors.secondary
  },
  success: {
    container: "nextStepSuccess",
    text: "nextStepSuccessText",
    icon: colors.success
  },
  danger: {
    container: "nextStepDanger",
    text: "nextStepDangerText",
    icon: colors.error
  }
};

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

export default function OrderCard({ order, onPress }) {
  const counterpart = order.counterpart || {};
  const business = counterpart.business || {};
  const roleLabel = getCounterpartRoleLabel(counterpart.role);
  const progressIndex = getOrderProgressIndex(order.status);
  const nextStep = getOrderCardNextStep(order);
  const tone = NEXT_STEP_TONES[nextStep.tone] || NEXT_STEP_TONES.info;
  const isCancelled = order.status === "cancelled";
  const statusMeta = getOrderStatusMeta(order.status);
  const grandTotal = order.grandTotal ?? order.totalPrice;
  const progressLabel = isCancelled
    ? "Order cancelled."
    : `Stage ${progressIndex + 1} of ${ORDER_PROGRESS_STEPS.length}.`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber} for ${
        order.productName
      }, ${statusMeta.label}. ${progressLabel} ${nextStep.text}. With ${
        business.companyName || roleLabel
      }.`}
      accessibilityHint="Opens the order details"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.orderNumber} numberOfLines={1}>
            {order.orderNumber}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {order.productName}
          </Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View style={styles.counterpartRow}>
        <Ionicons
          name={
            counterpart.role === "buyer"
              ? "briefcase-outline"
              : "storefront-outline"
          }
          size={14}
          color={colors.secondary}
        />
        <Text style={styles.counterpartText} numberOfLines={1}>
          {business.companyName
            ? `${business.companyName} • ${roleLabel}`
            : roleLabel}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.totalPrice}>
          {formatCurrency(grandTotal)}
        </Text>
        <Text style={styles.unitPrice} numberOfLines={1}>
          {formatQuantity(order.quantity, order.unit)} •{" "}
          {formatCurrency(order.unitPrice)}/{order.unit}
        </Text>
      </View>

      <Text style={styles.taxHint} numberOfLines={1}>
        Taxable {formatCurrency(order.taxableValue ?? order.totalPrice)} • GST{" "}
        {order.gstRate || 0}%
      </Text>

      {!isCancelled ? (
        <View style={styles.progressTrack}>
          {ORDER_PROGRESS_STEPS.map((step, index) => (
            <View
              key={step.value}
              style={[
                styles.progressSegment,
                index <= progressIndex && styles.progressSegmentDone,
                index === progressIndex && styles.progressSegmentCurrent
              ]}
            />
          ))}
        </View>
      ) : null}

      <View style={[styles.nextStepRow, styles[tone.container]]}>
        <Ionicons name={nextStep.icon} size={15} color={tone.icon} />
        <Text style={[styles.nextStepText, styles[tone.text]]}>
          {nextStep.text}
        </Text>
      </View>

      <View style={styles.metaBlock}>
        <MetaRow
          icon="calendar-outline"
          text={`Delivery by ${formatDate(order.deliveryDate)}`}
        />
        <MetaRow
          icon="location-outline"
          text={order.deliveryLocation}
        />
        <MetaRow
          icon="shield-checkmark-outline"
          text={`EMD ${formatCurrency(order.emdAmount || 0)} • ${String(
            order.emdStatus || "not_required"
          ).replace(/_/g, " ")}`}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.createdDate}>
          Ordered {formatDate(order.createdAt)}
        </Text>
        <View style={styles.viewLink}>
          <Text style={styles.viewText}>View details</Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={colors.secondary}
          />
        </View>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  headerTextBlock: {
    flex: 1,
    marginRight: spacing.sm
  },
  orderNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 2
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.textPrimary
  },
  counterpartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  counterpartText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs
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
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "right",
    marginLeft: spacing.sm
  },
  taxHint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm
  },
  progressTrack: {
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.sm
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.divider
  },
  progressSegmentDone: {
    backgroundColor: colors.secondary
  },
  progressSegmentCurrent: {
    backgroundColor: colors.primary
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm
  },
  nextStepAction: {
    backgroundColor: "#FDF3DD"
  },
  nextStepInfo: {
    backgroundColor: colors.mint
  },
  nextStepSuccess: {
    backgroundColor: colors.successSoft
  },
  nextStepDanger: {
    backgroundColor: colors.errorSoft
  },
  nextStepText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    marginLeft: spacing.xs
  },
  nextStepActionText: {
    color: "#8A5B00"
  },
  nextStepInfoText: {
    color: colors.primary
  },
  nextStepSuccessText: {
    color: colors.success
  },
  nextStepDangerText: {
    color: colors.error
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
  createdDate: {
    fontSize: 11,
    color: colors.textMuted
  },
  viewLink: {
    flexDirection: "row",
    alignItems: "center"
  },
  viewText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary
  }
});
