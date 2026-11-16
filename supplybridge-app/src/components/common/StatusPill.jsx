import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "../../constants/theme";

export default function StatusPill({
  label,
  icon,
  tone = "neutral",
  style
}) {
  const tones = {
    neutral: {
      backgroundColor: colors.divider,
      color: colors.textSecondary
    },
    success: {
      backgroundColor: colors.successSoft,
      color: colors.success
    },
    warning: {
      backgroundColor: colors.warningSoft,
      color: colors.warning
    },
    info: {
      backgroundColor: colors.infoSoft,
      color: colors.info
    },
    danger: {
      backgroundColor: colors.errorSoft,
      color: colors.error
    }
  };
  const palette = tones[tone] || tones.neutral;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: palette.backgroundColor },
        style
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={12} color={palette.color} />
      ) : null}
      <Text
        style={[
          styles.label,
          { color: palette.color },
          icon && styles.labelWithIcon
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  labelWithIcon: {
    marginLeft: 4
  }
});
