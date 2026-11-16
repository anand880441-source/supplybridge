import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import ChoiceChips from "../../components/forms/ChoiceChips";
import { EMD_RATE_OPTIONS } from "../../constants/procurement";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  getRequirementById,
  repostRequirement
} from "../../services/requirementService";
import {
  formatDate,
  getTodayInputValue,
  toDateInputValue
} from "../../utils/formatters";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export default function RequirementRepostScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { requirementId } = route.params;

  const [requirement, setRequirement] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [emdRate, setEmdRate] = useState("2");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadRequirement = async () => {
      try {
        const response = await getRequirementById(token, requirementId);
        const data = response.data;

        if (!data.isOwner) {
          setLoadError("You can only repost your own requirements.");
          return;
        }

        if (data.nextRequirementId) {
          setLoadError("This requirement already has a newer round.");
          return;
        }

        if (!["cancelled", "closed", "expired"].includes(data.status)) {
          setLoadError(
            "Only a cancelled, closed, or expired requirement can be reposted."
          );
          return;
        }

        setRequirement(data);
        setEmdRate(String(data.emdRate || 2));

        const currentDeliveryDate = toDateInputValue(data.deliveryDate);

        setDeliveryDate(
          currentDeliveryDate && currentDeliveryDate >= getTodayInputValue()
            ? currentDeliveryDate
            : ""
        );
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequirement();
  }, [token, requirementId]);

  const handleRepost = async () => {
    setFormError("");

    if (!DATE_PATTERN.test(deliveryDate.trim())) {
      setFormError("Please enter the new delivery date as YYYY-MM-DD.");
      return;
    }

    const date = new Date(`${deliveryDate.trim()}T12:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== deliveryDate.trim()
    ) {
      setFormError("Please enter a valid delivery date.");
      return;
    }

    if (deliveryDate.trim() < getTodayInputValue()) {
      setFormError("Delivery date cannot be in the past.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await repostRequirement(token, requirementId, {
        deliveryDate: `${deliveryDate.trim()}T12:00:00.000Z`,
        emdRate: Number(emdRate)
      });

      navigation.replace("RequirementDetail", {
        requirementId: response.data.id
      });
    } catch (error) {
      setFormError(error.message);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing the new round...</Text>
      </View>
    );
  }

  if (loadError || !requirement) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />

        <View style={styles.stateIconCircle}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={colors.coral}
          />
        </View>

        <Text style={styles.stateTitle}>Cannot repost this requirement</Text>
        <Text style={styles.stateDescription}>{loadError}</Text>

        <AppButton
          title="Go back"
          onPress={() => navigation.goBack()}
          style={styles.stateButton}
        />
      </View>
    );
  }

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
            { paddingBottom: insets.bottom + spacing.xl }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Start a new round</Text>
          <Text style={styles.subtitle}>
            Product details and photos are copied. Quotations, orders, and
            EMD records from the earlier round stay unchanged.
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="copy-outline"
                size={19}
                color={colors.primary}
              />
            </View>
            <View style={styles.summaryTextBlock}>
              <Text style={styles.summaryLabel}>
                Round {requirement.roundNumber || 1} •{" "}
                {requirement.status}
              </Text>
              <Text style={styles.summaryProduct}>
                {requirement.productName}
              </Text>
              <Text style={styles.summaryMeta}>
                Previous delivery date: {formatDate(requirement.deliveryDate)}
              </Text>
            </View>
          </View>

          {formError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.error}
              />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>New delivery date</Text>
          <AppInput
            label="Delivery date *"
            value={deliveryDate}
            onChangeText={setDeliveryDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
          />
          <Text style={styles.hint}>
            Use YYYY-MM-DD, for example {getTodayInputValue()}.
          </Text>

          <Text style={styles.sectionTitle}>Seller security deposit</Text>
          <Text style={styles.fieldLabel}>EMD rate *</Text>
          <View style={styles.chipsBlock}>
            <ChoiceChips
              options={EMD_RATE_OPTIONS.map(String)}
              selectedValues={[emdRate]}
              onPress={setEmdRate}
              getOptionLabel={(value) => `${value}%`}
            />
          </View>
          <Text style={styles.hint}>
            The new round starts with no quotations, so the EMD rate can be
            changed before sellers respond.
          </Text>

          <AppButton
            title="Repost as new round"
            onPress={handleRepost}
            loading={isSaving}
          />

          <AppButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={styles.cancelButton}
          />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  centeredState: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center"
  },
  stateDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg
  },
  stateButton: {
    width: "100%"
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.md
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  summaryTextBlock: {
    flex: 1
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2
  },
  summaryProduct: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  summaryMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  chipsBlock: {
    marginBottom: spacing.sm
  },
  hint: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: -spacing.sm,
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
  cancelButton: {
    marginTop: spacing.sm
  }
});
