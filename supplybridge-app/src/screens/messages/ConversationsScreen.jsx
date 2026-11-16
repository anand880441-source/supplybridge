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
import ConversationCard from "../../components/messages/ConversationCard";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { useUnreadMessages } from "../../context/UnreadMessagesContext";
import { getConversations } from "../../services/conversationService";

export default function ConversationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { messageVersion } = useNotifications();
  const { unreadTotal, setUnreadTotal } = useUnreadMessages();

  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hasLoadedRef = useRef(false);
  const isSeller = user?.activeRole === "seller";

  const loadConversations = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getConversations(token);
        const nextConversations = response.data || [];

        setConversations(nextConversations);
        setUnreadTotal(
          typeof response.unreadTotal === "number"
            ? response.unreadTotal
            : nextConversations.reduce(
                (total, conversation) =>
                  total + (Number(conversation.unreadCount) || 0),
                0
              )
        );
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
      loadConversations({ showSpinner: !hasLoadedRef.current });
    }, [loadConversations])
  );

  useEffect(() => {
    if (messageVersion > 0) {
      loadConversations();
    }
  }, [messageVersion, loadConversations]);

  const goToQuotations = () => {
    navigation.navigate(isSeller ? "My Quotes" : "My Needs");
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateDescription}>
            Loading conversations...
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
          <Text style={styles.stateTitle}>Could not load messages</Text>
          <Text style={styles.stateDescription}>{error}</Text>
          <AppButton
            title="Try again"
            onPress={() => loadConversations({ showSpinner: true })}
          />
        </View>
      );
    }

    return (
      <View style={styles.stateCard}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="chatbubbles-outline"
            size={28}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.stateTitle}>No conversations yet</Text>
        <Text style={styles.stateDescription}>
          Open a quotation and tap Message to start a private conversation.
          Threads appear here after the first message.
        </Text>
        <AppButton
          title={isSeller ? "View my quotes" : "View my needs"}
          onPress={goToQuotations}
          variant="secondary"
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() =>
              navigation.navigate("Conversation", {
                conversationId: item.id
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
            onRefresh={() => loadConversations({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Messages</Text>
            <Text style={styles.screenSubtitle}>
              Private conversations about your quotations and delivery terms.
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{conversations.length}</Text>
                <Text style={styles.statLabel}>Conversations</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statValue}>{unreadTotal}</Text>
                <Text style={styles.statLabel}>Unread</Text>
              </View>
            </View>

            {error && conversations.length > 0 ? (
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
