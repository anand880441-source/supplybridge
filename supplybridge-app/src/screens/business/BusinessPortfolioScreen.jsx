import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import { getImageUrl } from "../../constants/config";
import { formatDate } from "../../utils/formatters";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  addPortfolioItem,
  deletePortfolioItem,
  getMyBusiness
} from "../../services/businessService";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const MAX_PORTFOLIO_ITEMS = 6;

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "",
  category: "",
  completedAt: ""
};

export default function BusinessPortfolioScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [business, setBusiness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [imageAsset, setImageAsset] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeItemId, setActiveItemId] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const loadBusiness = async ({ refresh = false } = {}) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError("");

    try {
      const response = await getMyBusiness(token);
      setBusiness(response.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBusiness();
    }, [token])
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openModal = () => {
    setForm({ ...EMPTY_FORM });
    setImageAsset(null);
    setFormError("");
    setIsModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo access to add portfolio work."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert("Image too large", "Choose an image smaller than 5 MB.");
        return;
      }

      setImageAsset(asset);
    } catch (pickError) {
      Alert.alert("Could not choose image", pickError.message);
    }
  };

  const handleAdd = async () => {
    const title = form.title.trim();
    const completedAt = form.completedAt.trim();

    setFormError("");

    if (!imageAsset) {
      setFormError("Please choose a project image.");
      return;
    }

    if (title.length < 2) {
      setFormError("Please enter a project title.");
      return;
    }

    if (completedAt) {
      if (!DATE_PATTERN.test(completedAt)) {
        setFormError("Completion date must be in YYYY-MM-DD format.");
        return;
      }

      const parsedDate = new Date(`${completedAt}T12:00:00.000Z`);

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== completedAt
      ) {
        setFormError("Please enter a valid completion date.");
        return;
      }

      if (completedAt > new Date().toISOString().slice(0, 10)) {
        setFormError("Completion date cannot be in the future.");
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await addPortfolioItem(
        token,
        business.id,
        imageAsset,
        {
          title,
          description: form.description.trim(),
          location: form.location.trim(),
          category: form.category.trim(),
          completedAt: completedAt
            ? `${completedAt}T12:00:00.000Z`
            : ""
        }
      );

      setBusiness(response.data);
      setIsModalVisible(false);
      Alert.alert("Portfolio updated", "The project was added to your profile.");
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert(
      "Remove portfolio item",
      `Remove "${item.title}" from your public profile?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActiveItemId(item.id);

            try {
              const response = await deletePortfolioItem(
                token,
                business.id,
                item.id
              );
              setBusiness(response.data);
            } catch (deleteError) {
              Alert.alert("Could not remove item", deleteError.message);
            } finally {
              setActiveItemId("");
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  if (error || !business) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <Text style={styles.stateTitle}>Could not load portfolio</Text>
        <Text style={styles.stateDescription}>
          {error || "Create a business profile first."}
        </Text>
        <AppButton title="Try again" onPress={() => loadBusiness()} />
      </View>
    );
  }

  const portfolio = business.portfolio || [];
  const isAtLimit = portfolio.length >= MAX_PORTFOLIO_ITEMS;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadBusiness({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="images-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.introTitle}>Show your best work</Text>
          <Text style={styles.introDescription}>
            Add up to six completed projects with a photo and short details.
            Portfolio work appears on your public business profile.
          </Text>
          <Text style={styles.introCount}>
            {portfolio.length} of {MAX_PORTFOLIO_ITEMS} used
          </Text>
        </View>

        {portfolio.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="camera-outline"
              size={30}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No portfolio items yet</Text>
            <Text style={styles.emptyDescription}>
              A single strong project photo helps buyers judge your capability.
            </Text>
          </View>
        ) : (
          portfolio.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Image
                source={{ uri: getImageUrl(item.imageUrl) }}
                style={styles.itemImage}
              />
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{item.title}</Text>

                <Text style={styles.itemMeta}>
                  {[item.category, item.location, item.completedAt
                    ? formatDate(item.completedAt)
                    : ""]
                    .filter(Boolean)
                    .join(" - ")}
                </Text>

                {item.description ? (
                  <Text style={styles.itemDescription} numberOfLines={3}>
                    {item.description}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={() => confirmDelete(item)}
                  disabled={activeItemId === item.id}
                  style={styles.removeButton}
                >
                  {activeItemId === item.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={colors.error}
                      />
                      <Text style={styles.removeText}>Remove</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <AppButton
          title={isAtLimit ? "Portfolio limit reached" : "Add portfolio item"}
          onPress={openModal}
          disabled={isAtLimit}
        />
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsModalVisible(false)}
          />

          <ScrollView
            contentContainerStyle={[
              styles.modalCard,
              { paddingBottom: insets.bottom + spacing.md }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTitle}>Add portfolio work</Text>

            <Pressable onPress={pickImage} style={styles.imagePicker}>
              {imageAsset ? (
                <Image
                  source={{ uri: imageAsset.uri }}
                  style={styles.previewImage}
                />
              ) : (
                <>
                  <Ionicons
                    name="camera-outline"
                    size={26}
                    color={colors.secondary}
                  />
                  <Text style={styles.imagePickerText}>Choose project photo</Text>
                </>
              )}
            </Pressable>

            {formError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            <AppInput
              label="Project title *"
              value={form.title}
              onChangeText={(value) => updateField("title", value)}
              placeholder="e.g. 120 office chairs for a corporate client"
              maxLength={100}
            />

            <AppInput
              label="Description"
              value={form.description}
              onChangeText={(value) => updateField("description", value)}
              placeholder="Scope, quantity, materials, or outcome"
              multiline
              maxLength={500}
            />

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <AppInput
                  label="Category"
                  value={form.category}
                  onChangeText={(value) => updateField("category", value)}
                  placeholder="Furniture"
                  maxLength={60}
                />
              </View>
              <View style={styles.column}>
                <AppInput
                  label="Location"
                  value={form.location}
                  onChangeText={(value) => updateField("location", value)}
                  placeholder="City"
                  maxLength={120}
                />
              </View>
            </View>

            <AppInput
              label="Completed on"
              value={form.completedAt}
              onChangeText={(value) => updateField("completedAt", value)}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              maxLength={10}
            />

            <AppButton
              title="Add to portfolio"
              onPress={handleAdd}
              loading={isSaving}
              disabled={isSaving}
            />

            <AppButton
              title="Cancel"
              onPress={() => setIsModalVisible(false)}
              variant="secondary"
              style={styles.modalCancelButton}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
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
  stateTitle: {
    fontSize: 19,
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
  introCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
    marginBottom: spacing.xs
  },
  introDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: "#D7E7E0"
  },
  introCount: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.mint,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.md
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.md
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.sm
  },
  emptyDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md
  },
  itemImage: {
    width: "100%",
    height: 180,
    backgroundColor: colors.mint
  },
  itemBody: {
    padding: spacing.md
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary
  },
  itemMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: spacing.sm
  },
  removeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.error,
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 42, 31, 0.45)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: "92%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  imagePicker: {
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.md
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  imagePickerText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
    marginTop: spacing.xs
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  column: {
    flex: 1
  },
  errorBanner: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  errorText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.error
  },
  modalCancelButton: {
    marginTop: spacing.sm
  }
});
