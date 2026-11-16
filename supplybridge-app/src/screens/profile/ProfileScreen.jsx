import { useState } from "react";
import {
  Alert,
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
import { TERMS_VERSION } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout, switchRole, acceptTerms } = useAuth();
  const { unreadCount } = useNotifications();

  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [isAcceptingTerms, setIsAcceptingTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const needsTermsAcceptance = user.termsVersion !== TERMS_VERSION;

  const isSellerMode = user.activeRole === "seller";
  const otherRole = isSellerMode ? "buyer" : "seller";
  const otherRoleLabel = otherRole === "seller" ? "Seller" : "Buyer";
  const canSwitchRole = user.roles.includes(otherRole);

  let roleSummary = "Seller account";

  if (user.roles.includes("buyer") && user.roles.includes("seller")) {
    roleSummary = "Buyer and Seller account";
  } else if (user.roles.includes("buyer")) {
    roleSummary = "Buyer account";
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSwitchRole = async () => {
    setSwitchError("");
    setIsSwitching(true);

    try {
      await switchRole(otherRole);
    } catch (error) {
      setSwitchError(error.message);
      setIsSwitching(false);
    }
  };

  const handleAcceptTerms = async () => {
    setTermsError("");
    setIsAcceptingTerms(true);

    try {
      await acceptTerms(TERMS_VERSION);
      Alert.alert(
        "Terms accepted",
        "You can now quote, accept orders, and manage shipments under the current terms."
      );
    } catch (error) {
      setTermsError(error.message);
    } finally {
      setIsAcceptingTerms(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          logout();
        }
      }
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: spacing.xxl
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Profile</Text>

        {needsTermsAcceptance ? (
          <View style={styles.termsCard}>
            <View style={styles.termsHeader}>
              <View style={styles.termsIconCircle}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.warning}
                />
              </View>
              <View style={styles.termsTextBlock}>
                <Text style={styles.termsTitle}>Updated procurement terms</Text>
                <Text style={styles.termsDescription}>
                  Accept the current terms before creating new quotations or
                  updating orders.
                </Text>
              </View>
            </View>

            {termsError ? (
              <Text style={styles.termsError}>{termsError}</Text>
            ) : null}

            <AppButton
              title="Review and accept terms"
              onPress={() =>
                navigation.navigate("ProcurementPolicy", {
                  sectionId: "accounts"
                })
              }
              variant="secondary"
              style={styles.termsButton}
            />

            <AppButton
              title={`Accept terms (${TERMS_VERSION})`}
              onPress={handleAcceptTerms}
              loading={isAcceptingTerms}
              style={styles.termsButton}
            />
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.roleSummary}>{roleSummary}</Text>

          <View style={styles.roleChipsRow}>
            {user.roles.map((role) => (
              <View key={role} style={styles.roleChip}>
                <Text style={styles.roleChipText}>
                  {role === "buyer" ? "Buyer" : "Seller"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.secondary}
            />
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Ionicons
              name="call-outline"
              size={18}
              color={colors.secondary}
            />
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.modeHeader}>
            <View style={styles.modeIconCircle}>
              <Ionicons
                name={isSellerMode ? "storefront-outline" : "cart-outline"}
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.modeTextBlock}>
              <Text style={styles.modeLabel}>Active mode</Text>
              <Text style={styles.modeValue}>
                {isSellerMode ? "Seller Mode" : "Buyer Mode"}
              </Text>
            </View>
          </View>

          <Text style={styles.modeDescription}>
            {isSellerMode
              ? "You are viewing requirements as a supplier."
              : "You are posting and managing needs as a buyer."}
          </Text>

          {canSwitchRole ? (
            <AppButton
              title={`Switch to ${otherRoleLabel} Mode`}
              onPress={handleSwitchRole}
              loading={isSwitching}
              variant="secondary"
            />
          ) : null}

          {switchError ? (
            <Text style={styles.switchError}>{switchError}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.businessHeader}>
            <Ionicons
              name="business-outline"
              size={20}
              color={colors.textMuted}
            />
            <Text style={styles.businessTitle}>Business profile</Text>
          </View>

          <Text style={styles.businessDescription}>
            Manage your company details, product categories, and verification
            information.
          </Text>

          <AppButton
            title="Open business profile"
            onPress={() => navigation.navigate("BusinessProfile")}
            variant="secondary"
            style={styles.businessButton}
          />
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.toolRow, styles.toolRowLast]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Notifications")}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <View style={styles.toolIconCircle}>
              <Ionicons
                name="notifications-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View style={styles.toolTextBlock}>
              <Text style={styles.toolLabel}>Notifications</Text>
              <Text style={styles.toolDescription}>
                {unreadCount > 0
                  ? `${unreadCount} unread ${
                      unreadCount === 1 ? "update" : "updates"
                    } awaiting your attention.`
                  : "Quotation, order, review, and verification updates."}
              </Text>
            </View>

            {unreadCount > 0 ? (
              <View style={styles.notificationCount}>
                <Text style={styles.notificationCountText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.toolsTitle}>Procurement</Text>

          {isSellerMode ? (
            <TouchableOpacity
              style={styles.toolRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate("Wallet")}
            >
              <View style={styles.toolIconCircle}>
                <Ionicons
                  name="wallet-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View style={styles.toolTextBlock}>
                <Text style={styles.toolLabel}>EMD wallet</Text>
                <Text style={styles.toolDescription}>
                  Add sandbox funds and review EMD activity.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.toolRow, styles.toolRowLast]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("ProcurementPolicy")}
          >
            <View style={styles.toolIconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={colors.primary}
              />
            </View>

            <View style={styles.toolTextBlock}>
              <Text style={styles.toolLabel}>Procurement terms and policy</Text>
              <Text style={styles.toolDescription}>
                Review EMD, GST, delivery, and platform rules.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <AppButton title="Log out" onPress={handleLogout} variant="danger" />
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
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.lg
  },
  identityCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.mint
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  roleSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  roleChipsRow: {
    flexDirection: "row"
  },
  roleChip: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  infoRowLast: {
    borderBottomWidth: 0
  },
  infoTextBlock: {
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
    color: colors.textPrimary
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md
  },
  modeTextBlock: {
    flex: 1
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  modeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary
  },
  modeDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  switchError: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.sm
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  businessTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginLeft: spacing.sm
  },
  businessDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  businessButton: {
    paddingVertical: 14
  },
  toolsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  toolRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0
  },
  toolIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  toolTextBlock: {
    flex: 1,
    marginRight: spacing.sm
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary
  },
  toolDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1
  },
  notificationCount: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginRight: spacing.sm
  },
  notificationCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white
  },
  termsCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "#F0D190",
    padding: spacing.md,
    marginBottom: spacing.md
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  termsIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  termsTextBlock: {
    flex: 1
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.warning
  },
  termsDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.warning,
    marginTop: 2
  },
  termsButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44
  },
  termsError: {
    fontSize: 11,
    color: colors.error,
    marginTop: spacing.sm
  }
});
