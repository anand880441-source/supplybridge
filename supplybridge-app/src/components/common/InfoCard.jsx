import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, shadows, spacing } from "../../constants/theme";

export default function InfoCard({
  title,
  eyebrow,
  icon,
  action,
  children,
  style
}) {
  return (
    <View style={[styles.card, style]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}

      {title || icon || action ? (
        <View style={styles.header}>
          {icon ? (
            <View style={styles.iconCircle}>
              <Ionicons name={icon} size={17} color={colors.secondary} />
            </View>
          ) : null}

          {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.flex} />}

          {action}
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.xs
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary
  },
  flex: {
    flex: 1
  }
});
