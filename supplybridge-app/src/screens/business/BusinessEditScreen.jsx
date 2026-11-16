import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import ChoiceChips from "../../components/forms/ChoiceChips";
import { BUSINESS_TYPES, PRODUCT_CATEGORIES } from "../../constants/business";
import { getImageUrl } from "../../constants/config";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  createBusinessProfile,
  getMyBusiness,
  removeBusinessLogo,
  updateBusinessProfile,
  uploadBusinessLogo
} from "../../services/businessService";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10}$/;
const PINCODE_PATTERN = /^[0-9]{6}$/;
const GSTIN_PATTERN = /^[0-9A-Z]{15}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const EMPTY_FORM = {
  companyName: "",
  legalName: "",
  businessType: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  website: "",
  yearEstablished: "",
  categories: [],
  description: "",
  gstin: "",
  panNumber: "",
  registrationNumber: "",
  showContactOnProfile: true
};

const buildForm = (business) => ({
  companyName: business.companyName || "",
  legalName: business.legalName || "",
  businessType: business.businessType || "",
  contactPerson: business.contactPerson || "",
  phone: business.phone || "",
  email: business.email || "",
  address: business.address || "",
  city: business.city || "",
  state: business.state || "",
  pincode: business.pincode || "",
  website: business.website || "",
  yearEstablished: business.yearEstablished
    ? String(business.yearEstablished)
    : "",
  categories: business.categories || [],
  description: business.description || "",
  gstin: business.gstin || "",
  panNumber: business.panNumber || "",
  registrationNumber: business.registrationNumber || "",
  showContactOnProfile: business.showContactOnProfile !== false
});

