import { StyleSheet, Text, View } from "react-native";

import { getQuotationStatusMeta } from "../../constants/quotations";
import { radius, spacing } from "../../constants/theme";

export default function QuotationStatusBadge({ status }) {
  const meta = getQuotationStatusMeta(status);

  return (
    <View style={[styles.badge, { backgroundColor: meta.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: meta.textColor }]}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5
  }
});
