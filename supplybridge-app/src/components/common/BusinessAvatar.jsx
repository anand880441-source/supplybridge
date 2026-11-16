import { Image, StyleSheet, Text, View } from "react-native";

import { getImageUrl } from "../../constants/config";
import { colors, radius } from "../../constants/theme";

const AVATAR_COLORS = ["#164E43", "#26715F", "#235C8A", "#8A5B00", "#8B4A38"];

const getInitials = (name) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "SB";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const getAvatarColor = (name) => {
  const text = String(name || "SupplyBridge");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash + text.charCodeAt(index) * (index + 1)) % AVATAR_COLORS.length;
  }

  return AVATAR_COLORS[hash];
};

export default function BusinessAvatar({ business, size = 44, style }) {
  const name = business?.companyName || "";
  const logoUrl = business?.logoUrl ? getImageUrl(business.logoUrl) : "";

  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          style
        ]}
        accessibilityLabel={`${name || "Business"} logo`}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size > 60 ? radius.xl : size / 2,
          backgroundColor: getAvatarColor(name)
        },
        style
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: Math.max(11, Math.round(size * 0.32)) }
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.mint
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center"
  },
  initials: {
    color: colors.white,
    fontWeight: "800",
    letterSpacing: 0.4
  }
});
