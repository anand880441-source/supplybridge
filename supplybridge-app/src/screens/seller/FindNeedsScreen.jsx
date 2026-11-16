import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import RequirementCard from "../../components/requirements/RequirementCard";
import {
  REQUIREMENT_CATEGORIES
} from "../../constants/requirements";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getRequirements } from "../../services/requirementService";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 350;
const CATEGORY_FILTERS = ["All", ...REQUIREMENT_CATEGORIES];

export default function FindNeedsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [requirements, setRequirements] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchText.trim());
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [searchText]);

  const loadFirstPage = useCallback(
    async ({ refresh = false } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getRequirements(token, {
          page: 1,
          limit: PAGE_SIZE,
          search: searchTerm || undefined,
          category: selectedCategory || undefined
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setRequirements(response.data || []);
        setPagination(response.pagination || null);
      } catch (loadError) {
        if (requestId === requestIdRef.current) {
          setError(loadError.message);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [token, searchTerm, selectedCategory]
  );

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (
      isLoadingMoreRef.current ||
      isLoading ||
      isRefreshing ||
      !pagination?.hasNextPage
    ) {
      return;
    }

    const requestId = requestIdRef.current;
    const nextPage = pagination.page + 1;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const response = await getRequirements(token, {
        page: nextPage,
        limit: PAGE_SIZE,
        search: searchTerm || undefined,
        category: selectedCategory || undefined
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRequirements((currentRequirements) => {
        const existingIds = new Set(
          currentRequirements.map((requirement) => requirement.id)
        );

        const newRequirements = (response.data || []).filter(
          (requirement) => !existingIds.has(requirement.id)
        );

        return [...currentRequirements, ...newRequirements];
      });
      setPagination(response.pagination || null);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(loadError.message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingMore(false);
      }

      isLoadingMoreRef.current = false;
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setSearchTerm("");
    setSelectedCategory("");
  };

  const hasActiveFilters = searchText.trim() !== "" || selectedCategory !== "";
  const hasAppliedFilters = searchTerm !== "" || selectedCategory !== "";
  const totalCount = pagination?.total ?? requirements.length;

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            Finding open requirements...
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
          <Text style={styles.stateTitle}>Could not load open needs</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton title="Try again" onPress={() => loadFirstPage()} />
        </View>
      );
    }

    if (hasAppliedFilters) {
      return (
        <View style={styles.stateCard}>
          <View style={styles.stateIconCircle}>
            <Ionicons
              name="search-outline"
              size={28}
              color={colors.secondary}
            />
          </View>
          <Text style={styles.stateTitle}>No matching requirements</Text>
          <Text style={styles.stateDescription}>
            Try a different search term or category.
          </Text>
          <AppButton
            title="Clear filters"
            onPress={clearFilters}
            variant="secondary"
          />
        </View>
      );
    }

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="file-tray-outline"
            size={28}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.stateTitle}>No open needs right now</Text>
        <Text style={styles.stateDescription}>
          Buyers have not posted an open requirement yet. Check again soon or
          pull down to refresh.
        </Text>
        <AppButton
          title="Refresh"
          onPress={() => loadFirstPage()}
          variant="secondary"
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={requirements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequirementCard
            requirement={item}
            onPress={() =>
              navigation.navigate("RequirementDetail", {
                requirementId: item.id
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadFirstPage({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Find Needs</Text>
            <Text style={styles.screenSubtitle}>
              Browse open requirements from buyers, newest first.
            </Text>

            <View style={styles.searchBar}>
              <Ionicons
                name="search-outline"
                size={20}
                color={colors.textMuted}
              />

              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search product or specification"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={80}
                returnKeyType="search"
                style={styles.searchInput}
              />

              {searchText ? (
                <Pressable
                  onPress={() => setSearchText("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filterHeader}>
              <Text style={styles.filterLabel}>Category</Text>

              {hasActiveFilters ? (
                <Pressable
                  onPress={clearFilters}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {CATEGORY_FILTERS.map((category) => {
                const isSelected =
                  category === "All"
                    ? selectedCategory === ""
                    : selectedCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() =>
                      setSelectedCategory(
                        category === "All" ? "" : category
                      )
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                      pressed && styles.categoryChipPressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>
                {isLoading && requirements.length === 0
                  ? "Finding open needs..."
                  : `${totalCount} ${
                      hasAppliedFilters ? "matching" : "open"
                    } ${totalCount === 1 ? "need" : "needs"}`}
              </Text>

              {isLoading && requirements.length > 0 ? (
                <View style={styles.updatingRow}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                  <Text style={styles.updatingText}>Updating</Text>
                </View>
              ) : null}
            </View>

            {error && requirements.length > 0 ? (
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
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.footerText}>Loading more needs...</Text>
            </View>
          ) : pagination &&
            requirements.length > 0 &&
            !pagination.hasNextPage ? (
            <Text style={styles.endText}>
              You have seen all open requirements.
            </Text>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    marginBottom: spacing.md
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary
  },
  categoryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingRight: spacing.lg
  },
  categoryChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  categoryChipSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.secondary
  },
  categoryChipPressed: {
    opacity: 0.8
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary
  },
  categoryChipTextSelected: {
    color: colors.primary
  },
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  resultsText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted
  },
  updatingRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  updatingText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.secondary,
    marginLeft: spacing.xs
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
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
  },
  footerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm
  },
  endText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md
  }
});
