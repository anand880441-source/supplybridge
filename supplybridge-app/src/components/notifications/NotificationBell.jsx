import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius } from "../../constants/theme";
import { useNotifications } from "../../context/NotificationsContext";

export default function NotificationBell({ onPress, style }) {
  const { unreadCount } = useNotifications();
  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : "";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        style
      ]}
    >
      <Ionicons
        name="notifications-outline"
        size={21}
        color={colors.primary}
      />

      {badgeLabel ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonPressed: {
    opacity: 0.75
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.background,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "800"
  }
});
