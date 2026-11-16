import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import BrandLogo from "../../components/common/BrandLogo";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      // On success the root navigator switches to the correct role
      // automatically, so this screen does not need to navigate anywhere.
    } catch (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.xl
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BrandLogo />

          <View style={styles.form}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue to your SupplyBridge workspace.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.error}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <AppInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
            />

            <AppButton
              title="Log in"
              onPress={handleLogin}
              loading={isSubmitting}
              style={styles.submitButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New to SupplyBridge?</Text>

              <Pressable
                onPress={() => navigation.navigate("Register")}
                hitSlop={8}
              >
                <Text style={styles.footerLink}>Create an account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  flex: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.lg
  },
  form: {
    marginTop: spacing.xl
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: spacing.lg
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
  },
  submitButton: {
    marginTop: spacing.sm
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: spacing.xs
  }
});
