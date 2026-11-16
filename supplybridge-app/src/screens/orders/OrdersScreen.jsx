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
import OrderCard from "../../components/orders/OrderCard";
import OrderGuideCard from "../../components/orders/OrderGuideCard";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUS_FILTERS,
  getOrderStatusMeta
} from "../../constants/orders";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getMyOrders } from "../../services/orderService";

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { notificationVersion } = useNotifications();

  const [orders, setOrders] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hasLoadedRef = useRef(false);
  const isSeller = user?.activeRole === "seller";

  const loadOrders = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getMyOrders(token);
        setOrders(response.data || []);
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
      loadOrders({ showSpinner: !hasLoadedRef.current });
    }, [loadOrders])
  );

  useEffect(() => {
    if (notificationVersion > 0) {
      loadOrders();
    }
  }, [notificationVersion, loadOrders]);

  const activeCount = orders.filter((order) =>
    ACTIVE_ORDER_STATUSES.includes(order.status)
  ).length;
  const deliveredCount = orders.filter(
    (order) => order.status === "delivered"
  ).length;
  const cancelledCount = orders.filter(
    (order) => order.status === "cancelled"
  ).length;

  const filteredOrders =
    selectedFilter === "all"
      ? orders
      : selectedFilter === "active"
        ? orders.filter((order) =>
            ACTIVE_ORDER_STATUSES.includes(order.status)
          )
        : orders.filter((order) => order.status === selectedFilter);

  const selectedFilterMeta =
    ORDER_STATUS_FILTERS.find(
      (filter) => filter.value === selectedFilter
    ) || ORDER_STATUS_FILTERS[0];

  const filterSummary =
    selectedFilter === "all"
      ? `${orders.length} ${orders.length === 1 ? "order" : "orders"}`
      : `Showing ${filteredOrders.length} of ${orders.length}`;

  const statFilters = [
    { value: "active", label: "Active", count: activeCount },
    { value: "delivered", label: "Delivered", count: deliveredCount },
    { value: "cancelled", label: "Cancelled", count: cancelledCount }
  ];

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>Loading your orders...</Text>
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
          <Text style={styles.stateTitle}>Could not load your orders</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton
            title="Try again"
            onPress={() => loadOrders({ showSpinner: true })}
          />
        </View>
      );
    }

    if (orders.length === 0) {
      return (
        <View style={styles.stateCard}>
          <View style={styles.stateIconCircle}>
            <Ionicons
              name="cube-outline"
              size={28}
              color={colors.secondary}
            />
          </View>
          <Text style={styles.stateTitle}>No orders yet</Text>
          <Text style={styles.stateDescription}>
            {isSeller
              ? "When a buyer accepts one of your quotations, the confirmed order will appear here."
              : "Accept a quotation to lock in the agreed terms and create your first order."}
          </Text>
          <AppButton
            title={isSeller ? "View my quotes" : "View my needs"}
            onPress={() =>
              navigation.navigate(isSeller ? "My Quotes" : "My Needs")
            }
            variant="secondary"
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
          No {selectedFilterMeta.label.toLowerCase()} orders
        </Text>
        <Text style={styles.stateDescription}>
          Try a different status filter to see your other orders.
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
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              navigation.navigate("OrderDetail", { orderId: item.id })
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
            onRefresh={() => loadOrders({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Orders</Text>
            <Text style={styles.screenSubtitle}>
              {isSeller
                ? "Prepare, ship, and deliver every confirmed order."
                : "Track accepted orders from confirmation through delivery."}
            </Text>

            {orders.length > 0 ? (
              <>
                <OrderGuideCard
                  isSeller={isSeller}
                  defaultExpanded={orders.length === 1}
                />

                <View style={styles.statsRow}>
                  {statFilters.map((stat) => {
                    const isSelected = selectedFilter === stat.value;

                    return (
                      <Pressable
                        key={stat.value}
                        onPress={() => setSelectedFilter(stat.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${stat.label}: ${stat.count}. Show ${stat.label.toLowerCase()} orders`}
                        style={({ pressed }) => [
                          styles.statChip,
                          isSelected && styles.statChipSelected,
                          pressed && styles.filterChipPressed
                        ]}
                      >
                        <Text style={styles.statValue}>{stat.count}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{filterSummary}</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {ORDER_STATUS_FILTERS.map((filter) => {
                    const isSelected = selectedFilter === filter.value;
                    const statusMeta =
                      filter.value === "all" || filter.value === "active"
                        ? null
                        : getOrderStatusMeta(filter.value);

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

                {error ? (
                  <View style={styles.errorBanner}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color={colors.error}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </>
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
  statChipSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.secondary
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
