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
import AppButton from "../common/AppButton";
import AppInput from "../common/AppInput";

export default function OrderDeliveryModal({
  visible,
  order,
  loading,
  onClose,
  onConfirm,
  onOpenTerms
}) {
  const insets = useSafeAreaInsets();
  const [recipientName, setRecipientName] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      return;
    }

    const defaultName =
      order?.deliveryAddress?.contactName ||
      order?.counterpart?.business?.contactPerson ||
      "";

    setRecipientName(defaultName);
    setDeliveryNote("");
    setIsConfirmed(false);
    setError("");
  }, [visible, order]);

  const handleSubmit = () => {
    const cleanRecipient = recipientName.trim();
    const cleanNote = deliveryNote.trim();

    if (!isConfirmed) {
      setError("Please confirm that the full consignment was received.");
      return;
    }

    if (cleanRecipient.length < 2) {
      setError("Please enter the name of the person who received the goods.");
      return;
    }

    if (cleanNote.length > 500) {
      setError("Delivery note cannot exceed 500 characters.");
      return;
    }

    setError("");
    onConfirm({
      recipientName: cleanRecipient,
      deliveryNote: cleanNote,
      receivedInGoodCondition: true
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
          <Text style={styles.headerTitle}>Confirm delivery</Text>
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
              <Ionicons
                name="checkmark-done-outline"
                size={23}
                color={colors.primary}
              />
            </View>
            <Text style={styles.heroTitle}>Check the consignment first</Text>
            <Text style={styles.heroDescription}>
              Confirm only after the full quantity has arrived in acceptable
              condition. This completes the order and releases the seller's
              captured EMD.
            </Text>
          </View>

          {order?.shipment ? (
            <View style={styles.shipmentCard}>
              <Text style={styles.shipmentLabel}>SHIPMENT</Text>
              <Text style={styles.shipmentValue}>
                {order.shipment.courierName} · {order.shipment.trackingNumber}
              </Text>
              <Text style={styles.shipmentMeta}>
                {order.shipment.packageCount} package
                {Number(order.shipment.packageCount) === 1 ? "" : "s"} dispatched
              </Text>
            </View>
          ) : null}

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
            <AppInput
              label="Received by *"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Person who received the goods"
              autoCapitalize="words"
              maxLength={80}
            />

            <AppInput
              label="Delivery note (optional)"
              value={deliveryNote}
              onChangeText={setDeliveryNote}
              placeholder="Condition, shortage, or handover note"
              multiline
              maxLength={500}
            />
          </View>

          <Pressable
            onPress={() => setIsConfirmed((current) => !current)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isConfirmed }}
            style={styles.confirmRow}
          >
            <View
              style={[
                styles.checkbox,
                isConfirmed && styles.checkboxChecked
              ]}
            >
              {isConfirmed ? (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              ) : null}
            </View>
            <Text style={styles.confirmText}>
              I confirm that the complete ordered quantity was received in
              acceptable condition.
            </Text>
          </Pressable>

          <View style={styles.warningCard}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              Delivery confirmation is final. If there is a shortage, damage, or
              quality issue, message the seller before confirming so the
              problem can be recorded.
            </Text>
          </View>

          <Pressable onPress={onOpenTerms} style={styles.termsLinkRow}>
            <Text style={styles.termsLink}>Read delivery and dispute terms</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.secondary}
            />
          </Pressable>

          <AppButton
            title="Confirm delivery"
            onPress={handleSubmit}
            loading={loading}
            disabled={!isConfirmed || loading}
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
    backgroundColor: colors.mint,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.xs
  },
  heroDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.primary
  },
  shipmentCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  shipmentLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 0.7,
    marginBottom: spacing.xs
  },
  shipmentValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary
  },
  shipmentMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 1
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  confirmText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textPrimary
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.warning,
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
