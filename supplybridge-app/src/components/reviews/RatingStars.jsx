import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../constants/theme";

const getStarIcon = (value, index) => {
  const threshold = index + 1;

  if (value >= threshold) {
    return "star";
  }

  if (value >= threshold - 0.5) {
    return "star-half";
  }

  return "star-outline";
};

export default function RatingStars({
  value = 0,
  size = 14,
  interactive = false,
  onChange,
  color = colors.amber,
  emptyColor = colors.border,
  style
}) {
  return (
    <View
      style={[styles.row, style]}
      accessibilityLabel={
        interactive ? "Choose a rating" : `Rated ${value} out of 5`
      }
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const icon = interactive
          ? value >= index + 1
            ? "star"
            : "star-outline"
          : getStarIcon(value, index);

        if (!interactive) {
          return (
            <Ionicons
              key={index}
              name={icon}
              size={size}
              color={icon === "star-outline" ? emptyColor : color}
            />
          );
        }

        return (
          <Pressable
            key={index}
            onPress={() => onChange?.(index + 1)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${index + 1} star${
              index === 0 ? "" : "s"
            }`}
            style={styles.starButton}
          >
            <Ionicons name={icon} size={size} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  starButton: {
    padding: 2
  }
});
