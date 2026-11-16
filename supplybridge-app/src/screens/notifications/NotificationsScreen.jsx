import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../../services/notificationService";
import { formatCompactDateTime } from "../../utils/formatters";

const PAGE_SIZE = 30;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" }
];

const NOTIFICATION_META = {
  quotation_received: {
    icon: "document-text-outline",
    iconColor: colors.primary,
    backgroundColor: colors.mint
  },
  quotation_updated: {
    icon: "create-outline",
    iconColor: colors.secondary,
    backgroundColor: colors.mint
  },
  quotation_withdrawn: {
    icon: "arrow-undo-outline",
    iconColor: colors.error,
    backgroundColor: colors.errorSoft
  },
  quotation_accepted: {
    icon: "checkmark-circle-outline",
    iconColor: colors.success,
    backgroundColor: colors.successSoft
  },
  quotation_rejected: {
    icon: "close-circle-outline",
    iconColor: colors.error,
    backgroundColor: colors.errorSoft
  },
  order_created: {
    icon: "cube-outline",
    iconColor: colors.info,
    backgroundColor: colors.infoSoft
  },
  order_status_updated: {
    icon: "cube-outline",
    iconColor: colors.info,
    backgroundColor: colors.infoSoft
  },
  review_received: {
    icon: "star-outline",
    iconColor: colors.warning,
    backgroundColor: colors.warningSoft
  },
  verification_approved: {
    icon: "shield-checkmark-outline",
    iconColor: colors.success,
    backgroundColor: colors.successSoft
  },
  verification_rejected: {
    icon: "shield-outline",
    iconColor: colors.error,
    backgroundColor: colors.errorSoft
  }
};

