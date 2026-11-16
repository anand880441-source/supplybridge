import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import NotificationBell from "../../components/notifications/NotificationBell";
import OrderCard from "../../components/orders/OrderCard";
import RequirementCard from "../../components/requirements/RequirementCard";
import { ACTIVE_ORDER_STATUSES } from "../../constants/orders";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getMyBusiness } from "../../services/businessService";
import { getMyOrders } from "../../services/orderService";
import { getMyRequirements } from "../../services/requirementService";

const HOW_IT_WORKS = [
  {
    icon: "create-outline",
    title: "Post your requirement",
    description:
      "Describe the product, quantity, budget, and delivery deadline."
  },
  {
    icon: "document-text-outline",
    title: "Compare quotations",
    description:
      "Review full, partial, and modified offers from different sellers."
  },
  {
    icon: "shield-checkmark-outline",
    title: "Agree and order",
    description:
      "Confirm final terms with the seller and track the order."
  }
];

export default function BuyerHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token, switchRole } = useAuth();

  const [business, setBusiness] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const hasLoadedRef = useRef(false);

  const loadHome = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setLoadError("");

      try {
        const [businessResult, requirementsResult, ordersResult] =
          await Promise.allSettled([
            getMyBusiness(token),
            getMyRequirements(token),
            getMyOrders(token)
          ]);

        if (businessResult.status === "fulfilled") {
          setBusiness(businessResult.value.data);
        } else if (businessResult.reason?.status === 404) {
          setBusiness(null);
        } else if (businessResult.reason?.message) {
          setLoadError(businessResult.reason.message);
        }

        if (requirementsResult.status === "fulfilled") {
          setRequirements(requirementsResult.value.data);
          hasLoadedRef.current = true;
        } else if (requirementsResult.reason?.message) {
          setLoadError(requirementsResult.reason.message);
        }

        if (ordersResult.status === "fulfilled") {
          setOrders(ordersResult.value.data);
        } else if (ordersResult.reason?.message) {
          setLoadError(ordersResult.reason.message);
        }
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      loadHome({ showSpinner: !hasLoadedRef.current });
    }, [loadHome])
  );

  const openCount = requirements.filter(
    (requirement) => requirement.status === "open"
  ).length;

  const awardedCount = requirements.filter(
    (requirement) => requirement.status === "awarded"
  ).length;

  const closedCount = requirements.filter((requirement) =>
    ["fulfilled", "cancelled", "closed"].includes(requirement.status)
  ).length;

  const expiredCount = requirements.filter(
    (requirement) => requirement.status === "expired"
  ).length;

  const recentRequirements = requirements.slice(0, 3);
  const activeOrders = orders
    .filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status))
    .slice(0, 2);
  const needsVerification =
    business && business.verificationStatus !== "verified";
  const firstName = user.name.split(" ")[0];

  const handlePostPress = () => {
    if (!business) {
      Alert.alert(
        "Business profile required",
        "Add your company details before posting a requirement so sellers know who they are quoting.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open profile",
            onPress: () => navigation.navigate("BusinessProfile")
          }
        ]
      );
      return;
    }

    navigation.navigate("RequirementForm");
  };

  const handleSwitchRole = async () => {
    setSwitchError("");
    setIsSwitching(true);

    try {
      await switchRole("seller");
    } catch (error) {
      setSwitchError(error.message);
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <Text style={styles.brandName}>SupplyBridge</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.xxl
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadHome({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brandLabel}>SupplyBridge</Text>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Buyer Mode</Text>
            </View>

            <NotificationBell
              onPress={() => navigation.navigate("Notifications")}
            />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Ionicons name="cart-outline" size={26} color={colors.mint} />
          </View>

          <Text style={styles.heroTitle}>
            Post what you need. Compare real offers.
          </Text>
          <Text style={styles.heroDescription}>
            Your requirement reaches sellers with the exact quantity,
            specifications, and delivery deadline you set.
          </Text>

          <AppButton
            title="Post a requirement"
            onPress={handlePostPress}
            variant="secondary"
          />

          <Pressable
            onPress={() => navigation.navigate("My Needs")}
            accessibilityRole="button"
          >
            <Text style={styles.heroLink}>View my needs</Text>
          </Pressable>
        </View>

        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{openCount}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{awardedCount}</Text>
            <Text style={styles.statLabel}>Awarded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{closedCount}</Text>
            <Text style={styles.statLabel}>Closed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{expiredCount}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>

        {!business ? (
          <View style={styles.profilePrompt}>
            <View style={styles.profilePromptHeader}>
              <View style={styles.profileIconCircle}>
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.profilePromptTitle}>
                Complete your business profile
              </Text>
            </View>

            <Text style={styles.profilePromptDescription}>
              Buyers need a business profile before posting requirements.
              It takes about a minute to add your company details.
            </Text>

            <AppButton
              title="Open business profile"
              onPress={() => navigation.navigate("BusinessProfile")}
              variant="secondary"
            />
          </View>
        ) : null}

        {needsVerification ? (
          <View style={styles.profilePrompt}>
            <View style={styles.profilePromptHeader}>
              <View style={styles.profileIconCircle}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.profilePromptTitle}>
                {business.verificationStatus === "pending"
                  ? "Verification is under review"
                  : business.verificationStatus === "rejected"
                    ? "Verification needs attention"
                    : "Verify your business profile"}
              </Text>
            </View>

            <Text style={styles.profilePromptDescription}>
              {business.verificationStatus === "pending"
                ? "Sellers can see that your business is being reviewed while you continue posting requirements."
                : "Add your legal details and documents so sellers know they are quoting a verified buyer."}
            </Text>

            <AppButton
              title="Open verification"
              onPress={() => navigation.navigate("BusinessVerification")}
              variant="secondary"
            />
          </View>
        ) : null}

        {activeOrders.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Orders in progress</Text>

              <Pressable
                onPress={() => navigation.navigate("Orders")}
                accessibilityRole="button"
              >
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>

            {activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() =>
                  navigation.navigate("OrderDetail", {
                    orderId: order.id
                  })
                }
              />
            ))}
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent requirements</Text>

          {requirements.length > 0 ? (
            <Pressable
              onPress={() => navigation.navigate("My Needs")}
              accessibilityRole="button"
            >
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          ) : null}
        </View>

        {recentRequirements.length > 0 ? (
          recentRequirements.map((requirement) => (
            <RequirementCard
              key={requirement.id}
              requirement={requirement}
              onPress={() =>
                navigation.navigate("RequirementDetail", {
                  requirementId: requirement.id
                })
              }
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name="clipboard-outline"
              size={24}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No requirements yet</Text>
            <Text style={styles.emptyDescription}>
              Post your first requirement to start receiving quotations.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>How it works</Text>

        <View style={styles.stepsCard}>
          {HOW_IT_WORKS.map((step, index) => (
            <View
              key={step.title}
              style={[
                styles.stepRow,
                index < HOW_IT_WORKS.length - 1 && styles.stepRowSpacing
              ]}
            >
              <View style={styles.stepIconCircle}>
                <Ionicons
                  name={step.icon}
                  size={20}
                  color={colors.secondary}
                />
              </View>

              <View style={styles.stepTextBlock}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {user.roles.includes("seller") ? (
          <View style={styles.switchCard}>
            <Text style={styles.switchTitle}>
              Need the other side of the marketplace?
            </Text>
            <Text style={styles.switchDescription}>
              Your account supports both roles, so you can switch at any time.
            </Text>

            <AppButton
              title="Switch to Seller Mode"
              onPress={handleSwitchRole}
              loading={isSwitching}
              variant="secondary"
            />

            {switchError ? (
              <Text style={styles.switchError}>{switchError}</Text>
            ) : null}
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
    paddingHorizontal: spacing.lg
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.lg
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  brandLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.xs
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  roleBadge: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: "rgba(237, 253, 243, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.white,
    marginBottom: spacing.sm
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#D7E7E0",
    marginBottom: spacing.md
  },
  heroLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mint,
    textAlign: "center",
    marginTop: spacing.md,
    textDecorationLine: "underline"
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  statValue: {
    fontSize: 20,
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
  profilePrompt: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  profilePromptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  profileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  profilePromptTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary
  },
  profilePromptDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: spacing.md
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center"
  },
  stepsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  stepRowSpacing: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.md,
    marginBottom: spacing.md
  },
  stepIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md
  },
  stepTextBlock: {
    flex: 1
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary
  },
  switchCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  switchDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  switchError: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.sm
  }
});
