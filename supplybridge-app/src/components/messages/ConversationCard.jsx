import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import QuotationStatusBadge from "../quotations/QuotationStatusBadge";
import { getCounterpartRoleLabel } from "../../constants/messages";
import { colors, radius, spacing } from "../../constants/theme";
import { formatCompactDateTime } from "../../utils/formatters";

export default function ConversationCard({ conversation, onPress }) {
  const counterpart = conversation.counterpart || {};
  const business = counterpart.business || {};
  const requirement = conversation.requirement || {};
  const quotation = conversation.quotation || {};
  const roleLabel = getCounterpartRoleLabel(counterpart.role);
  const unreadCount = Number(conversation.unreadCount) || 0;
  const isUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${business.companyName || roleLabel}`}
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.unreadCard,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Ionicons
            name={
              counterpart.role === "buyer"
                ? "briefcase-outline"
                : "storefront-outline"
            }
            size={21}
            color={colors.primary}
          />
        </View>

        <View style={styles.identity}>
          <Text style={styles.companyName} numberOfLines={1}>
            {business.companyName || roleLabel}
          </Text>
          <Text style={styles.roleText} numberOfLines={1}>
            {roleLabel}
            {business.city ? ` • ${business.city}` : ""}
          </Text>
        </View>

        <View style={styles.metaColumn}>
          <Text style={styles.timeText}>
            {formatCompactDateTime(conversation.lastMessageAt)}
          </Text>

          {isUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
            />
          )}
        </View>
      </View>

      <View style={styles.requirementRow}>
        <Ionicons name="cube-outline" size={15} color={colors.secondary} />
        <Text style={styles.requirementName} numberOfLines={1}>
          {requirement.productName || "Requirement"}
        </Text>
        {quotation.status ? (
          <QuotationStatusBadge status={quotation.status} />
        ) : null}
      </View>

      <Text
        style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
        numberOfLines={2}
      >
        {conversation.lastMessage || "Start the conversation"}
      </Text>
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
    marginBottom: spacing.sm
  },
  unreadCard: {
    borderColor: colors.secondary
  },
  pressed: {
    opacity: 0.86
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center"
  },
  identity: {
    flex: 1,
    marginLeft: spacing.sm
  },
  companyName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  roleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  metaColumn: {
    alignItems: "flex-end",
    marginLeft: spacing.sm
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: spacing.xs
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm
  },
  requirementName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    marginRight: spacing.sm
  },
  lastMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  lastMessageUnread: {
    fontWeight: "700",
    color: colors.textPrimary
  }
});