const getNotificationMeta = (type) => {
  return (
    NOTIFICATION_META[type] || {
      icon: "notifications-outline",
      iconColor: colors.secondary,
      backgroundColor: colors.divider
    }
  );
};

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const {
    unreadCount,
    setUnreadCount,
    notificationVersion
  } = useNotifications();

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    hasMore: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const hasLoadedRef = useRef(false);
  const isFocusedRef = useRef(false);

  const loadNotifications = useCallback(
    async ({
      refresh = false,
      showSpinner = false,
      page = 1,
      append = false
    } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      } else if (append) {
        setIsLoadingMore(true);
      }

      setError("");

      try {
        const response = await getNotifications(token, {
          page,
          limit: PAGE_SIZE,
          unread: selectedFilter === "unread" ? "true" : undefined
        });
        const nextNotifications = response.data || [];

        setNotifications((currentNotifications) => {
          if (!append) {
            return nextNotifications;
          }

          const seenIds = new Set(
            currentNotifications.map((notification) => notification.id)
          );

          return [
            ...currentNotifications,
            ...nextNotifications.filter(
              (notification) => !seenIds.has(notification.id)
            )
          ];
        });
        setPagination(
          response.pagination || {
            page,
            total: nextNotifications.length,
            hasMore: false
          }
        );

        if (typeof response.unreadCount === "number") {
          setUnreadCount(response.unreadCount);
        }

        hasLoadedRef.current = true;
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [token, selectedFilter, setUnreadCount]
  );

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      loadNotifications({ showSpinner: !hasLoadedRef.current });

      return () => {
        isFocusedRef.current = false;
      };
    }, [loadNotifications])
  );

  useEffect(() => {
    if (notificationVersion > 0 && isFocusedRef.current) {
      loadNotifications();
    }
  }, [notificationVersion, loadNotifications]);

  const handleFilterChange = (filter) => {
    if (filter === selectedFilter) {
      return;
    }

    hasLoadedRef.current = false;
    setSelectedFilter(filter);
    setNotifications([]);
    setPagination({ page: 1, total: 0, hasMore: false });
    setIsLoading(true);
    setActionError("");
  };

  const handleLoadMore = () => {
    if (!pagination.hasMore || isLoadingMore || isLoading) {
      return;
    }

    loadNotifications({
      page: Number(pagination.page || 1) + 1,
      append: true
    });
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) {
      return;
    }

    setIsMarkingAll(true);
    setActionError("");

    try {
      await markAllNotificationsRead(token);
      setUnreadCount(0);
      setNotifications((currentNotifications) =>
        selectedFilter === "unread"
          ? []
          : currentNotifications.map((notification) => ({
              ...notification,
              isRead: true,
              readAt: notification.readAt || new Date().toISOString()
            }))
      );
      setPagination((currentPagination) =>
        selectedFilter === "unread"
          ? { ...currentPagination, total: 0, hasMore: false }
          : currentPagination
      );
    } catch (markError) {
      setActionError(markError.message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        const response = await markNotificationRead(token, notification.id);

        if (typeof response.unreadCount === "number") {
          setUnreadCount(response.unreadCount);
        }

        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? {
                  ...currentNotification,
                  isRead: true,
                  readAt: response.data?.readAt || new Date().toISOString()
                }
              : currentNotification
          )
        );
      } catch (readError) {
        setActionError(readError.message);
      }
    }

    const relatedId = notification.relatedId;

    if (!relatedId) {
      if (notification.relatedType === "business") {
        navigation.navigate("BusinessVerification");
      }

      return;
    }

    if (notification.relatedType === "quotation") {
      navigation.navigate("QuotationDetail", { quotationId: relatedId });
      return;
    }

    if (notification.relatedType === "order") {
      navigation.navigate("OrderDetail", { orderId: relatedId });
      return;
    }

    if (notification.relatedType === "requirement") {
      navigation.navigate("RequirementDetail", { requirementId: relatedId });
      return;
    }

    if (notification.relatedType === "conversation") {
      navigation.navigate("Conversation", { conversationId: relatedId });
      return;
    }

    if (notification.relatedType === "business") {
      navigation.navigate("BusinessVerification");
    }
  };

  const renderNotification = ({ item }) => {
    const meta = getNotificationMeta(item.type);

    return (
      <Pressable
        onPress={() => handleOpenNotification(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.isRead ? "" : "Unread. "}${item.title}`}
        style={({ pressed }) => [
          styles.notificationCard,
          !item.isRead && styles.unreadCard,
          pressed && styles.pressedCard
        ]}
      >
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: meta.backgroundColor }
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={20}
            color={meta.iconColor}
          />
        </View>

        <View style={styles.notificationBody}>
          <View style={styles.notificationTitleRow}>
            <Text style={styles.notificationTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {!item.isRead ? (
              <View style={styles.unreadDot} />
            ) : null}
          </View>

          <Text style={styles.notificationMessage} numberOfLines={3}>
            {item.message}
          </Text>

          <Text style={styles.notificationTime}>
            {formatCompactDateTime(item.createdAt)}
          </Text>
        </View>

        {item.relatedId ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textMuted}
          />
        ) : null}
      </Pressable>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            Loading notifications...
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
          <Text style={styles.stateTitle}>Could not load notifications</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton
            title="Try again"
            onPress={() => loadNotifications({ showSpinner: true })}
          />
        </View>
      );
    }

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name={
              selectedFilter === "unread"
                ? "checkmark-done-outline"
                : "notifications-outline"
            }
            size={28}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.stateTitle}>
          {selectedFilter === "unread"
            ? "You are all caught up"
            : "No notifications yet"}
        </Text>
        <Text style={styles.stateDescription}>
          {selectedFilter === "unread"
            ? "New quotations, order updates, and messages will appear here."
            : "Activity on your quotations and orders will be collected here."}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md
          },
          notifications.length === 0 && styles.emptyListContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadNotifications({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.screenSubtitle}>
                  Quotation decisions, order progress, reviews, and account
                  updates.
                </Text>
              </View>

              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeValue}>{unreadCount}</Text>
                <Text style={styles.unreadBadgeLabel}>Unread</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((filter) => {
                const isSelected = filter.value === selectedFilter;

                return (
                  <Pressable
                    key={filter.value}
                    onPress={() => handleFilterChange(filter.value)}
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
                        styles.filterLabel,
                        isSelected && styles.filterLabelSelected
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}

              {unreadCount > 0 ? (
                <Pressable
                  onPress={handleMarkAllRead}
                  disabled={isMarkingAll}
                  accessibilityRole="button"
                  style={styles.markAllButton}
                >
                  {isMarkingAll ? (
                    <ActivityIndicator size="small" color={colors.secondary} />
                  ) : (
                    <Text style={styles.markAllText}>Mark all read</Text>
                  )}
                </Pressable>
              ) : null}
            </View>

            {actionError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={colors.error}
                />
                <Text style={styles.errorText}>{actionError}</Text>
              </View>
            ) : null}

            {error && notifications.length > 0 ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={colors.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
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
    paddingTop: spacing.md
  },
  emptyListContent: {
    flexGrow: 1
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  headerText: {
    flex: 1
  },
  screenSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary
  },
  unreadBadge: {
    minWidth: 62,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center"
  },
  unreadBadgeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.mint
  },
  unreadBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.mint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 7,
    paddingHorizontal: spacing.md
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipPressed: {
    opacity: 0.8
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary
  },
  filterLabelSelected: {
    color: colors.white
  },
  markAllButton: {
    marginLeft: "auto",
    paddingVertical: spacing.xs
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary
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
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    marginLeft: spacing.sm
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  unreadCard: {
    borderColor: colors.secondary,
    backgroundColor: colors.mint
  },
  pressedCard: {
    opacity: 0.82
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  notificationBody: {
    flex: 1,
    marginRight: spacing.sm
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    marginTop: 4
  },
  notificationMessage: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 3
  },
  notificationTime: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm
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
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: "center"
  }
});
