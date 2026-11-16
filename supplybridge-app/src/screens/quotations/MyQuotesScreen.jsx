import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
import QuotationCard from "../../components/quotations/QuotationCard";
import {
  QUOTATION_STATUS_FILTERS,
  getQuotationStatusMeta
} from "../../constants/quotations";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getMyQuotations } from "../../services/quotationService";

export default function MyQuotesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { notificationVersion } = useNotifications();

  const [quotations, setQuotations] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
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
        const response = await getMyQuotations(token);
        setQuotations(response.data || []);
        hasLoadedRef.current = true;
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
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

  const pendingCount = quotations.filter(
    (quotation) => quotation.status === "pending"
  ).length;
  const acceptedCount = quotations.filter(
    (quotation) => quotation.status === "accepted"
  ).length;
  const rejectedCount = quotations.filter(
    (quotation) => quotation.status === "rejected"
  ).length;

  const filteredQuotations =
    selectedFilter === "all"
      ? quotations
      : quotations.filter(
          (quotation) => quotation.status === selectedFilter
        );

  const selectedFilterMeta =
    QUOTATION_STATUS_FILTERS.find(
      (filter) => filter.value === selectedFilter
    ) || QUOTATION_STATUS_FILTERS[0];

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            Loading your quotations...
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
          <Text style={styles.stateTitle}>Could not load your quotations</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton
            title="Try again"
            onPress={() => loadQuotations({ showSpinner: true })}
          />
        </View>
      );
    }

    if (quotations.length === 0) {
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
            Browse open buyer requirements and send your first structured
            offer.
          </Text>
          <AppButton
            title="Browse open needs"
            onPress={() => navigation.navigate("Find Needs")}
          />
        </View>
      );
    }

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="funnel-outline"
            size={28}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.stateTitle}>
          No {selectedFilterMeta.label.toLowerCase()} quotations
        </Text>
        <Text style={styles.stateDescription}>
          Try a different status filter to see your other offers.
        </Text>
        <AppButton
          title="Show all"
          onPress={() => setSelectedFilter("all")}
          variant="secondary"
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={filteredQuotations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuotationCard
            quotation={item}
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
            paddingTop: insets.top + spacing.lg,
            paddingBottom: spacing.xxl
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
            <Text style={styles.screenTitle}>My Quotes</Text>
            <Text style={styles.screenSubtitle}>
              Track every offer you have sent and its current status.
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{acceptedCount}</Text>
                <Text style={styles.statLabel}>Accepted</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{rejectedCount}</Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {quotations.length}{" "}
                {quotations.length === 1 ? "offer" : "offers"}
              </Text>

              <Pressable
                onPress={() => navigation.navigate("Find Needs")}
                accessibilityRole="button"
              >
                <Text style={styles.sectionLink}>Find more needs</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {QUOTATION_STATUS_FILTERS.map((filter) => {
                const isSelected = selectedFilter === filter.value;
                const statusMeta =
                  filter.value === "all"
                    ? null
                    : getQuotationStatusMeta(filter.value);

                return (
                  <Pressable
                    key={filter.value}
                    onPress={() => setSelectedFilter(filter.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                      pressed && styles.filterChipPressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextSelected
                      ]}
                    >
                      {filter.label}
                    </Text>
                    {statusMeta ? (
                      <View
                        style={[
                          styles.filterDot,
                          { backgroundColor: statusMeta.textColor }
                        ]}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

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
    alignItems: "center"
  },
  statValue: {
    fontSize: 18,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: spacing.lg
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  filterChipSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.secondary
  },
  filterChipPressed: {
    opacity: 0.8
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary
  },
  filterChipTextSelected: {
    color: colors.primary
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginLeft: spacing.xs
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
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
