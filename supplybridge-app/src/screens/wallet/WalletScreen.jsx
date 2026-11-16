import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import AppInput from "../../components/common/AppInput";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getWallet, topUpWallet } from "../../services/walletService";
import {
  formatCompactDateTime,
  formatCurrency
} from "../../utils/formatters";

const TRANSACTION_META = {
  top_up: {
    label: "Wallet top-up",
    icon: "add-circle-outline",
    tone: colors.success
  },
  emd_reserve: {
    label: "EMD held",
    icon: "lock-closed-outline",
    tone: "#8A5B00"
  },
  emd_release: {
    label: "EMD released",
    icon: "return-up-back-outline",
    tone: colors.secondary
  },
  emd_capture: {
    label: "EMD captured",
    icon: "shield-checkmark-outline",
    tone: colors.primary
  },
  emd_forfeit: {
    label: "EMD forfeited",
    icon: "alert-circle-outline",
    tone: colors.error
  },
  buyer_credit: {
    label: "EMD compensation received",
    icon: "gift-outline",
    tone: colors.success
  }
};

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [error, setError] = useState("");
  const [topUpError, setTopUpError] = useState("");

  const hasLoadedRef = useRef(false);

  const loadWallet = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getWallet(token);
        setWallet(response.data.wallet);
        setTransactions(response.data.transactions || []);
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
      loadWallet({ showSpinner: !hasLoadedRef.current });
    }, [loadWallet])
  );

  const handleTopUp = async () => {
    setTopUpError("");

    const amount = Number(topUpAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Enter an amount greater than zero.");
      return;
    }

    setIsToppingUp(true);

    try {
      const idempotencyKey = `topup-${Date.now()}-${Math.round(
        Math.random() * 1000000000
      )}`;

      await topUpWallet(token, amount, idempotencyKey);
      setTopUpAmount("");
      await loadWallet({ refresh: true });
      Alert.alert(
        "Wallet topped up",
        `${formatCurrency(amount)} was added to your sandbox wallet.`
      );
    } catch (topUpFailure) {
      setTopUpError(topUpFailure.message);
    } finally {
      setIsToppingUp(false);
    }
  };

  if (isLoading && !wallet) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

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
            onRefresh={() => loadWallet({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introRow}>
          <View>
            <Text style={styles.screenTitle}>Wallet</Text>
            <Text style={styles.screenSubtitle}>
              Sandbox funds for seller EMD holds.
            </Text>
          </View>

          <View style={styles.sandboxChip}>
            <Ionicons name="flask-outline" size={12} color={colors.primary} />
            <Text style={styles.sandboxText}>SANDBOX</Text>
          </View>
        </View>

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

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>
            {formatCurrency(wallet?.availableBalance || 0)}
          </Text>

          <View style={styles.balanceBreakdown}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Held as EMD</Text>
              <Text style={styles.balanceItemValue}>
                {formatCurrency(wallet?.heldBalance || 0)}
              </Text>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Total balance</Text>
              <Text style={styles.balanceItemValue}>
                {formatCurrency(wallet?.totalBalance || 0)}
              </Text>
            </View>
          </View>

          <Text style={styles.balanceHint}>
            EMD is reserved from the available balance when you send a
            quotation. It is held until the buyer responds.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add sandbox funds</Text>
          <Text style={styles.sectionDescription}>
            No real money is used. Top up instantly to test the EMD lifecycle.
          </Text>

          <AppInput
            label="Amount (₹)"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
            placeholder="For example: 5000"
            keyboardType="decimal-pad"
            autoCapitalize="none"
            maxLength={10}
          />

          {topUpError ? (
            <Text style={styles.formError}>{topUpError}</Text>
          ) : null}

          <AppButton
            title="Top up wallet"
            onPress={handleTopUp}
            loading={isToppingUp}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.activityCount}>
              {transactions.length} entries
            </Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons
                name="receipt-outline"
                size={26}
                color={colors.textMuted}
              />
              <Text style={styles.emptyActivityText}>
                No wallet activity yet.
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => {
              const meta =
                TRANSACTION_META[transaction.type] || TRANSACTION_META.top_up;

              return (
                <View
                  key={transaction.id}
                  style={styles.transactionRow}
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: colors.background }
                    ]}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={18}
                      color={meta.tone}
                    />
                  </View>

                  <View style={styles.transactionTextBlock}>
                    <Text style={styles.transactionLabel}>{meta.label}</Text>
                    <Text style={styles.transactionNote} numberOfLines={2}>
                      {transaction.note}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatCompactDateTime(transaction.createdAt)}
                    </Text>
                  </View>

                  <Text style={[styles.transactionAmount, { color: meta.tone }]}>
                    {transaction.availableDelta > 0
                      ? `+${formatCurrency(transaction.availableDelta)}`
                      : transaction.heldDelta < 0
                        ? `-${formatCurrency(Math.abs(transaction.heldDelta))}`
                        : formatCurrency(transaction.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <AppButton
          title="View EMD and marketplace policy"
          onPress={() => navigation.navigate("ProcurementPolicy")}
          variant="secondary"
        />
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
    justifyContent: "center"
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md
  },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  sandboxChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm
  },
  sandboxText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
    marginLeft: 3
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D7E7E0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.white
  },
  balanceBreakdown: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  balanceItem: {
    flex: 1
  },
  balanceItemLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D7E7E0",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2
  },
  balanceItemValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white
  },
  balanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#2D6B5C",
    marginHorizontal: spacing.md
  },
  balanceHint: {
    fontSize: 11,
    lineHeight: 17,
    color: "#D7E7E0"
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  activityCount: {
    fontSize: 10,
    color: colors.textMuted
  },
  formError: {
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.sm
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
  emptyActivity: {
    alignItems: "center",
    paddingVertical: spacing.lg
  },
  emptyActivityText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  transactionTextBlock: {
    flex: 1,
    marginRight: spacing.sm
  },
  transactionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary
  },
  transactionNote: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1
  },
  transactionDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right"
  }
});
