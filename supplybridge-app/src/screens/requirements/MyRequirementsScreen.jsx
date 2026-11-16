import { useCallback, useRef, useState } from "react";
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
import RequirementCard from "../../components/requirements/RequirementCard";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getMyRequirements } from "../../services/requirementService";

export default function MyRequirementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [requirements, setRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hasLoadedRef = useRef(false);

  const loadRequirements = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getMyRequirements(token);
        setRequirements(response.data);
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
      loadRequirements({ showSpinner: !hasLoadedRef.current });
    }, [loadRequirements])
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

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            Loading your requirements...
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
          <Text style={styles.stateTitle}>Could not load your needs</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton
            title="Try again"
            onPress={() => loadRequirements({ showSpinner: true })}
          />
        </View>
      );
    }

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="clipboard-outline"
            size={28}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.stateTitle}>No requirements yet</Text>
        <Text style={styles.stateDescription}>
          Post your first requirement and sellers will be able to send you
          quotations.
        </Text>
        <AppButton
          title="Post a requirement"
          onPress={() => navigation.navigate("RequirementForm")}
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadRequirements({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>My Needs</Text>
            <Text style={styles.screenSubtitle}>
              Track open, awarded, finished, and expired requirements.
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{openCount}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{awardedCount}</Text>
                <Text style={styles.statLabel}>Awarded</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{closedCount}</Text>
                <Text style={styles.statLabel}>Closed</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{expiredCount}</Text>
                <Text style={styles.statLabel}>Expired</Text>
              </View>
            </View>

            <AppButton
              title="Post a requirement"
              onPress={() => navigation.navigate("RequirementForm")}
              style={styles.postButton}
            />

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
    marginBottom: spacing.lg
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
  postButton: {
    marginBottom: spacing.sm
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
    padding: spacing.md
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
  }
});
