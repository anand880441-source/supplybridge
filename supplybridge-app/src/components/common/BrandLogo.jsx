import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../constants/theme";

export default function BrandLogo({ size = 56, showName = true }) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: size / 4
          }
        ]}
      >
        <Text style={[styles.markText, { fontSize: size * 0.36 }]}>SB</Text>
      </View>

      {showName ? <Text style={styles.name}>SupplyBridge</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center"
  },
  mark: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  markText: {
    color: colors.mint,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  name: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.3
  }
});
