import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

// Reusable chip selector used by business type and product categories.
// The parent component decides whether one or many chips can be selected.
export default function ChoiceChips({
  options,
  selectedValues,
  onPress,
  getOptionLabel,
  disabled = false
}) {
  return (
    <View style={styles.wrapper}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option);

        return (
          <Pressable
            key={option}
            onPress={() => onPress(option)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled }}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.chipPressed,
              disabled && styles.chipDisabled
            ]}
          >
            <Text
              style={[styles.chipText, isSelected && styles.chipTextSelected]}
            >
              {getOptionLabel ? getOptionLabel(option) : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  chipSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.secondary
  },
  chipPressed: {
    opacity: 0.8
  },
  chipDisabled: {
    opacity: 0.55
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary
  },
  chipTextSelected: {
    color: colors.primary
  }
});
