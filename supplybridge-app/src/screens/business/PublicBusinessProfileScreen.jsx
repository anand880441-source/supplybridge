import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import BusinessAvatar from "../../components/common/BusinessAvatar";
import StatusPill from "../../components/common/StatusPill";
import RatingStars from "../../components/reviews/RatingStars";
import ReviewCard from "../../components/reviews/ReviewCard";
import ReviewSummary from "../../components/reviews/ReviewSummary";
import { getImageUrl } from "../../constants/config";
import { formatDate } from "../../utils/formatters";
import { formatRatingAverage } from "../../utils/ratings";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getBusinessById } from "../../services/businessService";
import { getBusinessReviews } from "../../services/reviewService";

const VERIFICATION_META = {
  unverified: { label: "Unverified", tone: "neutral" },
  pending: { label: "Verification pending", tone: "warning" },
  verified: { label: "Verified business", tone: "success" },
  rejected: { label: "Unverified", tone: "neutral" }
};

function ContactRow({ icon, label, value }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.contactRow}>
      <Ionicons name={icon} size={17} color={colors.secondary} />
      <View style={styles.contactTextBlock}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function PublicBusinessProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const businessId = route.params?.businessId;

  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBusiness = async ({ refresh = false } = {}) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError("");

    try {
      const response = await getBusinessById(token, businessId);
      setBusiness(response.data);

      try {
        const reviewResponse = await getBusinessReviews(token, businessId);
        setReviews(reviewResponse.data || []);
        setReviewSummary(
          reviewResponse.summary || response.data.ratings || null
        );
      } catch (reviewError) {
        setReviews([]);
        setReviewSummary(response.data.ratings || null);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, [businessId, token]);

  const openWebsite = async () => {
    let website = business?.website || "";

    if (!/^https?:\/\//i.test(website)) {
      website = `https://${website}`;
    }

    try {
      await Linking.openURL(website);
    } catch (openError) {
      Alert.alert("Could not open website", "The website address is invalid.");
    }
  };

  const openPortfolioItem = (item) => {
    Alert.alert(
      item.title,
      [item.description, item.location, item.completedAt
        ? `Completed ${formatDate(item.completedAt)}`
        : ""]
        .filter(Boolean)
        .join("\n\n") || "No project details were added."
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading business profile...</Text>
      </View>
    );
  }

  if (error || !business) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <Text style={styles.stateTitle}>Could not load this business</Text>
        <Text style={styles.stateDescription}>
          {error || "The business profile is unavailable."}
        </Text>
        <AppButton title="Try again" onPress={() => loadBusiness()} />
        <AppButton
          title="Go back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.stateButton}
        />
      </View>
    );
  }

  const verification =
    VERIFICATION_META[business.verificationStatus] ||
    VERIFICATION_META.unverified;
  const portfolio = business.portfolio || [];
  const hasContact = Boolean(
    business.contactPerson || business.phone || business.email
  );
  const ratings = reviewSummary || business.ratings;

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
            onRefresh={() => loadBusiness({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <BusinessAvatar business={business} size={84} />
          <Text style={styles.companyName}>{business.companyName}</Text>
          <Text style={styles.businessType}>{business.businessType}</Text>
          <Text style={styles.location}>
            {business.city}
            {business.state ? `, ${business.state}` : ""}
          </Text>

          {ratings?.overall?.count ? (
            <View style={styles.heroRatingRow}>
              <RatingStars value={ratings.overall.average} size={14} />
              <Text style={styles.heroRatingValue}>
                {formatRatingAverage(ratings.overall.average)}
              </Text>
              <Text style={styles.heroRatingCount}>
                {ratings.overall.count}{" "}
                {ratings.overall.count === 1 ? "review" : "reviews"}
              </Text>
            </View>
          ) : (
            <Text style={styles.heroNoRating}>No reviews yet</Text>
          )}

          <StatusPill
            label={verification.label}
            tone={verification.tone}
            icon={
              business.verificationStatus === "verified"
                ? "shield-checkmark-outline"
                : "shield-outline"
            }
          />

          <View style={styles.heroMetaRow}>
            {business.yearEstablished ? (
              <View style={styles.heroMetaItem}>
                <Text style={styles.heroMetaValue}>
                  {business.yearEstablished}
                </Text>
                <Text style={styles.heroMetaLabel}>Established</Text>
              </View>
            ) : null}

            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaValue}>{portfolio.length}</Text>
              <Text style={styles.heroMetaLabel}>Projects</Text>
            </View>

            <View style={styles.heroMetaItem}>
              <Text style={styles.heroMetaValue}>
                {formatDate(business.createdAt).split(" ")[2] || "-"}
              </Text>
              <Text style={styles.heroMetaLabel}>Member since</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewsSection}>
          <View style={styles.reviewsSectionHeader}>
            <View>
              <Text style={styles.reviewsHeading}>Ratings & reviews</Text>
              <Text style={styles.reviewsCaption}>
                Feedback from verified buyer and seller orders
              </Text>
            </View>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.secondary}
            />
          </View>

          <ReviewSummary summary={ratings} />

          {reviews.length > 0 ? (
            <View style={styles.reviewList}>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </View>
          ) : null}
        </View>

        {business.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{business.description}</Text>
          </View>
        ) : null}

        {business.categories?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>What they supply</Text>
            <View style={styles.chipRow}>
              {business.categories.map((category) => (
                <View key={category} style={styles.chip}>
                  <Text style={styles.chipText}>{category}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {portfolio.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Portfolio</Text>

            {portfolio.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => openPortfolioItem(item)}
                style={styles.portfolioItem}
              >
                <Image
                  source={{ uri: getImageUrl(item.imageUrl) }}
                  style={styles.portfolioImage}
                />
                <View style={styles.portfolioBody}>
                  <Text style={styles.portfolioTitle}>{item.title}</Text>
                  <Text style={styles.portfolioMeta}>
                    {[item.category, item.location, item.completedAt
                      ? formatDate(item.completedAt)
                      : ""]
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {hasContact ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <ContactRow
              icon="person-outline"
              label="Contact person"
              value={business.contactPerson}
            />
            <ContactRow
              icon="call-outline"
              label="Phone"
              value={business.phone}
            />
            <ContactRow
              icon="mail-outline"
              label="Email"
              value={business.email}
            />
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Ionicons
              name="eye-off-outline"
              size={18}
              color={colors.secondary}
            />
            <Text style={styles.infoText}>
              This business has chosen not to display contact details on its
              public profile.
            </Text>
          </View>
        )}

        {business.website ? (
          <AppButton
            title="Visit website"
            onPress={openWebsite}
            variant="secondary"
          />
        ) : null}
      </ScrollView>
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
  stateTitle: {
    fontSize: 19,
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
    marginTop: spacing.sm
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md
  },
  companyName: {
    fontSize: 23,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
    marginTop: spacing.md
  },
  businessType: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.mint,
    marginTop: 2
  },
  location: {
    fontSize: 11,
    color: "#C8DED6",
    marginTop: 2
  },
  heroRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  heroRatingValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.white,
    marginLeft: spacing.xs
  },
  heroRatingCount: {
    fontSize: 10,
    color: "#C8DED6",
    marginLeft: spacing.xs
  },
  heroNoRating: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C8DED6",
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  heroMetaRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    alignSelf: "stretch"
  },
  heroMetaItem: {
    flex: 1,
    alignItems: "center"
  },
  heroMetaValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.white
  },
  heroMetaLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#C8DED6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  reviewsSection: {
    marginBottom: spacing.md
  },
  reviewsSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm
  },
  reviewsHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary
  },
  reviewsCaption: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1
  },
  reviewList: {
    marginTop: spacing.sm
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary
  },
  portfolioItem: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.sm
  },
  portfolioImage: {
    width: "100%",
    height: 150,
    backgroundColor: colors.mint
  },
  portfolioBody: {
    padding: spacing.sm
  },
  portfolioTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary
  },
  portfolioMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  contactTextBlock: {
    flex: 1,
    marginLeft: spacing.sm
  },
  contactLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  contactValue: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 1
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.primary,
    marginLeft: spacing.sm
  }
});
