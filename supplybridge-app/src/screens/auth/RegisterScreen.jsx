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
import { TERMS_VERSION } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10}$/;

const ROLE_OPTIONS = [
  {
    value: "buyer",
    icon: "cart-outline",
    title: "Buyer",
    description: "I need products or materials"
  },
  {
    value: "seller",
    icon: "storefront-outline",
    title: "Seller",
    description: "I can supply or manufacture products"
  },
  {
    value: "both",
    icon: "people-outline",
    title: "Both",
    description: "I want to buy and sell"
  }
];

function RoleOption({ icon, title, description, isSelected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleOption,
        isSelected && styles.roleOptionSelected,
        pressed && styles.roleOptionPressed
      ]}
    >
      <View
        style={[styles.roleIcon, isSelected && styles.roleIconSelected]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isSelected ? colors.primary : colors.textSecondary}
        />
      </View>

      <View style={styles.roleTextBlock}>
        <Text
          style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}
        >
          {title}
        </Text>
        <Text style={styles.roleDescription}>{description}</Text>
      </View>

      <Ionicons
        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={isSelected ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("buyer");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setErrorMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!PHONE_PATTERN.test(cleanPhone)) {
      setErrorMessage("Phone number must contain exactly 10 digits.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage(
        "Please accept the current terms before creating your account."
      );
      return;
    }

    const roles =
      selectedRole === "both" ? ["buyer", "seller"] : [selectedRole];

    setIsSubmitting(true);

    try {
      await register({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        roles,
        termsAccepted: true,
        termsVersion: TERMS_VERSION
      });
      // On success the root navigator switches to the new account's
      // home screen automatically.
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
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              One account works for both buying and selling.
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
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
            />

            <AppInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <AppInput
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              autoCapitalize="none"
              maxLength={10}
            />

            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
            />

            <AppInput
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter the password again"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.roleLabel}>I am joining as</Text>

            {ROLE_OPTIONS.map((option) => (
              <RoleOption
                key={option.value}
                icon={option.icon}
                title={option.title}
                description={option.description}
                isSelected={selectedRole === option.value}
                onPress={() => setSelectedRole(option.value)}
              />
            ))}

            <Pressable
              onPress={() => setTermsAccepted((current) => !current)}
              style={styles.termsRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              accessibilityLabel="Accept terms of use, business rules, and privacy policy"
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked
                ]}
              >
                {termsAccepted ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : null}
              </View>

              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() =>
                    navigation.navigate("ProcurementPolicy", {
                      sectionId: "accounts"
                    })
                  }
                >
                  terms of use, business rules, and privacy policy
                </Text>
                .
              </Text>
            </Pressable>

            <AppButton
              title="Create account"
              onPress={handleRegister}
              loading={isSubmitting}
              disabled={!termsAccepted}
              style={styles.submitButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>

              <Pressable
                onPress={() => navigation.navigate("Login")}
                hitSlop={8}
              >
                <Text style={styles.footerLink}>Log in</Text>
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
  roleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  roleOptionSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.mint
  },
  roleOptionPressed: {
    opacity: 0.85
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md
  },
  roleIconSelected: {
    backgroundColor: colors.white
  },
  roleTextBlock: {
    flex: 1
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2
  },
  roleTitleSelected: {
    color: colors.primary
  },
  roleDescription: {
    fontSize: 12,
    color: colors.textSecondary
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 1
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "800",
    textDecorationLine: "underline"
  },
  submitButton: {
    marginTop: spacing.md
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
