import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing } from "../../constants/theme";

const BUYER_STEPS = [
  {
    title: "Accept a quotation",
    description:
      "Your order is created with the agreed price, GST, quantity, and delivery terms. The seller's EMD is captured with it."
  },
  {
    title: "The seller fulfils it",
    description:
      "Follow the status as the seller prepares the goods and marks them shipped."
  },
  {
    title: "You confirm delivery",
    description:
      "After the consignment arrives, check it and confirm receipt. The order completes and the captured EMD is released."
  }
];

const SELLER_STEPS = [
  {
    title: "A buyer accepts your quote",
    description:
      "The confirmed order appears here automatically with the agreed terms, and your EMD is captured."
  },
  {
    title: "Prepare and dispatch",
    description:
      "Move the order through processing, then enter courier, tracking, dispatch date, and package count."
  },
  {
    title: "The buyer confirms delivery",
    description:
      "You cannot mark an order delivered yourself. After the buyer confirms receipt, your captured EMD is released."
  }
];

export default function OrderGuideCard({ isSeller, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const steps = isSeller ? SELLER_STEPS : BUYER_STEPS;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setIsExpanded((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${isExpanded ? "Hide" : "Show"} how orders work`}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons
            name="compass-outline"
            size={18}
            color={colors.secondary}
          />
        </View>

        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>How orders work</Text>
          <Text style={styles.subtitle}>
            {isSeller
              ? "An order starts when a buyer accepts your quotation."
              : "A quotation becomes an order only after you accept it."}
          </Text>
        </View>

        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>

      {isExpanded ? (
        <View style={styles.stepsBlock}>
          {steps.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepTextBlock}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md
  },
  headerPressed: {
    backgroundColor: colors.background
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  headerTextBlock: {
    flex: 1,
    marginRight: spacing.sm
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 2
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary
  },
  stepsBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary
  },
  stepTextBlock: {
    flex: 1
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 1
  },
  stepDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary
  }
});
