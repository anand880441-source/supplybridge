import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  ORDER_PROGRESS_STEPS,
  getOrderProgressIndex
} from "../../constants/orders";
import { colors, radius, spacing } from "../../constants/theme";

export default function OrderProgress({ status }) {
  if (status === "cancelled") {
    return (
      <View
        style={[styles.card, styles.cancelledCard]}
        accessible
        accessibilityLabel="Order progress. This order was cancelled and will not be delivered."
      >
        <View style={styles.cancelledIcon}>
          <Ionicons
            name="close-circle-outline"
            size={22}
            color={colors.error}
          />
        </View>
        <View style={styles.cancelledTextBlock}>
          <Text style={styles.cancelledTitle}>Order cancelled</Text>
          <Text style={styles.cancelledText}>
            This order stopped before delivery and will not move through the
            remaining steps.
          </Text>
        </View>
      </View>
    );
  }

  const currentIndex = getOrderProgressIndex(status);
  const currentStep = ORDER_PROGRESS_STEPS[currentIndex];

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Order progress. Step ${currentIndex + 1} of ${
        ORDER_PROGRESS_STEPS.length
      }: ${currentStep.label}.`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Order progress</Text>
        <Text style={styles.progressCount}>
          {currentIndex + 1} of {ORDER_PROGRESS_STEPS.length}
        </Text>
      </View>

      <View style={styles.stepsRow}>
        {ORDER_PROGRESS_STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;
          const isLast = index === ORDER_PROGRESS_STEPS.length - 1;

          return (
            <View key={step.value} style={styles.step}>
              <View style={styles.stepTrackRow}>
                <View
                  style={[
                    styles.connector,
                    index === 0 && styles.connectorHidden,
                    index > 0 &&
                      (isComplete || isActive) &&
                      styles.connectorActive
                  ]}
                />

                <View
                  style={[
                    styles.stepCircle,
                    isComplete && styles.stepCircleComplete,
                    isActive && styles.stepCircleActive
                  ]}
                >
                  <Ionicons
                    name={isComplete ? "checkmark" : step.icon}
                    size={isComplete ? 14 : 13}
                    color={
                      isActive
                        ? colors.white
                        : isComplete
                          ? colors.primary
                          : colors.textMuted
                    }
                  />
                </View>

                <View
                  style={[
                    styles.connector,
                    isLast && styles.connectorHidden,
                    index < currentIndex && styles.connectorActive
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  isComplete && styles.stepLabelComplete,
                  isActive && styles.stepLabelActive
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7
  },
  progressCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary
  },
  stepsRow: {
    flexDirection: "row"
  },
  step: {
    flex: 1,
    alignItems: "center"
  },
  stepTrackRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%"
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border
  },
  connectorActive: {
    backgroundColor: colors.secondary
  },
  connectorHidden: {
    backgroundColor: "transparent"
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  stepCircleComplete: {
    backgroundColor: colors.mint,
    borderColor: colors.secondary
  },
  stepCircleActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  stepLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs
  },
  stepLabelComplete: {
    color: colors.textSecondary
  },
  stepLabelActive: {
    fontWeight: "800",
    color: colors.primary
  },
  cancelledCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderColor: "#F4CFC4"
  },
  cancelledIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  cancelledTextBlock: {
    flex: 1
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.error,
    marginBottom: 2
  },
  cancelledText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary
  }
});
