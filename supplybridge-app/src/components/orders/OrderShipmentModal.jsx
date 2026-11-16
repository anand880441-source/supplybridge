import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../../constants/theme";
import {
  getTodayInputValue,
  toDateInputValue
} from "../../utils/formatters";
import AppButton from "../common/AppButton";
import AppInput from "../common/AppInput";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

const EMPTY_FORM = {
  courierName: "",
  trackingNumber: "",
  trackingUrl: "",
  dispatchDate: "",
  packageCount: "1",
  dispatchNote: ""
};

export default function OrderShipmentModal({
  visible,
  order,
  loading,
  isUpdate = false,
  onClose,
  onConfirm,
  onOpenTerms
}) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      return;
    }

    const shipment = order?.shipment || {};

    setForm({
      courierName: shipment.courierName || "",
      trackingNumber: shipment.trackingNumber || "",
      trackingUrl: shipment.trackingUrl || "",
      dispatchDate: shipment.dispatchDate
        ? toDateInputValue(shipment.dispatchDate)
        : getTodayInputValue(),
      packageCount: String(shipment.packageCount || 1),
      dispatchNote: shipment.dispatchNote || ""
    });
    setError("");
  }, [visible, order]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    const courierName = form.courierName.trim();
    const trackingNumber = form.trackingNumber.trim().toUpperCase();
    const trackingUrl = form.trackingUrl.trim();
    const dispatchNote = form.dispatchNote.trim();
    const dispatchDate = form.dispatchDate.trim();
    const packageCount = Number(form.packageCount);

    if (courierName.length < 2) {
      setError("Please enter the courier or transport company name.");
      return;
    }

    if (!/^[A-Z0-9][A-Z0-9 ._/-]{3,79}$/i.test(trackingNumber)) {
      setError("Please enter a valid tracking or docket number.");
      return;
    }

    if (trackingUrl) {
      if (!/^https?:\/\/.+\..+/i.test(trackingUrl)) {
        setError("Tracking URL must be a valid http:// or https:// address.");
        return;
      }
    }

    if (!DATE_PATTERN.test(dispatchDate)) {
      setError("Enter the dispatch date as YYYY-MM-DD.");
      return;
    }

    const parsedDate = new Date(`${dispatchDate}T12:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== dispatchDate
    ) {
      setError("Please enter a valid dispatch date.");
      return;
    }

    if (dispatchDate > getTodayInputValue()) {
      setError("Dispatch date cannot be in the future.");
      return;
    }

    if (
      !Number.isInteger(packageCount) ||
      packageCount < 1 ||
      packageCount > 10000
    ) {
      setError("Package count must be a whole number between 1 and 10000.");
      return;
    }

    if (dispatchNote.length > 500) {
      setError("Dispatch note cannot exceed 500 characters.");
      return;
    }

    setError("");
    onConfirm({
      courierName,
      trackingNumber,
      trackingUrl,
      dispatchDate: `${dispatchDate}T12:00:00.000Z`,
      packageCount,
      dispatchNote
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isUpdate ? "Update shipment" : "Dispatch order"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="car-outline" size={22} color={colors.mint} />
            </View>
            <Text style={styles.heroTitle}>
              {isUpdate ? "Correct the tracking details" : "Mark the goods dispatched"}
            </Text>
            <Text style={styles.heroDescription}>
              {order?.orderNumber} · {order?.productName}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Courier details</Text>

            <AppInput
              label="Courier or transport company *"
              value={form.courierName}
              onChangeText={(value) => updateField("courierName", value)}
              placeholder="e.g. Delhivery, Blue Dart, local transport"
              autoCapitalize="words"
              maxLength={80}
            />

            <AppInput
              label="Tracking / docket number *"
              value={form.trackingNumber}
              onChangeText={(value) => updateField("trackingNumber", value)}
              placeholder="Carrier tracking number"
              autoCapitalize="characters"
              maxLength={80}
            />

            <AppInput
              label="Tracking link (optional)"
              value={form.trackingUrl}
              onChangeText={(value) => updateField("trackingUrl", value)}
              placeholder="https://carrier.com/track/..."
              keyboardType="url"
              autoCapitalize="none"
              maxLength={500}
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Dispatch details</Text>

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <AppInput
                  label="Dispatch date *"
                  value={form.dispatchDate}
                  onChangeText={(value) => updateField("dispatchDate", value)}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  maxLength={10}
                />
              </View>

              <View style={styles.column}>
                <AppInput
                  label="Packages *"
                  value={form.packageCount}
                  onChangeText={(value) => updateField("packageCount", value)}
                  placeholder="1"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  maxLength={5}
                />
              </View>
            </View>

            <AppInput
              label="Dispatch note (optional)"
              value={form.dispatchNote}
              onChangeText={(value) => updateField("dispatchNote", value)}
              placeholder="Vehicle number, loading details, or transit note"
              multiline
              maxLength={500}
            />
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.secondary}
            />
            <Text style={styles.infoText}>
              The buyer sees these details immediately. The order stays shipped
              until the buyer confirms delivery. You may correct tracking
              details while it is in transit.
            </Text>
          </View>

          <Pressable onPress={onOpenTerms} style={styles.termsLinkRow}>
            <Text style={styles.termsLink}>Read shipment and delivery terms</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.secondary}
            />
          </Pressable>

          <AppButton
            title={isUpdate ? "Save shipment details" : "Confirm dispatch"}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary
  },
  headerSpacer: {
    width: 24
  },
  content: {
    padding: spacing.lg
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: "#2D6B5C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.white,
    marginBottom: spacing.xs
  },
  heroDescription: {
    fontSize: 12,
    color: "#D7E7E0"
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  column: {
    flex: 1
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.primary,
    marginLeft: spacing.sm
  },
  termsLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  termsLink: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary,
    marginRight: spacing.xs
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
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    marginLeft: spacing.sm
  }
});
