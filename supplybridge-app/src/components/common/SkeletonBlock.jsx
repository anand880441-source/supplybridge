import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { colors, radius } from "../../constants/theme";

export default function SkeletonBlock({
  width = "100%",
  height = 14,
  borderRadius = radius.sm,
  style
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius, opacity },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.border
  }
});
