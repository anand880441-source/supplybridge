import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { getRequirements } from "../../services/requirementService";

const SELLER_STEPS = [
  {
    icon: "search-outline",
    title: "Discover open requirements",
    description:
      "Browse real buyer needs with quantities, budgets, and delivery dates.",
    phase: "Live"
  },
  {
    icon: "document-text-outline",
    title: "Send structured quotations",
    description:
      "Offer the full requirement, part of it, or a modified solution.",
    phase: "Live"
  },
  {
    icon: "cube-outline",
    title: "Fulfil confirmed orders",
    description:
      "Update production and delivery milestones after mutual confirmation.",
    phase: "Live"
  }
];

export default function SellerHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token, switchRole } = useAuth();

  const [business, setBusiness] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [openTotal, setOpenTotal] = useState(0);
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
            getRequirements(token, { page: 1, limit: 3 }),
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
          setOpenTotal(requirementsResult.value.pagination?.total ?? 0);
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

  const firstName = user.name.split(" ")[0];
  const activeOrders = orders
    .filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status))
    .slice(0, 2);
  const needsVerification =
    business && business.verificationStatus !== "verified";

  const handleSwitchRole = async () => {
    setSwitchError("");
    setIsSwitching(true);

    try {
      await switchRole("buyer");
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
              <Text style={styles.roleBadgeText}>Seller Mode</Text>
            </View>

            <NotificationBell
              onPress={() => navigation.navigate("Notifications")}
            />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Ionicons name="storefront-outline" size={26} color={colors.mint} />
          </View>

          <Text style={styles.heroTitle}>
            Find buyers who are ready to purchase.
          </Text>
          <Text style={styles.heroDescription}>
            Browse open requirements and send clear offers instead of waiting
            for buyers to discover you.
          </Text>

          <AppButton
            title="Browse open needs"
            onPress={() => navigation.navigate("Find Needs")}
            variant="secondary"
          />
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

        <View style={styles.insightCard}>
          <View style={styles.insightIconCircle}>
            <Ionicons name="search-outline" size={22} color={colors.primary} />
          </View>

          <View style={styles.insightTextBlock}>
            <Text style={styles.insightValue}>{openTotal}</Text>
            <Text style={styles.insightLabel}>
              Open {openTotal === 1 ? "requirement" : "requirements"} right now
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate("Find Needs")}
            accessibilityRole="button"
          >
            <Text style={styles.insightLink}>Browse</Text>
          </Pressable>
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
              Add your company details so buyers know who is behind your
              quotations.
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
                    : "Build buyer trust with verification"}
              </Text>
            </View>

            <Text style={styles.profilePromptDescription}>
              {business.verificationStatus === "pending"
                ? "Your documents are with the review team. Verified buyers see your status on every quotation."
                : "Upload PAN, GST, registration, and address proof so buyers can verify your business."}
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
              <Text style={styles.sectionTitle}>Orders to fulfil</Text>

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
          <Text style={styles.sectionTitle}>Latest open needs</Text>

          {openTotal > 0 ? (
            <Pressable
              onPress={() => navigation.navigate("Find Needs")}
              accessibilityRole="button"
            >
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          ) : null}
        </View>

        {requirements.length > 0 ? (
          requirements.map((requirement) => (
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
              name="file-tray-outline"
              size={24}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No open needs right now</Text>
            <Text style={styles.emptyDescription}>
              Buyers have not posted an open requirement yet. Pull down to
              refresh or check the Find Needs tab later.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>How selling works</Text>

        <View style={styles.stepsCard}>
          {SELLER_STEPS.map((step, index) => (
            <View
              key={step.title}
              style={[
                styles.stepRow,
                index < SELLER_STEPS.length - 1 && styles.stepRowSpacing
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
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.phasePill}>{step.phase}</Text>
                </View>

                <Text style={styles.stepDescription}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {user.roles.includes("buyer") ? (
          <View style={styles.switchCard}>
            <Text style={styles.switchTitle}>
              Need the other side of the marketplace?
            </Text>
            <Text style={styles.switchDescription}>
              Your account supports both roles, so you can switch at any time.
            </Text>

            <AppButton
              title="Switch to Buyer Mode"
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
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  insightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md
  },
  insightTextBlock: {
    flex: 1
  },
  insightValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary
  },
  insightLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 1
  },
  insightLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary
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
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  stepTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: spacing.sm
  },
  phasePill: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    overflow: "hidden"
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
