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
import RatingStars from "./RatingStars";

const RATING_LABELS = {
  1: "Very poor",
  2: "Below expectations",
  3: "Fair",
  4: "Good",
  5: "Excellent"
};

export default function ReviewModal({
  visible,
  businessName,
  revieweeRole = "seller",
  loading = false,
  onClose,
  onSubmit
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment("");
      setError("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!rating) {
      setError("Choose a star rating before submitting.");
      return;
    }

    setError("");

    try {
      await onSubmit({ rating, comment: comment.trim() });
    } catch (submitError) {
      setError(submitError.message || "Could not submit your review.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={loading ? undefined : onClose}
        />

        <ScrollView
          contentContainerStyle={[
            styles.card,
            { paddingBottom: insets.bottom + spacing.md }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.handle} />

          <Pressable
            onPress={onClose}
            disabled={loading}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close review form"
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.iconCircle}>
            <Ionicons name="star-outline" size={24} color={colors.warning} />
          </View>

          <Text style={styles.title}>Rate this order</Text>
          <Text style={styles.description}>
            Share how {businessName || `the ${revieweeRole}`} handled the
            delivery. Your review helps other businesses trade with confidence.
          </Text>

          <View style={styles.ratingBlock}>
            <RatingStars
              value={rating}
              size={38}
              interactive
              onChange={setRating}
            />
            <Text style={styles.ratingLabel}>
              {rating ? RATING_LABELS[rating] : "Tap a star to rate"}
            </Text>
          </View>

          <AppInput
            label="Your review (optional)"
            value={comment}
            onChangeText={setComment}
            placeholder="Describe the communication, quality, and delivery experience"
            multiline
            maxLength={500}
          />
          <Text style={styles.counter}>{comment.length}/500</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <AppButton
            title="Submit review"
            onPress={handleSubmit}
            loading={loading}
            disabled={!rating || loading}
          />

          <AppButton
            title="Not now"
            onPress={onClose}
            variant="secondary"
            disabled={loading}
            style={styles.cancelButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 42, 31, 0.45)",
    justifyContent: "flex-end"
  },
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: "92%"
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm
  },
  closeButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.lg,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingRight: spacing.xl
  },
  ratingBlock: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.sm
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    marginLeft: spacing.xs
  },
  cancelButton: {
    marginTop: spacing.sm
  }
});
