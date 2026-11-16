import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../../constants/theme";

// Temporary screen for tabs whose real features arrive in a later phase.
export default function PlaceholderScreen({
  title,
  description,
  phaseLabel
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <StatusBar style="dark" />

      <Text style={styles.title}>{title}</Text>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="construct-outline"
            size={28}
            color={colors.secondary}
          />
        </View>

        {phaseLabel ? (
          <Text style={styles.phaseLabel}>{phaseLabel}</Text>
        ) : null}

        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.lg
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center"
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center"
  }
});
