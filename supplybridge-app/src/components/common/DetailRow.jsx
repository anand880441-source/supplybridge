import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing } from "../../constants/theme";

export default function DetailRow({
  icon,
  label,
  value,
  valueColor,
  last = false
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={15} color={colors.secondary} />
        </View>
      ) : null}

      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, valueColor && { color: valueColor }]}>
          {value || "Not provided"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  textBlock: {
    flex: 1
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2
  },
  value: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary
  }
});
