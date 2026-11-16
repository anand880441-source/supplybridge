import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import BusinessAvatar from "../common/BusinessAvatar";
import { getImageUrl } from "../../constants/config";
import { colors, radius, spacing } from "../../constants/theme";
import {
  formatBudget,
  formatDate,
  formatQuantity
} from "../../utils/formatters";
import {
  formatRatingAverage,
  getBusinessRating
} from "../../utils/ratings";
import RatingStars from "../reviews/RatingStars";
import RequirementStatusBadge from "./RequirementStatusBadge";

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

function DetailTile({ icon, label, value }) {
  return (
    <View style={styles.detailTile}>
      <View style={styles.detailTileHeader}>
        <Ionicons name={icon} size={13} color={colors.secondary} />
        <Text style={styles.detailTileLabel}>{label}</Text>
      </View>
      <Text style={styles.detailTileValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function RequirementCard({ requirement, onPress }) {
  const coverImage = requirement.images?.[0];
  const rating = getBusinessRating(requirement.business, "buyer");
  const hasRating = rating.count > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {coverImage ? (
        <View style={styles.media}>
          <Image
            source={{ uri: getImageUrl(coverImage) }}
            style={styles.coverImage}
          />
          {requirement.images.length > 1 ? (
            <View style={styles.photoCount}>
              <Ionicons name="images-outline" size={12} color={colors.white} />
              <Text style={styles.photoCountText}>
                {requirement.images.length}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.categoryBlock}>
            <Text style={styles.category} numberOfLines={1}>
              {requirement.category}
              {requirement.subcategory ? ` • ${requirement.subcategory}` : ""}
            </Text>
            {requirement.roundNumber > 1 ? (
              <Text style={styles.roundLabel}>
                Round {requirement.roundNumber}
              </Text>
            ) : null}
          </View>
          <RequirementStatusBadge status={requirement.status} />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {requirement.productName}
        </Text>

        <View style={styles.detailGrid}>
          <DetailTile
            icon="cube-outline"
            label="Quantity"
            value={formatQuantity(requirement.quantity, requirement.unit)}
          />
          <DetailTile
            icon="wallet-outline"
            label="Budget"
            value={formatBudget(
              requirement.budgetMin,
              requirement.budgetMax
            )}
          />
        </View>

        <View style={styles.metaBlock}>
          <MetaRow
            icon="location-outline"
            text={requirement.deliveryLocation}
          />
          <MetaRow
            icon="calendar-outline"
            text={`Deliver by ${formatDate(requirement.deliveryDate)}`}
          />
        </View>

        <View style={styles.emdRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={colors.secondary}
          />
          <Text style={styles.emdText}>
            Seller EMD: {requirement.emdRate || 2}% of taxable value
          </Text>
        </View>

        <View style={styles.footerRow}>
          <BusinessAvatar business={requirement.business} size={32} />

          <View style={styles.businessBlock}>
            <Text style={styles.businessName} numberOfLines={1}>
              {requirement.business?.companyName || "Your business"}
            </Text>
            <View style={styles.ratingRow}>
              {hasRating ? (
                <>
                  <RatingStars value={rating.average} size={11} />
                  <Text style={styles.ratingText}>
                    {formatRatingAverage(rating.average)} ({rating.count})
                  </Text>
                </>
              ) : (
                <Text style={styles.newBuyerText}>New buyer</Text>
              )}
            </View>
          </View>

          <Text style={styles.postedDate}>
            {formatDate(requirement.createdAt)}
          </Text>
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
    overflow: "hidden",
    marginBottom: spacing.md
  },
  pressed: {
    opacity: 0.85
  },
  media: {
    position: "relative",
    backgroundColor: colors.mint
  },
  coverImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: colors.mint
  },
  photoCount: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 44, 36, 0.78)",
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
    marginLeft: 3
  },
  body: {
    padding: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  categoryBlock: {
    flex: 1,
    marginRight: spacing.sm
  },
  category: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  roundLabel: {
    alignSelf: "flex-start",
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  detailGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  detailTile: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.sm
  },
  detailTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3
  },
  detailTileLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 4
  },
  detailTileValue: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.textPrimary
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
  emdRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md
  },
  emdText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: spacing.xs
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm
  },
  businessBlock: {
    flex: 1,
    marginLeft: spacing.sm
  },
  businessName: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: spacing.xs
  },
  newBuyerText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted
  },
  postedDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: spacing.sm
  }
});
