import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import QuotationStatusBadge from "../../components/quotations/QuotationStatusBadge";
import {
  getCounterpartRoleLabel,
  MESSAGE_MAX_LENGTH
} from "../../constants/messages";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { useUnreadMessages } from "../../context/UnreadMessagesContext";
import {
  getConversationMessages,
  sendMessage
} from "../../services/conversationService";
import {
  formatCurrency,
  formatTime
} from "../../utils/formatters";

const THREAD_REFRESH_INTERVAL_MS = 15000;

export default function ConversationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { lastMessageEvent } = useNotifications();
  const { setUnreadTotal } = useUnreadMessages();

  const { conversationId } = route.params;

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const hasLoadedRef = useRef(false);
  const listRef = useRef(null);

  const loadThread = useCallback(
    async ({ refresh = false, showSpinner = false } = {}) => {
      if (refresh) {
        setIsRefreshing(true);
      } else if (showSpinner) {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await getConversationMessages(
          token,
          conversationId
        );

        setConversation(response.conversation || null);
        setMessages(response.data || []);

        if (typeof response.unreadTotal === "number") {
          setUnreadTotal(response.unreadTotal);
        }

        hasLoadedRef.current = true;
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, conversationId]
  );

  useFocusEffect(
    useCallback(() => {
      loadThread({ showSpinner: !hasLoadedRef.current });

      const interval = setInterval(() => {
        loadThread();
      }, THREAD_REFRESH_INTERVAL_MS);

      return () => clearInterval(interval);
    }, [loadThread])
  );

  useEffect(() => {
    if (lastMessageEvent?.conversationId === conversationId) {
      loadThread();
    }
  }, [lastMessageEvent, conversationId, loadThread]);

  const handleSend = async () => {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    setIsSending(true);
    setActionError("");

    try {
      const response = await sendMessage(
        token,
        conversationId,
        trimmedMessage
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        response.data
      ]);
      setMessageText((currentText) =>
        currentText.trim() === trimmedMessage ? "" : currentText
      );
      setConversation((currentConversation) =>
        currentConversation
          ? {
              ...currentConversation,
              lastMessage: response.data.body,
              lastMessageAt: response.data.createdAt,
              unreadCount: 0
            }
          : currentConversation
      );
    } catch (sendError) {
      setActionError(sendError.message);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !conversation) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />

        <View style={styles.stateIconCircle}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.coral}
          />
        </View>

        <Text style={styles.stateTitle}>Could not load this conversation</Text>
        <Text style={styles.stateDescription}>{error}</Text>

        <AppButton
          title="Try again"
          onPress={() => loadThread({ showSpinner: true })}
          style={styles.stateButton}
        />

        <AppButton
          title="Go back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.stateButton}
        />
      </View>
    );
  }

  const counterpart = conversation.counterpart || {};
  const business = counterpart.business || {};
  const requirement = conversation.requirement || {};
  const quotation = conversation.quotation || {};
  const roleLabel = getCounterpartRoleLabel(counterpart.role);

  const renderMessage = ({ item }) => {
    const isMine = Boolean(item.isMine);
    const isRead = Boolean(item.isRead);

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.myMessageRow : styles.theirMessageRow
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myBubble : styles.theirBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine && styles.myMessageText
            ]}
          >
            {item.body}
          </Text>

          <View style={styles.messageMetaRow}>
            <Text
              style={[
                styles.messageTime,
                isMine && styles.myMessageTime
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>

            {isMine ? (
              <View style={styles.deliveryBadge}>
                <Ionicons
                  name={isRead ? "checkmark-done" : "checkmark"}
                  size={12}
                  color={
                    isRead ? colors.mint : "rgba(255, 255, 255, 0.72)"
                  }
                />
                <Text
                  style={[
                    styles.deliveryText,
                    isRead && styles.deliveryTextRead
                  ]}
                >
                  {isRead ? "Read" : "Sent"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyMessages = () => (
    <View style={styles.emptyMessages}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={32}
        color={colors.secondary}
      />
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptyDescription}>
        Discuss quantity, pricing, delivery, or any other details about this
        quotation.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 0}
    >
      <StatusBar style="dark" />

      <View style={styles.contextWrapper}>
        <View style={styles.contextCard}>
          <View style={styles.contextTopRow}>
            <View style={styles.contextAvatar}>
              <Ionicons
                name={
                  counterpart.role === "buyer"
                    ? "briefcase-outline"
                    : "storefront-outline"
                }
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.contextIdentity}>
              <Text style={styles.contextCompany} numberOfLines={1}>
                {business.companyName || roleLabel}
              </Text>
              <Text style={styles.contextRole} numberOfLines={1}>
                {roleLabel}
                {business.city ? ` • ${business.city}` : ""}
              </Text>
            </View>

            {quotation.status ? (
              <QuotationStatusBadge status={quotation.status} />
            ) : null}
          </View>

          <View style={styles.contextMetaRow}>
            <Ionicons
              name="cube-outline"
              size={15}
              color={colors.secondary}
            />
            <Text style={styles.contextMetaText} numberOfLines={1}>
              {requirement.productName || "Requirement"}
            </Text>
            {quotation.totalPrice !== null &&
            quotation.totalPrice !== undefined ? (
              <Text style={styles.contextPrice}>
                {formatCurrency(quotation.totalPrice)}
              </Text>
            ) : null}
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
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.emptyMessageList
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadThread({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={renderEmptyMessages}
        showsVerticalScrollIndicator={false}
      />

      {actionError ? (
        <View style={styles.composerError}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={colors.error}
          />
          <Text style={styles.composerErrorText}>{actionError}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) }
        ]}
      >
        <TextInput
          value={messageText}
          onChangeText={(value) => {
            setMessageText(value);
            if (actionError) {
              setActionError("");
            }
          }}
          placeholder="Write a message..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          textAlignVertical="top"
          editable={!isSending}
        />

        <Pressable
          onPress={handleSend}
          disabled={!messageText.trim() || isSending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={({ pressed }) => [
            styles.sendButton,
            (!messageText.trim() || isSending) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  centeredState: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center"
  },
  stateDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg
  },
  stateButton: {
    width: "100%",
    marginBottom: spacing.sm
  },
  contextWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  contextCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  contextTopRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  contextAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center"
  },
  contextIdentity: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm
  },
  contextCompany: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  contextRole: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  contextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.sm,
    paddingTop: spacing.sm
  },
  contextMetaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: spacing.xs
  },
  contextPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    marginLeft: spacing.sm
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexGrow: 1
  },
  emptyMessageList: {
    justifyContent: "center"
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: spacing.sm
  },
  myMessageRow: {
    justifyContent: "flex-end"
  },
  theirMessageRow: {
    justifyContent: "flex-start"
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs
  },
  theirBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: spacing.xs
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary
  },
  myMessageText: {
    color: colors.white
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: spacing.xs
  },
  messageTime: {
    fontSize: 10,
    color: colors.textMuted
  },
  myMessageTime: {
    color: colors.mint
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.xs
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.72)",
    marginLeft: 2
  },
  deliveryTextRead: {
    color: colors.mint
  },
  emptyMessages: {
    alignItems: "center",
    paddingHorizontal: spacing.lg
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.sm
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs
  },
  composerError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  composerErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.error,
    marginLeft: spacing.xs
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled
  },
  sendButtonPressed: {
    opacity: 0.86
  }
});