export default function BusinessEditScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [logoAsset, setLogoAsset] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const response = await getMyBusiness(token);
        setBusiness(response.data);
        setForm(buildForm(response.data));
      } catch (loadError) {
        if (loadError.status !== 404) {
          setError(loadError.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadBusiness();
  }, [token]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleCategory = (category) => {
    setForm((current) => {
      const isSelected = current.categories.includes(category);

      return {
        ...current,
        categories: isSelected
          ? current.categories.filter((item) => item !== category)
          : [...current.categories, category]
      };
    });
  };

  const pickLogo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo access to choose a company logo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        Alert.alert("Logo too large", "Choose an image smaller than 2 MB.");
        return;
      }

      setLogoAsset(asset);
      setRemoveLogo(false);
    } catch (pickError) {
      Alert.alert("Could not choose logo", pickError.message);
    }
  };

  const validateForm = () => {
    if (form.companyName.trim().length < 2) {
      return "Please enter your company name.";
    }

    if (!form.businessType) {
      return "Please choose a business type.";
    }

    if (form.contactPerson.trim().length < 2) {
      return "Please enter the contact person's name.";
    }

    if (!PHONE_PATTERN.test(form.phone.trim())) {
      return "Phone number must contain exactly 10 digits.";
    }

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      return "Please enter a valid business email address.";
    }

    if (form.address.trim().length < 5) {
      return "Please enter the full business address.";
    }

    if (form.city.trim().length < 2 || form.state.trim().length < 2) {
      return "Please enter the city and state.";
    }

    if (!PINCODE_PATTERN.test(form.pincode.trim())) {
      return "PIN code must contain exactly 6 digits.";
    }

    if (form.categories.length === 0) {
      return "Please select at least one product category.";
    }

    if (form.website.trim()) {
      if (!/^https?:\/\/.+\..+/i.test(form.website.trim())) {
        return "Website must be a full http:// or https:// address.";
      }
    }

    if (form.yearEstablished.trim()) {
      const year = Number(form.yearEstablished);
      const currentYear = new Date().getFullYear();

      if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > currentYear
      ) {
        return `Year established must be between 1900 and ${currentYear}.`;
      }
    }

    const gstin = form.gstin.trim().toUpperCase();

    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      return "GSTIN must contain 15 letters and numbers.";
    }

    const pan = form.panNumber.trim().toUpperCase();

    if (pan && !PAN_PATTERN.test(pan)) {
      return "PAN must be in the format ABCDE1234F.";
    }

    return "";
  };

  const handleSave = async () => {
    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      companyName: form.companyName.trim(),
      legalName: form.legalName.trim(),
      businessType: form.businessType,
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      website: form.website.trim(),
      yearEstablished: form.yearEstablished.trim()
        ? Number(form.yearEstablished)
        : null,
      categories: form.categories,
      description: form.description.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      panNumber: form.panNumber.trim().toUpperCase(),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      showContactOnProfile: form.showContactOnProfile
    };

    setIsSaving(true);

    try {
      const response = business
        ? await updateBusinessProfile(token, business.id, payload)
        : await createBusinessProfile(token, payload);

      let updatedBusiness = response.data;

      if (logoAsset) {
        const logoResponse = await uploadBusinessLogo(
          token,
          updatedBusiness.id,
          logoAsset
        );
        updatedBusiness = logoResponse.data;
      } else if (removeLogo && updatedBusiness.logoUrl) {
        const logoResponse = await removeBusinessLogo(
          token,
          updatedBusiness.id
        );
        updatedBusiness = logoResponse.data;
      }

      setBusiness(updatedBusiness);
      setForm(buildForm(updatedBusiness));
      setLogoAsset(null);
      setRemoveLogo(false);

      Alert.alert(
        business ? "Profile updated" : "Profile created",
        business
          ? "Your business details were saved."
          : "Your business profile is ready.",
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing your profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <Text style={styles.stateTitle}>Could not load your profile</Text>
        <Text style={styles.stateDescription}>{error}</Text>
        <AppButton title="Go back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const currentLogoUri = logoAsset
    ? logoAsset.uri
    : !removeLogo && business?.logoUrl
      ? getImageUrl(business.logoUrl)
      : "";

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
          <View style={styles.logoCard}>
            <Text style={styles.sectionTitle}>Company logo</Text>

            {currentLogoUri ? (
              <Image
                source={{ uri: currentLogoUri }}
                style={styles.logoPreview}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons
                  name="business-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>
            )}

            <View style={styles.logoActions}>
              <AppButton
                title={currentLogoUri ? "Change logo" : "Choose logo"}
                onPress={pickLogo}
                variant="secondary"
                style={styles.logoButton}
              />

              {currentLogoUri ? (
                <AppButton
                  title="Remove"
                  onPress={() => {
                    setLogoAsset(null);
                    setRemoveLogo(true);
                  }}
                  variant="secondary"
                  style={styles.logoButton}
                />
              ) : null}
            </View>
            <Text style={styles.logoHint}>Square JPG, PNG, or WebP up to 2 MB.</Text>
          </View>

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

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Business identity</Text>

            <AppInput
              label="Company or trading name *"
              value={form.companyName}
              onChangeText={(value) => updateField("companyName", value)}
              placeholder="Name shown across SupplyBridge"
              autoCapitalize="words"
              maxLength={120}
            />

            <AppInput
              label="Legal name"
              value={form.legalName}
              onChangeText={(value) => updateField("legalName", value)}
              placeholder="Name on your PAN or registration"
              autoCapitalize="words"
              maxLength={160}
            />

            <Text style={styles.fieldLabel}>Business type *</Text>
            <View style={styles.fieldBlock}>
              <ChoiceChips
                options={BUSINESS_TYPES}
                selectedValues={
                  form.businessType ? [form.businessType] : []
                }
                onPress={(value) => updateField("businessType", value)}
              />
            </View>

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <AppInput
                  label="Year established"
                  value={form.yearEstablished}
                  onChangeText={(value) => updateField("yearEstablished", value)}
                  placeholder="e.g. 2014"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.column}>
                <AppInput
                  label="Website"
                  value={form.website}
                  onChangeText={(value) => updateField("website", value)}
                  placeholder="https://"
                  keyboardType="url"
                  autoCapitalize="none"
                  maxLength={300}
                />
              </View>
            </View>

            <AppInput
              label="About the business"
              value={form.description}
              onChangeText={(value) => updateField("description", value)}
              placeholder="What you make, supply, or specialise in"
              multiline
              maxLength={1000}
            />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Contact and address</Text>

            <AppInput
              label="Contact person *"
              value={form.contactPerson}
              onChangeText={(value) => updateField("contactPerson", value)}
              placeholder="Person buyers or sellers should contact"
              autoCapitalize="words"
              maxLength={80}
            />

            <AppInput
              label="Business phone *"
              value={form.phone}
              onChangeText={(value) => updateField("phone", value)}
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <AppInput
              label="Business email *"
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              placeholder="sales@yourcompany.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <AppInput
              label="Business address *"
              value={form.address}
              onChangeText={(value) => updateField("address", value)}
              placeholder="Building, street, area"
              multiline
              maxLength={300}
            />

            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <AppInput
                  label="City *"
                  value={form.city}
                  onChangeText={(value) => updateField("city", value)}
                  placeholder="City"
                  autoCapitalize="words"
                  maxLength={80}
                />
              </View>
              <View style={styles.column}>
                <AppInput
                  label="State *"
                  value={form.state}
                  onChangeText={(value) => updateField("state", value)}
                  placeholder="State"
                  autoCapitalize="words"
                  maxLength={80}
                />
              </View>
            </View>

            <AppInput
              label="PIN code *"
              value={form.pincode}
              onChangeText={(value) => updateField("pincode", value)}
              placeholder="6-digit PIN code"
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchTextBlock}>
                <Text style={styles.switchTitle}>
                  Show contact details publicly
                </Text>
                <Text style={styles.switchDescription}>
                  Other businesses can see your contact person, phone, and
                  email on your public profile.
                </Text>
              </View>
              <Switch
                value={form.showContactOnProfile}
                onValueChange={(value) =>
                  updateField("showContactOnProfile", value)
                }
                trackColor={{ true: colors.secondary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Legal and tax</Text>

            <AppInput
              label="PAN"
              value={form.panNumber}
              onChangeText={(value) => updateField("panNumber", value)}
              placeholder="ABCDE1234F"
              autoCapitalize="characters"
              maxLength={10}
            />

            <AppInput
              label="GSTIN"
              value={form.gstin}
              onChangeText={(value) => updateField("gstin", value)}
              placeholder="15-character GSTIN"
              autoCapitalize="characters"
              maxLength={15}
            />

            <AppInput
              label="Registration number"
              value={form.registrationNumber}
              onChangeText={(value) =>
                updateField("registrationNumber", value)
              }
              placeholder="Company or shop registration number"
              autoCapitalize="characters"
              maxLength={80}
            />

            <Text style={styles.helperText}>
              Legal details are used only for verification. They are not shown
              on your public profile.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Product categories *</Text>
            <ChoiceChips
              options={PRODUCT_CATEGORIES}
              selectedValues={form.categories}
              onPress={toggleCategory}
            />
          </View>

          <AppButton
            title={business ? "Save business details" : "Create business profile"}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate("ProcurementPolicy", {
              sectionId: "business-verification"
            })}
            style={styles.termsLink}
          >
            <Text style={styles.termsLinkText}>
              How business verification works
            </Text>
          </TouchableOpacity>
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
  logoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center"
  },
  logoPreview: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.mint,
    marginBottom: spacing.sm
  },
  logoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  logoActions: {
    flexDirection: "row"
  },
  logoButton: {
    paddingVertical: spacing.sm,
    minHeight: 42,
    marginHorizontal: spacing.xs
  },
  logoHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xs
  },
  switchTextBlock: {
    flex: 1,
    marginRight: spacing.sm
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary
  },
  switchDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2
  },
  helperText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted
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
  },
  termsLink: {
    alignItems: "center",
    paddingVertical: spacing.md
  },
  termsLinkText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary
  }
});
