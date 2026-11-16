import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import ChoiceChips from "../../components/forms/ChoiceChips";
import { EMD_RATE_OPTIONS } from "../../constants/procurement";
import {
  MAX_REQUIREMENT_IMAGES,
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_UNITS
} from "../../constants/requirements";
import { colors, radius, spacing } from "../../constants/theme";
import { getImageUrl } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { getMyBusiness } from "../../services/businessService";
import {
  createRequirement,
  getRequirementById,
  updateRequirement
} from "../../services/requirementService";
import {
  getTodayInputValue,
  toDateInputValue
} from "../../utils/formatters";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FORM = {
  productName: "",
  category: "",
  subcategory: "",
  quantity: "",
  unit: "",
  specifications: "",
  customization: "",
  budgetMin: "",
  budgetMax: "",
  emdRate: "2",
  deliveryContactName: "",
  deliveryPhone: "",
  deliveryAddress: "",
  deliveryCity: "",
  deliveryState: "",
  deliveryPincode: "",
  deliveryLocation: "",
  deliveryInstructions: "",
  deliveryDate: "",
  notes: ""
};

const buildFormFromRequirement = (requirement, business) => {
  return {
    productName: requirement.productName || "",
    category: requirement.category || "",
    subcategory: requirement.subcategory || "",
    quantity:
      requirement.quantity !== undefined && requirement.quantity !== null
        ? String(requirement.quantity)
        : "",
    unit: requirement.unit || "",
    specifications: requirement.specifications || "",
    customization: requirement.customization || "",
    budgetMin:
      requirement.budgetMin !== null && requirement.budgetMin !== undefined
        ? String(requirement.budgetMin)
        : "",
    budgetMax:
      requirement.budgetMax !== null && requirement.budgetMax !== undefined
        ? String(requirement.budgetMax)
        : "",
    emdRate: String(requirement.emdRate || 2),
    deliveryContactName:
      requirement.deliveryContactName || business?.contactPerson || "",
    deliveryPhone: requirement.deliveryPhone || business?.phone || "",
    deliveryAddress: requirement.deliveryAddress || business?.address || "",
    deliveryCity: requirement.deliveryCity || business?.city || "",
    deliveryState: requirement.deliveryState || business?.state || "",
    deliveryPincode: requirement.deliveryPincode || business?.pincode || "",
    deliveryLocation: requirement.deliveryLocation || "",
    deliveryInstructions: requirement.deliveryInstructions || "",
    deliveryDate: toDateInputValue(requirement.deliveryDate),
    notes: requirement.notes || ""
  };
};

