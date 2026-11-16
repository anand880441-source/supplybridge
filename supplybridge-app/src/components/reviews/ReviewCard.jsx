import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "../../constants/theme";
import { formatDate } from "../../utils/formatters";
import { formatRatingAverage } from "../../utils/ratings";
import BusinessAvatar from "../common/BusinessAvatar";
import RatingStars from "./RatingStars";

export default function ReviewCard({ review }) {
  const reviewer = review.reviewer;
  const sourceLabel =
    review.revieweeRole === "seller" ? "From buyer" : "From seller";
  const comment = String(review.comment || "").trim();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <BusinessAvatar business={reviewer} size={38} />

        <View style={styles.reviewerBlock}>
          <Text style={styles.reviewerName} numberOfLines={1}>
            {reviewer?.companyName || "Verified business"}
          </Text>
          <Text style={styles.reviewerMeta}>
            {sourceLabel} • {formatDate(review.createdAt)}
          </Text>
        </View>

        <View style={styles.ratingBlock}>
          <RatingStars value={review.rating} size={12} />
          <Text style={styles.ratingValue}>
            {formatRatingAverage(review.rating)}
          </Text>
        </View>
      </View>

      {comment ? <Text style={styles.comment}>{comment}</Text> : null}

      <View style={styles.verifiedRow}>
        <Ionicons
          name="checkmark-circle"
          size={14}
          color={colors.success}
        />
        <Text style={styles.verifiedText}>
          Delivered order
          {review.order?.orderNumber ? ` • ${review.order.orderNumber}` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  reviewerBlock: {
    flex: 1,
    marginLeft: spacing.sm
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary
  },
  reviewerMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  ratingBlock: {
    alignItems: "flex-end",
    marginLeft: spacing.sm
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.warning,
    marginTop: 1
  },
  comment: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
    marginTop: spacing.sm
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: spacing.xs
  }
});
