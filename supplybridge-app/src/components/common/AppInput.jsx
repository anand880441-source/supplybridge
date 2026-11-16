import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
  autoCorrect = false,
  maxLength,
  multiline = false
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        multiline={multiline}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null
        ]}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  inputFocused: {
    borderColor: colors.secondary
  },
  inputError: {
    borderColor: colors.coral
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.error
  }
});
