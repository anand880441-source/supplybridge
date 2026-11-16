import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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
import StatusPill from "../../components/common/StatusPill";
import QuotationStatusBadge from "../../components/quotations/QuotationStatusBadge";
import RequirementStatusBadge from "../../components/requirements/RequirementStatusBadge";
import RatingStars from "../../components/reviews/RatingStars";
import ReviewCard from "../../components/reviews/ReviewCard";
import { getImageUrl } from "../../constants/config";
import {
  getQuotationOfferTypeMeta,
  getQuotationStatusDescription
} from "../../constants/quotations";
import { getCancellationReasonLabel } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getMyQuotations } from "../../services/quotationService";
import {
  closeRequirement,
  getRequirementById
} from "../../services/requirementService";
import { getBusinessReviews } from "../../services/reviewService";
import {
  formatBudget,
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

export default function RequirementDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { notificationVersion } = useNotifications();

  const { requirementId } = route.params;

  const [requirement, setRequirement] = useState(null);
  const [myQuotation, setMyQuotation] = useState(null);
  const [buyerReviews, setBuyerReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const hasLoadedRef = useRef(false);

  const loadRequirement = useCallback(
    async ({ showSpinner = false } = {}) => {
      if (showSpinner) {
        setIsLoading(true);
      }

      setLoadError("");

      try {
        const response = await getRequirementById(token, requirementId);
        const data = response.data;

        setRequirement(data);
        hasLoadedRef.current = true;

        if (data.business?.id) {
          getBusinessReviews(token, data.business.id, { role: "buyer" })
            .then((reviewResponse) => {
              setBuyerReviews((reviewResponse.data || []).slice(0, 3));
            })
            .catch(() => {
              setBuyerReviews([]);
            });
        } else {
          setBuyerReviews([]);
        }

        if (!data.isOwner && user.roles.includes("seller")) {
          try {
            const quotationResponse = await getMyQuotations(token, {
              requirementId
            });

            setMyQuotation(quotationResponse.data?.[0] || null);
          } catch (quotationError) {
            // The requirement itself loaded, so keep the screen usable.
            setMyQuotation(null);
          }
        } else {
          setMyQuotation(null);
        }
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [token, requirementId, user.roles]
  );

  useFocusEffect(
    useCallback(() => {
      loadRequirement({ showSpinner: !hasLoadedRef.current });
    }, [loadRequirement])
  );

  useEffect(() => {
    if (notificationVersion > 0) {
      loadRequirement();
    }
  }, [notificationVersion, loadRequirement]);

  const handleEdit = () => {
    navigation.navigate("RequirementForm", { requirementId });
  };

  const handleClose = async () => {
    setIsClosing(true);

    try {
      await closeRequirement(token, requirementId);
      await loadRequirement();
    } catch (error) {
      Alert.alert("Could not close requirement", error.message);
    } finally {
      setIsClosing(false);
    }
  };

  const confirmClose = () => {
    Alert.alert(
      "Close requirement",
      "Sellers will no longer see this requirement. EMD held on pending quotations will be released.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close requirement",
          style: "destructive",
          onPress: handleClose
        }
      ]
    );
  };

  if (isLoading && !requirement) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading requirement...</Text>
      </View>
    );
  }

  if (!requirement) {
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

        <Text style={styles.stateTitle}>Could not load the requirement</Text>
        <Text style={styles.stateDescription}>{loadError}</Text>

        <AppButton
          title="Try again"
          onPress={() => loadRequirement({ showSpinner: true })}
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

  const quotationCount = requirement.quotationCount ?? 0;
  const myOfferMeta = myQuotation
    ? getQuotationOfferTypeMeta(myQuotation.offerType)
    : null;
  const canRepost =
    ["cancelled", "closed", "expired"].includes(requirement.status) &&
    !requirement.nextRequirementId;

  const statusNotes = {
    awarded: {
      icon: "ribbon-outline",
      text: "This requirement is awarded. The accepted order is in progress."
    },
    fulfilled: {
      icon: "checkmark-circle-outline",
      text: "The order for this requirement is delivered and completed. The EMD was released."
    },
    cancelled: {
      icon: "close-circle-outline",
      text: requirement.cancellationReason
        ? `The order was cancelled: ${getCancellationReasonLabel(
            requirement.cancellationReason
          )}`
        : "The order for this requirement was cancelled."
    },
    closed: {
      icon: "lock-closed-outline",
      text: "This requirement is closed. Sellers can no longer send quotations."
    },
    expired: {
      icon: "time-outline",
      text: "This requirement has expired because the delivery date has passed."
    }
  };

  const statusNote = statusNotes[requirement.status];
  const additionalImages = (requirement.images || []).slice(1);
  const buyerRating = getBusinessRating(requirement.business, "buyer");
  const isVerified = requirement.business?.verificationStatus === "verified";
  const isVerificationPending =
    requirement.business?.verificationStatus === "pending";
  const verificationLabel = isVerified
    ? "Verified business"
    : isVerificationPending
      ? "Verification pending"
      : "Unverified business";

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
        {requirement.images?.length > 0 ? (
          <View style={styles.gallery}>
            <View style={styles.galleryHeroWrap}>
              <Image
                source={{ uri: getImageUrl(requirement.images[0]) }}
                style={styles.galleryHero}
              />
              {requirement.images.length > 1 ? (
                <View style={styles.galleryBadge}>
                  <Ionicons
                    name="images-outline"
                    size={13}
                    color={colors.white}
                  />
                  <Text style={styles.galleryBadgeText}>
                    {requirement.images.length} photos
                  </Text>
                </View>
              ) : null}
            </View>

            {additionalImages.length > 0 ? (
              <View style={styles.galleryRow}>
                {additionalImages.map((image) => (
                  <Image
                    key={image}
                    source={{ uri: getImageUrl(image) }}
                    style={styles.galleryThumb}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <RequirementStatusBadge status={requirement.status} />
            <Text style={styles.postedDate}>
              Posted {formatDate(requirement.createdAt)}
            </Text>
          </View>

          <Text style={styles.productName}>{requirement.productName}</Text>
          <Text style={styles.category}>
            {requirement.category}
            {requirement.subcategory
              ? ` • ${requirement.subcategory}`
              : ""}
          </Text>
          {requirement.roundNumber > 1 ? (
            <Text style={styles.roundLabel}>
              Round {requirement.roundNumber}
            </Text>
          ) : null}
        </View>

        {statusNote ? (
          <View style={styles.statusNote}>
            <Ionicons
              name={statusNote.icon}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.statusNoteText}>{statusNote.text}</Text>
          </View>
        ) : null}

        {requirement.isOwner ? (
          <View style={styles.quotationSummaryCard}>
            <View style={styles.quotationSummaryHeader}>
              <View style={styles.quotationSummaryIcon}>
                <Ionicons
                  name="documents-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.quotationSummaryText}>
                <Text style={styles.quotationSummaryTitle}>Quotations</Text>
                <Text style={styles.quotationSummaryCount}>
                  {quotationCount}{" "}
                  {quotationCount === 1 ? "response" : "responses"}
                </Text>
              </View>
            </View>

            <Text style={styles.quotationSummaryDescription}>
              {quotationCount > 0
                ? "Compare seller offers, prices, and delivery timelines."
                : requirement.status === "open"
                  ? "No quotations yet. Sellers can send offers while this requirement is open."
                  : "No quotations were received for this requirement."}
            </Text>

            {quotationCount > 0 ? (
              <AppButton
                title="Compare quotations"
                onPress={() =>
                  navigation.navigate("RequirementQuotes", {
                    requirementId
                  })
                }
                variant="secondary"
              />
            ) : null}
          </View>
        ) : null}

        <InfoSection title="Requirement details">
          <InfoRow
            icon="cube-outline"
            label="Quantity"
            value={formatQuantity(
              requirement.quantity,
              requirement.unit
            )}
          />
          <InfoRow
            icon="wallet-outline"
            label="Budget"
            value={formatBudget(
              requirement.budgetMin,
              requirement.budgetMax
            )}
          />
          <InfoRow
            icon="shield-checkmark-outline"
            label="Seller EMD rate"
            value={`${requirement.emdRate || 2}% of taxable value`}
          />
          <InfoRow
            icon="location-outline"
            label="Delivery location"
            value={requirement.deliveryLocation}
          />
          <InfoRow
            icon="calendar-outline"
            label="Delivery date"
            value={formatDate(requirement.deliveryDate)}
          />
        </InfoSection>

        <InfoSection title="Specifications">
          <Text style={styles.bodyText}>{requirement.specifications}</Text>
        </InfoSection>

        {requirement.customization ? (
          <InfoSection title="Customization">
            <Text style={styles.bodyText}>{requirement.customization}</Text>
          </InfoSection>
        ) : null}

        {requirement.isOwner && requirement.notes ? (
          <InfoSection title="Your private notes">
            <Text style={styles.bodyText}>{requirement.notes}</Text>
          </InfoSection>
        ) : null}

        {requirement.business ? (
          <View style={styles.businessCard}>
            <View style={styles.businessHeader}>
              <BusinessAvatar business={requirement.business} size={52} />

              <View style={styles.businessHeaderText}>
                <Text style={styles.businessName}>
                  {requirement.business.companyName}
                </Text>
                <Text style={styles.businessMeta}>
                  {requirement.business.businessType}
                  {requirement.business.city
                    ? ` • ${requirement.business.city}`
                    : ""}
                  {requirement.business.state
                    ? `, ${requirement.business.state}`
                    : ""}
                </Text>
                <StatusPill
                  label={verificationLabel}
                  tone={
                    isVerified
                      ? "success"
                      : isVerificationPending
                        ? "warning"
                        : "neutral"
                  }
                  icon={
                    isVerified
                      ? "shield-checkmark-outline"
                      : "shield-outline"
                  }
                  style={styles.businessVerification}
                />
              </View>
            </View>

            <View style={styles.trustRow}>
              <View style={styles.trustRatingBlock}>
                <Text style={styles.trustLabel}>Buyer rating</Text>
                {buyerRating.count > 0 ? (
                  <View style={styles.trustRatingValueRow}>
                    <RatingStars value={buyerRating.average} size={14} />
                    <Text style={styles.trustRatingValue}>
                      {formatRatingAverage(buyerRating.average)}
                    </Text>
                    <Text style={styles.trustRatingCount}>
                      ({buyerRating.count}{" "}
                      {buyerRating.count === 1 ? "review" : "reviews"})
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.trustEmpty}>No buyer reviews yet</Text>
                )}
              </View>

              <View style={styles.trustEmdBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.trustEmdText}>
                  {requirement.emdRate || 2}% EMD
                </Text>
              </View>
            </View>

            {requirement.business.id ? (
              <AppButton
                title="View business profile"
                onPress={() =>
                  navigation.navigate("PublicBusinessProfile", {
                    businessId: String(requirement.business.id)
                  })
                }
                variant="secondary"
                style={styles.businessProfileButton}
              />
            ) : null}
          </View>
        ) : null}

        {buyerReviews.length > 0 ? (
          <View style={styles.reviewsCard}>
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsHeaderText}>
                <Text style={styles.reviewsTitle}>What sellers say</Text>
                <Text style={styles.reviewsSubtitle}>
                  Verified buyer feedback from delivered orders
                </Text>
              </View>
              {requirement.business?.id ? (
                <Pressable
                  onPress={() =>
                    navigation.navigate("PublicBusinessProfile", {
                      businessId: String(requirement.business.id)
                    })
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Open all business reviews"
                >
                  <Text style={styles.reviewsLink}>All reviews</Text>
                </Pressable>
              ) : null}
            </View>

            {buyerReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </View>
        ) : null}

        {!requirement.isOwner && myQuotation ? (
          <View style={styles.sellerQuoteCard}>
            <View style={styles.sellerQuoteHeader}>
              <View style={styles.quoteIconCircle}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>

              <View style={styles.sellerQuoteHeaderText}>
                <Text
                  style={[styles.quotePromptTitle, styles.sellerQuoteTitle]}
                >
                  Your quotation
                </Text>
                <View style={styles.sellerQuoteBadge}>
                  <QuotationStatusBadge status={myQuotation.status} />
                </View>
              </View>

              <Text style={styles.sellerQuoteTotal}>
                {formatCurrency(
                  myQuotation.grandTotal ?? myQuotation.totalPrice
                )}
              </Text>
            </View>

            <Text style={styles.sellerQuoteMeta}>
              {myOfferMeta?.label || "Quotation"} •{" "}
              {formatQuantity(
                myQuotation.offeredQuantity,
                myQuotation.requirement?.unit || requirement.unit
              )}
            </Text>

            <Text style={styles.quotePromptDescription}>
              {getQuotationStatusDescription(myQuotation.status)}
            </Text>

            <AppButton
              title="View quotation"
              onPress={() =>
                navigation.navigate("QuotationDetail", {
                  quotationId: myQuotation.id
                })
              }
              variant="secondary"
            />
          </View>
        ) : null}

        {requirement.isOwner && requirement.activeOrderId ? (
          <View style={styles.actionsBlock}>
            <AppButton
              title="View order"
              onPress={() =>
                navigation.navigate("OrderDetail", {
                  orderId: String(requirement.activeOrderId)
                })
              }
              variant="secondary"
            />
          </View>
        ) : null}

        {!requirement.isOwner &&
        !myQuotation &&
        user.roles.includes("seller") &&
        requirement.status === "open" ? (
          <View style={styles.quotePrompt}>
            <View style={styles.quotePromptHeader}>
              <View style={styles.quoteIconCircle}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.quotePromptTitle}>
                Ready to quote this requirement?
              </Text>
            </View>

            <Text style={styles.quotePromptDescription}>
              Send a full, partial, or modified offer with your price and
              delivery timeline. A completed business profile is required.
            </Text>

            <AppButton
              title="Send quotation"
              onPress={() =>
                navigation.navigate("QuotationForm", { requirementId })
              }
            />
          </View>
        ) : null}

        {requirement.isOwner && requirement.status === "open" ? (
          <View style={styles.actionsBlock}>
            <AppButton
              title="Edit requirement"
              onPress={handleEdit}
              variant="secondary"
            />

            <AppButton
              title="Close requirement"
              onPress={confirmClose}
              variant="danger"
              loading={isClosing}
              style={styles.closeButton}
            />
          </View>
        ) : null}

        {requirement.isOwner && canRepost ? (
          <View style={styles.actionsBlock}>
            <AppButton
              title="Repost as new round"
              onPress={() =>
                navigation.navigate("RequirementRepost", { requirementId })
              }
            />
            <Text style={styles.repostHint}>
              Create a fresh opportunity with a new delivery date and EMD rate.
              This round stays available as history.
            </Text>
          </View>
        ) : null}

        {requirement.isOwner && requirement.nextRequirementId ? (
          <View style={styles.actionsBlock}>
            <AppButton
              title="Open newer round"
              onPress={() =>
                navigation.navigate("RequirementDetail", {
                  requirementId: String(requirement.nextRequirementId)
                })
              }
              variant="secondary"
            />
            <Text style={styles.repostHint}>
              This requirement was already reposted.
            </Text>
          </View>
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
  gallery: {
    marginBottom: spacing.md
  },
  galleryHeroWrap: {
    position: "relative"
  },
  galleryHero: {
    width: "100%",
    aspectRatio: 5 / 4,
    borderRadius: radius.xl,
    backgroundColor: colors.white
  },
  galleryBadge: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 44, 36, 0.8)",
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  galleryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
    marginLeft: spacing.xs
  },
  galleryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  galleryThumb: {
    flex: 1,
    aspectRatio: 5 / 4,
    borderRadius: radius.lg,
    backgroundColor: colors.white
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
  postedDate: {
    fontSize: 11,
    color: colors.textMuted
  },
  productName: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  category: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "600"
  },
  roundLabel: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4
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
  businessCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  businessHeaderText: {
    flex: 1,
    marginLeft: spacing.sm
  },
  businessName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary
  },
  businessMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 1
  },
  businessVerification: {
    marginTop: spacing.xs
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.sm,
    marginTop: spacing.md
  },
  trustRatingBlock: {
    flex: 1
  },
  trustLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3
  },
  trustRatingValueRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  trustRatingValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    marginLeft: spacing.xs
  },
  trustRatingCount: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: spacing.xs
  },
  trustEmpty: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted
  },
  trustEmdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm
  },
  trustEmdText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    marginLeft: 3
  },
  businessProfileButton: {
    marginTop: spacing.md
  },
  reviewsCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm
  },
  reviewsHeaderText: {
    flex: 1,
    marginRight: spacing.sm
  },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  reviewsSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1
  },
  reviewsLink: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.secondary
  },
  quotationSummaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  quotationSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  quotationSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center"
  },
  quotationSummaryText: {
    flex: 1,
    marginLeft: spacing.sm
  },
  quotationSummaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  quotationSummaryCount: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 1
  },
  quotationSummaryDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  sellerQuoteCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  sellerQuoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  sellerQuoteHeaderText: {
    flex: 1
  },
  sellerQuoteTitle: {
    flex: 0
  },
  sellerQuoteBadge: {
    alignItems: "flex-start",
    marginTop: 3
  },
  sellerQuoteTotal: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary,
    marginLeft: spacing.sm
  },
  sellerQuoteMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  quotePrompt: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  quotePromptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  quoteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  quotePromptTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  quotePromptDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  actionsBlock: {
    marginTop: spacing.sm
  },
  closeButton: {
    marginTop: spacing.sm
  },
  repostHint: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm
  }
});
