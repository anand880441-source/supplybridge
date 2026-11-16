import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import QuotationCard from "../../components/quotations/QuotationCard";
import RequirementStatusBadge from "../../components/requirements/RequirementStatusBadge";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getRequirementQuotations } from "../../services/quotationService";
import {
  formatCurrency,
  formatDate,
  formatQuantity
} from "../../utils/formatters";

const STATUS_ORDER = {
  pending: 0,
  accepted: 1,
  rejected: 2,
  cancelled: 3,
  expired: 4,
  withdrawn: 5
};

export default function RequirementQuotesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { notificationVersion } = useNotifications();

  const { requirementId } = route.params;

  const [quotations, setQuotations] = useState([]);
  const [requirement, setRequirement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hasLoadedRef = useRef(false);

  const loadQuotations = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getRequirementQuotations(
          token,
          requirementId
        );

        setQuotations(response.data || []);
        setRequirement(response.requirement || null);
        hasLoadedRef.current = true;
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, requirementId]
  );

  useFocusEffect(
    useCallback(() => {
      loadQuotations({ showSpinner: !hasLoadedRef.current });
    }, [loadQuotations])
  );

  useEffect(() => {
    if (notificationVersion > 0) {
      loadQuotations();
    }
  }, [notificationVersion, loadQuotations]);

  const sortedQuotations = [...quotations].sort((first, second) => {
    const statusDifference =
      (STATUS_ORDER[first.status] ?? 5) -
      (STATUS_ORDER[second.status] ?? 5);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (first.status === "pending" && second.status === "pending") {
      return (
        (first.grandTotal ?? first.totalPrice) -
        (second.grandTotal ?? second.totalPrice)
      );
    }

    return new Date(second.createdAt) - new Date(first.createdAt);
  });

  const pendingQuotations = quotations.filter(
    (quotation) => quotation.status === "pending"
  );

  const lowestPendingPrice =
    pendingQuotations.length > 0
      ? Math.min(
          ...pendingQuotations.map(
            (quotation) => quotation.grandTotal ?? quotation.totalPrice
          )
        )
      : null;

  const statusMessage =
    requirement?.status === "awarded"
      ? "This requirement is awarded. The accepted seller's EMD is captured with the order."
      : requirement?.status === "fulfilled"
        ? "This order is delivered and completed. The seller's EMD was released."
        : requirement?.status === "cancelled"
          ? "The order was cancelled. Quotations are shown for reference."
          : requirement?.status === "closed"
            ? "This requirement is closed. Quotations are shown for reference."
            : requirement?.status === "expired"
              ? "This requirement has expired. Quotations can no longer be accepted."
              : "";

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            Loading quotations...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateCard}>
          <View style={styles.stateIconCircle}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={colors.coral}
            />
          </View>
          <Text style={styles.stateTitle}>Could not load quotations</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton
            title="Try again"
            onPress={() => loadQuotations({ showSpinner: true })}
          />
        </View>
      );
    }

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="document-text-outline"
            size={28}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.stateTitle}>No quotations yet</Text>
        <Text style={styles.stateDescription}>
          {requirement?.status === "open"
            ? "Sellers can send full, partial, or modified offers while this requirement is open."
            : "This requirement closed without receiving any quotations."}
        </Text>
        {requirement?.status === "open" ? (
          <AppButton
            title="Refresh"
            onPress={() => loadQuotations()}
            variant="secondary"
          />
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={sortedQuotations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuotationCard
            quotation={item}
            showSeller
            onPress={() =>
              navigation.navigate("QuotationDetail", {
                quotationId: item.id
              })
            }
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadQuotations({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Compare quotations</Text>
            <Text style={styles.screenSubtitle}>
              Review seller offers and choose the best fit for your business.
            </Text>

            {requirement ? (
              <View style={styles.requirementCard}>
                <View style={styles.requirementHeaderRow}>
                  <Text style={styles.requirementName} numberOfLines={2}>
                    {requirement.productName}
                  </Text>
                  <RequirementStatusBadge status={requirement.status} />
                </View>

                <Text style={styles.requirementMeta}>
                  Requested{" "}
                  {formatQuantity(
                    requirement.quantity,
                    requirement.unit
                  )}
                </Text>
                <Text style={styles.requirementMeta}>
                  Deliver by {formatDate(requirement.deliveryDate)}
                </Text>
                <Text style={styles.requirementMeta}>
                  {requirement.deliveryLocation}
                </Text>
                <Text style={styles.requirementMeta}>
                  Seller EMD: {requirement.emdRate || 2}% of taxable value
                </Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{quotations.length}</Text>
                <Text style={styles.statLabel}>Offers</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>
                  {pendingQuotations.length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>
                  {lowestPendingPrice === null
                    ? "—"
                    : formatCurrency(lowestPendingPrice)}
                </Text>
                <Text style={styles.statLabel}>Lowest</Text>
              </View>
            </View>

            {statusMessage ? (
              <View style={styles.statusNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.statusNoteText}>{statusMessage}</Text>
              </View>
            ) : null}

            {error && quotations.length > 0 ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {quotations.length > 0 && requirement?.status === "open" ? (
              <Text style={styles.tapHint}>
                Lowest pending offers appear first. Tap any quotation to review
                and respond.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1
  },
  header: {
    marginBottom: spacing.md
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  screenSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  requirementCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  requirementHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  requirementName: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.textPrimary,
    marginRight: spacing.sm
  },
  requirementMeta: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center"
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2
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
  tapHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: spacing.md
  },
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center"
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm
  },
  stateDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md
  }
});