export default function RequirementFormScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const requirementId = route.params?.requirementId;
  const isEdit = Boolean(requirementId);

  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [isEmdLocked, setIsEmdLocked] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");

  const loadScreen = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      if (!isEdit) {
        try {
          const businessResponse = await getMyBusiness(token);
          const ownBusiness = businessResponse.data;

          setBusiness(ownBusiness);
          setForm((currentForm) => ({
            ...currentForm,
            deliveryContactName:
              currentForm.deliveryContactName || ownBusiness.contactPerson || "",
            deliveryPhone:
              currentForm.deliveryPhone || ownBusiness.phone || "",
            deliveryAddress:
              currentForm.deliveryAddress || ownBusiness.address || "",
            deliveryCity: currentForm.deliveryCity || ownBusiness.city || "",
            deliveryState: currentForm.deliveryState || ownBusiness.state || "",
            deliveryPincode:
              currentForm.deliveryPincode || ownBusiness.pincode || ""
          }));
        } catch (businessError) {
          if (businessError.status === 404) {
            setBusiness(null);
          } else {
            setLoadError(businessError.message);
          }
        }

        setIsLoading(false);
        return;
      }

      try {
        const response = await getRequirementById(token, requirementId);
        const data = response.data;

        if (!data.isOwner) {
          setLoadError("You can only edit your own requirements.");
        } else if (data.status === "expired") {
          setLoadError(
            "This requirement has expired and can no longer be edited."
          );
        } else if (data.status !== "open") {
          setLoadError(
            "This requirement is closed and can no longer be edited."
          );
        } else {
          let ownBusiness = null;

          try {
            const businessResponse = await getMyBusiness(token);
            ownBusiness = businessResponse.data;
            setBusiness(ownBusiness);
          } catch (businessError) {
            // The requirement can still be edited with its stored values.
          }

          setForm(buildFormFromRequirement(data, ownBusiness));
          setExistingImages(data.images || []);
          setIsEmdLocked((data.quotationCount || 0) > 0);
        }
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      setLoadError(error.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScreen();
  }, []);

  const updateField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const totalImages = existingImages.length + newImages.length;

  const handleAddImage = async () => {
    if (totalImages >= MAX_REQUIREMENT_IMAGES) {
      Alert.alert(
        "Photo limit reached",
        `You can add up to ${MAX_REQUIREMENT_IMAGES} product photos.`
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [5, 4],
        quality: 0.7
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const selectedFile = new File(asset.uri);

      if (selectedFile.size > 5 * 1024 * 1024) {
        Alert.alert(
          "Image too large",
          "Please choose a photo smaller than 5 MB."
        );
        return;
      }

      if (
        selectedFile.type &&
        !ALLOWED_IMAGE_MIME_TYPES.includes(selectedFile.type)
      ) {
        Alert.alert(
          "Unsupported photo",
          "Please choose a JPG, PNG, or WebP photo."
        );
        return;
      }

      setNewImages((currentImages) => [...currentImages, asset]);
    } catch (error) {
      Alert.alert(
        "Could not add photo",
        error.message || "Please try again."
      );
    }
  };

  const removeExistingImage = (imageUrl) => {
    setExistingImages((currentImages) =>
      currentImages.filter((image) => image !== imageUrl)
    );
  };

  const removeNewImage = (indexToRemove) => {
    setNewImages((currentImages) =>
      currentImages.filter((image, index) => index !== indexToRemove)
    );
  };

  const validateForm = () => {
    if (form.productName.trim().length < 2) {
      return "Please enter the product name.";
    }

    if (!form.category) {
      return "Please choose a product category.";
    }

    const quantity = Number(form.quantity);

    if (
      !form.quantity.trim() ||
      Number.isNaN(quantity) ||
      quantity <= 0 ||
      quantity > 1000000
    ) {
      return "Quantity must be a number greater than zero.";
    }

    if (!form.unit) {
      return "Please choose a unit.";
    }

    if (
      form.specifications.trim().length < 10 ||
      form.specifications.trim().length > 2000
    ) {
      return "Specifications must be between 10 and 2000 characters.";
    }

    if (form.customization.trim().length > 1000) {
      return "Customization details cannot exceed 1000 characters.";
    }

    if (
      form.deliveryContactName.trim().length < 2 ||
      form.deliveryContactName.trim().length > 80
    ) {
      return "Delivery contact name must be between 2 and 80 characters.";
    }

    if (!/^[0-9]{10}$/.test(form.deliveryPhone.trim())) {
      return "Delivery phone must contain exactly 10 digits.";
    }

    if (form.deliveryAddress.trim().length < 5) {
      return "Please enter the full delivery address.";
    }

    if (form.deliveryAddress.trim().length > 300) {
      return "Delivery address cannot exceed 300 characters.";
    }

    if (form.deliveryCity.trim().length < 2) {
      return "Please enter the delivery city.";
    }

    if (form.deliveryState.trim().length < 2) {
      return "Please enter the delivery state.";
    }

    if (!/^[0-9]{6}$/.test(form.deliveryPincode.trim())) {
      return "Delivery PIN code must contain exactly 6 digits.";
    }

    if (form.deliveryLocation.trim().length < 2) {
      return "Please enter the delivery area or landmark.";
    }

    if (form.deliveryInstructions.trim().length > 500) {
      return "Delivery instructions cannot exceed 500 characters.";
    }

    if (!DATE_PATTERN.test(form.deliveryDate.trim())) {
      return "Please enter the delivery date as YYYY-MM-DD.";
    }

    const date = new Date(`${form.deliveryDate.trim()}T12:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== form.deliveryDate.trim()
    ) {
      return "Please enter a valid delivery date.";
    }

    if (form.deliveryDate.trim() < getTodayInputValue()) {
      return "Delivery date cannot be in the past.";
    }

    const budgetMinText = form.budgetMin.trim();
    const budgetMaxText = form.budgetMax.trim();

    const budgetMin = budgetMinText === "" ? null : Number(budgetMinText);
    const budgetMax = budgetMaxText === "" ? null : Number(budgetMaxText);

    if (
      (budgetMin !== null &&
        (Number.isNaN(budgetMin) || budgetMin < 0 || budgetMin > 100000000)) ||
      (budgetMax !== null &&
        (Number.isNaN(budgetMax) || budgetMax < 0 || budgetMax > 100000000))
    ) {
      return "Budgets must be valid positive amounts.";
    }

    if (
      budgetMin !== null &&
      budgetMax !== null &&
      budgetMin > budgetMax
    ) {
      return "Minimum budget cannot be greater than maximum budget.";
    }

    if (!EMD_RATE_OPTIONS.map(String).includes(form.emdRate)) {
      return "Please choose an EMD rate between 2% and 5%.";
    }

    if (form.notes.trim().length > 1000) {
      return "Notes cannot exceed 1000 characters.";
    }

    return "";
  };

  const buildFormData = () => {
    const formData = new FormData();

    formData.append("productName", form.productName.trim());
    formData.append("category", form.category);
    formData.append("subcategory", form.subcategory.trim());
    formData.append("quantity", form.quantity.trim());
    formData.append("unit", form.unit);
    formData.append("specifications", form.specifications.trim());
    formData.append("customization", form.customization.trim());
    formData.append("budgetMin", form.budgetMin.trim());
    formData.append("budgetMax", form.budgetMax.trim());
    formData.append("emdRate", form.emdRate);
    formData.append("deliveryContactName", form.deliveryContactName.trim());
    formData.append("deliveryPhone", form.deliveryPhone.trim());
    formData.append("deliveryAddress", form.deliveryAddress.trim());
    formData.append("deliveryCity", form.deliveryCity.trim());
    formData.append("deliveryState", form.deliveryState.trim());
    formData.append("deliveryPincode", form.deliveryPincode.trim());
    formData.append("deliveryLocation", form.deliveryLocation.trim());
    formData.append(
      "deliveryInstructions",
      form.deliveryInstructions.trim()
    );
    formData.append(
      "deliveryDate",
      `${form.deliveryDate.trim()}T12:00:00.000Z`
    );
    formData.append("notes", form.notes.trim());

    if (isEdit) {
      formData.append("existingImages", JSON.stringify(existingImages));
    }

    newImages.forEach((asset) => {
      // Expo's fetch only supports Blob-like parts, not React Native's
      // legacy { uri, name, type } objects. expo-file-system's File
      // implements the Blob interface and works with multipart uploads.
      formData.append("images", new File(asset.uri));
    });

    return formData;
  };

  const handleSave = async () => {
    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const formData = buildFormData();

      if (isEdit) {
        await updateRequirement(token, requirementId, formData);
        setIsSaving(false);
        navigation.goBack();
      } else {
        const response = await createRequirement(token, formData);
        setIsSaving(false);
        navigation.replace("RequirementDetail", {
          requirementId: response.data.id
        });
      }
    } catch (error) {
      setFormError(error.message);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {isEdit ? "Loading requirement..." : "Preparing the form..."}
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />

        <View style={styles.stateIconCircle}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={colors.coral}
          />
        </View>

        <Text style={styles.stateTitle}>Cannot open this requirement</Text>
        <Text style={styles.stateDescription}>{loadError}</Text>

        <AppButton
          title="Try again"
          onPress={loadScreen}
          style={styles.stateButton}
        />

        <AppButton
          title="Go back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.stateButton}
        />
      </View>
    );
  }

  if (!isEdit && !business) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />

        <View style={styles.stateIconCircle}>
          <Ionicons
            name="business-outline"
            size={28}
            color={colors.secondary}
          />
        </View>

        <Text style={styles.stateTitle}>Business profile required</Text>
        <Text style={styles.stateDescription}>
          Buyers need a business profile so sellers know who posted the
          requirement. Add your company details first.
        </Text>

        <AppButton
          title="Open business profile"
          onPress={() => navigation.navigate("BusinessProfile")}
          style={styles.stateButton}
        />

        <AppButton
          title="Try again"
          onPress={loadScreen}
          variant="secondary"
          style={styles.stateButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formTitle}>
            {isEdit ? "Update your requirement" : "What do you need?"}
          </Text>
          <Text style={styles.formSubtitle}>
            Clear details help sellers send accurate quotations.
          </Text>
          <Text style={styles.formHint}>Fields marked * are required.</Text>

          {formError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.error}
              />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Product</Text>

          <AppInput
            label="Product name *"
            value={form.productName}
            onChangeText={(value) => updateField("productName", value)}
            placeholder="For example: Industrial ball bearings"
            autoCapitalize="sentences"
            maxLength={120}
          />

          <Text style={styles.fieldLabel}>Category *</Text>
          <View style={styles.fieldBlock}>
            <ChoiceChips
              options={REQUIREMENT_CATEGORIES}
              selectedValues={form.category ? [form.category] : []}
              onPress={(value) => updateField("category", value)}
            />
          </View>

          <AppInput
            label="Subcategory (optional)"
            value={form.subcategory}
            onChangeText={(value) => updateField("subcategory", value)}
            placeholder="For example: Bearings"
            autoCapitalize="sentences"
            maxLength={60}
          />

          <Text style={styles.sectionTitle}>Quantity and budget</Text>

          <AppInput
            label="Quantity *"
            value={form.quantity}
            onChangeText={(value) => updateField("quantity", value)}
            placeholder="For example: 100"
            keyboardType="decimal-pad"
            autoCapitalize="none"
            maxLength={10}
          />

          <Text style={styles.fieldLabel}>Unit *</Text>
          <View style={styles.fieldBlock}>
            <ChoiceChips
              options={REQUIREMENT_UNITS}
              selectedValues={form.unit ? [form.unit] : []}
              onPress={(value) => updateField("unit", value)}
            />
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <AppInput
                label="Minimum budget"
                value={form.budgetMin}
                onChangeText={(value) => updateField("budgetMin", value)}
                placeholder="₹ optional"
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={10}
              />
            </View>

            <View style={styles.column}>
              <AppInput
                label="Maximum budget"
                value={form.budgetMax}
                onChangeText={(value) => updateField("budgetMax", value)}
                placeholder="₹ optional"
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={10}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Seller security deposit</Text>
          <Text style={styles.fieldLabel}>EMD rate *</Text>
          <View style={styles.fieldBlock}>
            <ChoiceChips
              options={EMD_RATE_OPTIONS.map(String)}
              selectedValues={[form.emdRate]}
              onPress={(value) => updateField("emdRate", value)}
              getOptionLabel={(value) => `${value}%`}
              disabled={isEmdLocked}
            />
          </View>
          <Text style={styles.emdHint}>
            {isEmdLocked
              ? "The EMD rate is locked because quotations have already arrived."
              : "Sellers hold this percentage of their quoted taxable value in EMD. The rate locks once quotations arrive."}
          </Text>

          <Text style={styles.sectionTitle}>Details</Text>

          <AppInput
            label="Specifications *"
            value={form.specifications}
            onChangeText={(value) => updateField("specifications", value)}
            placeholder="Material, size, quality, and other technical details"
            multiline
            maxLength={2000}
          />

          <AppInput
            label="Customization requirements"
            value={form.customization}
            onChangeText={(value) => updateField("customization", value)}
            placeholder="Branding, packaging, or special instructions"
            multiline
            maxLength={1000}
          />

          <Text style={styles.sectionTitle}>Delivery</Text>
          <Text style={styles.deliveryHint}>
            These details become the delivery snapshot when a seller's
            quotation is accepted.
          </Text>

          <AppInput
            label="Contact name *"
            value={form.deliveryContactName}
            onChangeText={(value) =>
              updateField("deliveryContactName", value)
            }
            placeholder="Person receiving the consignment"
            autoCapitalize="words"
            maxLength={80}
          />

          <AppInput
            label="Contact phone *"
            value={form.deliveryPhone}
            onChangeText={(value) => updateField("deliveryPhone", value)}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            autoCapitalize="none"
            maxLength={10}
          />

          <AppInput
            label="Full delivery address *"
            value={form.deliveryAddress}
            onChangeText={(value) => updateField("deliveryAddress", value)}
            placeholder="Building, street, industrial area"
            autoCapitalize="sentences"
            maxLength={300}
            multiline
          />

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <AppInput
                label="City *"
                value={form.deliveryCity}
                onChangeText={(value) => updateField("deliveryCity", value)}
                placeholder="City"
                autoCapitalize="words"
                maxLength={80}
              />
            </View>

            <View style={styles.column}>
              <AppInput
                label="State *"
                value={form.deliveryState}
                onChangeText={(value) => updateField("deliveryState", value)}
                placeholder="State"
                autoCapitalize="words"
                maxLength={80}
              />
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <AppInput
                label="PIN code *"
                value={form.deliveryPincode}
                onChangeText={(value) =>
                  updateField("deliveryPincode", value)
                }
                placeholder="6-digit PIN"
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={6}
              />
            </View>

            <View style={styles.column}>
              <AppInput
                label="Area or landmark *"
                value={form.deliveryLocation}
                onChangeText={(value) =>
                  updateField("deliveryLocation", value)
                }
                placeholder="Area, landmark, or zone"
                autoCapitalize="sentences"
                maxLength={200}
              />
            </View>
          </View>

          <AppInput
            label="Delivery instructions"
            value={form.deliveryInstructions}
            onChangeText={(value) =>
              updateField("deliveryInstructions", value)
            }
            placeholder="Gate entry, working hours, unloading details"
            multiline
            maxLength={500}
          />

          <AppInput
            label="Delivery date *"
            value={form.deliveryDate}
            onChangeText={(value) => updateField("deliveryDate", value)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
          />
          <Text style={styles.dateHint}>
            Use the format YYYY-MM-DD, for example {getTodayInputValue()}.
          </Text>

          <Text style={styles.sectionTitle}>Product photos</Text>
          <Text style={styles.fieldLabel}>Add up to 3 photos (optional)</Text>
          <Text style={styles.imageHint}>
            Use clear photos of the actual product. The first photo becomes the
            listing cover.
          </Text>

          <View style={styles.imageRow}>
            {existingImages.map((imageUrl) => (
              <View key={imageUrl} style={styles.imageWrapper}>
                <Image
                  source={{ uri: getImageUrl(imageUrl) }}
                  style={styles.image}
                />
                <Pressable
                  onPress={() => removeExistingImage(imageUrl)}
                  style={styles.removeImageButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}

            {newImages.map((asset, index) => (
              <View key={`${asset.uri}-${index}`} style={styles.imageWrapper}>
                <Image source={{ uri: asset.uri }} style={styles.image} />
                <Pressable
                  onPress={() => removeNewImage(index)}
                  style={styles.removeImageButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}

            {totalImages < MAX_REQUIREMENT_IMAGES ? (
              <Pressable
                onPress={handleAddImage}
                style={styles.addImageBox}
                accessibilityRole="button"
                accessibilityLabel="Add product photo"
              >
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={colors.secondary}
                />
                <Text style={styles.addImageText}>Add photo</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Notes</Text>

          <AppInput
            label="Additional notes"
            value={form.notes}
            onChangeText={(value) => updateField("notes", value)}
            placeholder="Anything else sellers should know (optional)"
            multiline
            maxLength={1000}
          />

          <AppButton
            title={isEdit ? "Save changes" : "Post requirement"}
            onPress={handleSave}
            loading={isSaving}
          />

          <AppButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={styles.cancelButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  flex: {
    flex: 1
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
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  stateTitle: {
    fontSize: 18,
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
  stateButton: {
    width: "100%",
    marginBottom: spacing.sm
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  formHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.lg
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  fieldBlock: {
    marginBottom: spacing.md
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  column: {
    flex: 1
  },
  dateHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
  },
  deliveryHint: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
  },
  emdHint: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
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
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginLeft: spacing.sm
  },
  imageHint: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  imageWrapper: {
    position: "relative",
    width: "47%"
  },
  image: {
    width: "100%",
    aspectRatio: 5 / 4,
    borderRadius: radius.lg,
    backgroundColor: colors.white
  },
  removeImageButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white
  },
  addImageBox: {
    width: "47%",
    aspectRatio: 5 / 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.secondary,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  addImageText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
    marginTop: spacing.xs
  },
  cancelButton: {
    marginTop: spacing.sm
  }
});
