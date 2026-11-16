import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "../../constants/theme";
import RatingStars from "./RatingStars";

const formatAverage = (value) => {
  const number = Number(value || 0);

  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

function RatingRoleRow({ label, rating }) {
  if (!rating?.count) {
    return null;
  }

  return (
    <View style={styles.roleRow}>
      <Text style={styles.roleLabel}>{label}</Text>
      <Ionicons name="star" size={11} color={colors.amber} />
      <Text style={styles.roleValue}>
        {formatAverage(rating.average)} ({rating.count})
      </Text>
    </View>
  );
}

export default function ReviewSummary({ summary, style }) {
  const overall = summary?.overall || { average: 0, count: 0 };

  if (!overall.count) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.emptyTitle}>No reviews yet</Text>
        <Text style={styles.emptyDescription}>
          Reviews are collected from both sides after an order is delivered.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.summaryRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{formatAverage(overall.average)}</Text>
          <RatingStars value={overall.average} size={15} />
          <Text style={styles.scoreCount}>
            {overall.count} {overall.count === 1 ? "review" : "reviews"}
          </Text>
        </View>

        <View style={styles.roleBlock}>
          <RatingRoleRow label="As seller" rating={summary.seller} />
          <RatingRoleRow label="As buyer" rating={summary.buyer} />
        </View>
      </View>

      <View style={styles.trustNote}>
        <Ionicons
          name="checkmark-circle-outline"
          size={15}
          color={colors.success}
        />
        <Text style={styles.trustText}>
          Every review is linked to a delivered order.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  scoreBlock: {
    width: 116,
    alignItems: "center",
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.divider
  },
  score: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    color: colors.primary
  },
  scoreCount: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: spacing.xs
  },
  roleBlock: {
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing.sm
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  roleLabel: {
    width: 62,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary
  },
  roleValue: {
    marginLeft: spacing.xs,
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted
  },
  trustNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md
  },
  trustText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: colors.primary,
    marginLeft: spacing.xs
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  emptyDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2
  }
});
