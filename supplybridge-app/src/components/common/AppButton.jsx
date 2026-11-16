import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text
} from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.white : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.secondaryButtonText,
            variant === "danger" && styles.dangerButtonText
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52
  },
  secondaryButton: {
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.border
  },
  dangerButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.coral
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButtonText: {
    color: colors.primary
  },
  dangerButtonText: {
    color: colors.error
  }
});
