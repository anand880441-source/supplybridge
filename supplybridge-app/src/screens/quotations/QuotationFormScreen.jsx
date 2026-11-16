import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import ChoiceChips from "../../components/forms/ChoiceChips";
import {
  GST_PRICING_MODES,
  GST_RATES,
  TERMS_VERSION
} from "../../constants/procurement";
import {
  QUOTATION_OFFER_TYPES,
  getQuotationOfferTypeMeta
} from "../../constants/quotations";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getMyBusiness } from "../../services/businessService";
import { getWallet } from "../../services/walletService";
import {
  createQuotation,
  getQuotationById,
  updateQuotation
} from "../../services/quotationService";
import { getRequirementById } from "../../services/requirementService";
import {
  formatBudget,
  formatCurrency,
  formatDate,
  formatQuantity,
  getTodayInputValue,
  toDateInputValue
} from "../../utils/formatters";
import {
  calculateEmdAmount,
  calculateTaxPreview
} from "../../utils/tax";

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

const EMPTY_FORM = {
  offerType: "full",
  offeredQuantity: "",
  unitPrice: "",
  gstRate: "18",
  pricingMode: "exclusive",
  deliveryDate: "",
  message: "",
  termsAccepted: false
};

export default function QuotationFormScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const requirementId = route.params?.requirementId;
  const quotationId = route.params?.quotationId;
  const isEdit = Boolean(quotationId);

  const [requirement, setRequirement] = useState(null);
  const [business, setBusiness] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadScreen = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        if (!requirementId) {
          setLoadError("Requirement information is missing.");
          return;
        }

        const [requirementResult, businessResult, walletResult] =
          await Promise.allSettled([
            getRequirementById(token, requirementId),
            getMyBusiness(token),
            getWallet(token)
          ]);

        if (!isActive) {
          return;
        }

        if (requirementResult.status === "rejected") {
          setLoadError(requirementResult.reason?.message || "Unable to load.");
          return;
        }

        const requirementData = requirementResult.value.data;

        if (requirementData.isOwner) {
          setLoadError("You cannot send a quotation for your own requirement.");
          return;
        }

        if (requirementData.status === "expired") {
          setLoadError("This requirement has expired.");
          return;
        }

        if (requirementData.status !== "open") {
          setLoadError("This requirement is closed.");
          return;
        }

        if (businessResult.status === "fulfilled") {
          setBusiness(businessResult.value.data);
        } else if (businessResult.reason?.status === 404) {
          setBusiness(null);
        } else {
          setLoadError(
            businessResult.reason?.message ||
              "Unable to check your business profile."
          );
          return;
        }

        if (walletResult.status === "fulfilled") {
          setWallet(walletResult.value.data.wallet);
          setWalletError("");
        } else {
          setWallet(null);
          setWalletError(
            walletResult.reason?.message || "Unable to load your wallet."
          );
        }

        setRequirement(requirementData);

        if (isEdit) {
          const quotationResponse = await getQuotationById(
            token,
            quotationId
          );
          const quotation = quotationResponse.data;

          if (!quotation.isSeller) {
            setLoadError("You can only edit your own quotation.");
            return;
          }

          if (quotation.status !== "pending") {
            setLoadError("Only pending quotations can be edited.");
            return;
          }

          setEditingQuotation(quotation);
          setForm({
            offerType: quotation.offerType,
            offeredQuantity: String(quotation.offeredQuantity),
            unitPrice: String(quotation.unitPrice),
            gstRate: String(quotation.gstRate || 0),
            pricingMode: quotation.pricingMode || "exclusive",
            deliveryDate: toDateInputValue(quotation.deliveryDate),
            message: quotation.message || "",
            termsAccepted: true
          });
        } else {
          setEditingQuotation(null);
          setForm({
            offerType: "full",
            offeredQuantity: String(requirementData.quantity),
            unitPrice: "",
            gstRate: "18",
            pricingMode: "exclusive",
            deliveryDate: toDateInputValue(requirementData.deliveryDate),
            message: "",
            termsAccepted: false
          });
        }
      } catch (error) {
        if (isActive) {
          setLoadError(error.message);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadScreen();

    return () => {
      isActive = false;
    };
  }, [token, requirementId, quotationId, isEdit, reloadKey]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshWallet = async () => {
        try {
          const response = await getWallet(token);

          if (isActive) {
            setWallet(response.data.wallet);
            setWalletError("");
          }
        } catch (error) {
          if (isActive) {
            setWallet(null);
            setWalletError(error.message);
          }
        }
      };

      refreshWallet();

      return () => {
        isActive = false;
      };
    }, [token])
  );

  const updateField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const selectedOfferMeta = getQuotationOfferTypeMeta(form.offerType);
  const requirementDeadline = requirement
    ? toDateInputValue(requirement.deliveryDate)
    : "";

  const handleOfferTypeChange = (label) => {
    const selectedOption = QUOTATION_OFFER_TYPES.find(
      (option) => option.label === label
    );

    if (!selectedOption || !requirement) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      offerType: selectedOption.value,
      offeredQuantity:
        selectedOption.value === "full"
          ? String(requirement.quantity)
          : currentForm.offerType === "full"
            ? ""
            : currentForm.offeredQuantity
    }));
  };

  const effectiveQuantity =
    form.offerType === "full"
      ? Number(requirement?.quantity)
      : Number(form.offeredQuantity);

  const numericUnitPrice = Number(form.unitPrice);

  const hasPricePreview =
    Number.isFinite(effectiveQuantity) &&
    effectiveQuantity > 0 &&
    Number.isFinite(numericUnitPrice) &&
    numericUnitPrice > 0;

  const taxPreview = hasPricePreview
    ? calculateTaxPreview({
        quantity: effectiveQuantity,
        unitPrice: numericUnitPrice,
        gstRate: form.gstRate,
        pricingMode: form.pricingMode,
        sellerState: business?.state || editingQuotation?.sellerState,
        buyerState:
          requirement?.business?.state || editingQuotation?.buyerState
      })
    : null;

  const selectedPricingMeta =
    GST_PRICING_MODES.find((mode) => mode.value === form.pricingMode) ||
    GST_PRICING_MODES[0];

  const emdRate = Number(requirement?.emdRate || 0);
  const emdAmount = taxPreview
    ? calculateEmdAmount(taxPreview.taxableValue, emdRate)
    : 0;
  const currentHeldEmd =
    isEdit && editingQuotation?.emdStatus === "held"
      ? Number(editingQuotation.emdAmount || 0)
      : 0;
  const availableForEmd = wallet
    ? Number(wallet.availableBalance || 0) + currentHeldEmd
    : null;
  const emdShortfall =
    availableForEmd === null ? 0 : Math.max(emdAmount - availableForEmd, 0);
  const sellerGstin = business?.gstin || editingQuotation?.sellerGstin || "";
  const needsGstin = Number(form.gstRate) > 0 && !sellerGstin;

  const handlePricingModeChange = (label) => {
    const selectedMode = GST_PRICING_MODES.find(
      (mode) => mode.label === label
    );

    if (selectedMode) {
      updateField("pricingMode", selectedMode.value);
    }
  };

  const validateForm = () => {
    if (!form.offerType) {
      return "Please choose an offer type.";
    }

    if (form.offerType !== "full") {
      const quantity = Number(form.offeredQuantity);

      if (
        !form.offeredQuantity.trim() ||
        Number.isNaN(quantity) ||
        quantity <= 0 ||
        quantity > 1000000
      ) {
        return "Offered quantity must be a number greater than zero.";
      }

      if (
        form.offerType === "partial" &&
        quantity >= Number(requirement.quantity)
      ) {
        return "A partial offer must be less than the requested quantity.";
      }

      if (
        form.offerType === "modified" &&
        quantity > Number(requirement.quantity)
      ) {
        return "A modified offer cannot exceed the requested quantity.";
      }
    }

    if (
      !form.unitPrice.trim() ||
      Number.isNaN(numericUnitPrice) ||
      numericUnitPrice <= 0 ||
      numericUnitPrice > 100000000
    ) {
      return "Unit price must be a valid amount greater than zero.";
    }

    if (!GST_RATES.includes(Number(form.gstRate))) {
      return "Please choose a valid GST rate.";
    }

    if (needsGstin) {
      return "Add your GSTIN in the business profile before quoting with GST.";
    }

    if (walletError) {
      return "Unable to check your EMD wallet balance. Please try again.";
    }

    if (emdShortfall > 0) {
      return `Add ${formatCurrency(
        emdShortfall
      )} to your wallet to cover this EMD.`;
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

    if (form.deliveryDate.trim() > requirementDeadline) {
      return "Delivery date cannot be later than the buyer's required date.";
    }

    if (form.message.trim().length > 1000) {
      return "Message cannot exceed 1000 characters.";
    }

    if (!isEdit && !form.termsAccepted) {
      return "Please accept the EMD and marketplace terms before quoting.";
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

    setIsSaving(true);

    const payload = {
      offerType: form.offerType,
      offeredQuantity:
        form.offerType === "full"
          ? Number(requirement.quantity)
          : Number(form.offeredQuantity),
      unitPrice: Number(form.unitPrice),
      gstRate: Number(form.gstRate),
      pricingMode: form.pricingMode,
      deliveryDate: `${form.deliveryDate.trim()}T12:00:00.000Z`,
      message: form.message.trim()
    };

    try {
      if (isEdit) {
        await updateQuotation(token, quotationId, payload);
        setIsSaving(false);
        navigation.goBack();
      } else {
        const response = await createQuotation(token, {
          ...payload,
          requirementId,
          termsAccepted: form.termsAccepted,
          termsVersion: TERMS_VERSION
        });

        setIsSaving(false);
        navigation.replace("QuotationDetail", {
          quotationId: response.data.id
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
          {isEdit ? "Loading quotation..." : "Preparing the quote form..."}
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

        <Text style={styles.stateTitle}>Cannot open this quotation</Text>
        <Text style={styles.stateDescription}>{loadError}</Text>

        <AppButton
          title="Try again"
          onPress={() => setReloadKey((current) => current + 1)}
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
          Buyers need to know which business is quoting them. Add your company
          details before sending this quotation.
        </Text>

        <AppButton
          title="Open business profile"
          onPress={() => navigation.navigate("BusinessProfile")}
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
            {isEdit ? "Update your quotation" : "Send a quotation"}
          </Text>
          <Text style={styles.formSubtitle}>
            Give the buyer a clear offer with quantity, price, and delivery
            terms.
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

          <View style={styles.requirementCard}>
            <Text style={styles.requirementLabel}>Quoting for</Text>
            <Text style={styles.requirementTitle}>
              {requirement.productName}
            </Text>
            <Text style={styles.requirementMeta}>
              {formatQuantity(requirement.quantity, requirement.unit)} •{" "}
              {requirement.deliveryLocation}
            </Text>
            <Text style={styles.requirementMeta}>
              Deliver by {formatDate(requirement.deliveryDate)}
            </Text>
            <Text style={styles.requirementBudget}>
              Buyer budget:{" "}
              {formatBudget(requirement.budgetMin, requirement.budgetMax)}
            </Text>
            <Text style={styles.requirementEmd}>
              Seller EMD: {requirement.emdRate || 2}% of taxable value
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Offer type *</Text>

          <ChoiceChips
            options={QUOTATION_OFFER_TYPES.map((option) => option.label)}
            selectedValues={[selectedOfferMeta.label]}
            onPress={handleOfferTypeChange}
          />
          <Text style={styles.offerHint}>
            {selectedOfferMeta.description}
          </Text>

          <Text style={styles.sectionTitle}>Quantity</Text>

          {form.offerType === "full" ? (
            <View style={styles.readOnlyCard}>
              <Text style={styles.readOnlyLabel}>Requested quantity</Text>
              <Text style={styles.readOnlyValue}>
                {formatQuantity(requirement.quantity, requirement.unit)}
              </Text>
              <Text style={styles.readOnlyHint}>
                A full offer always supplies the exact requested quantity.
              </Text>
            </View>
          ) : (
            <AppInput
              label={`Offered quantity (${requirement.unit}) *`}
              value={form.offeredQuantity}
              onChangeText={(value) => updateField("offeredQuantity", value)}
              placeholder={`Up to ${requirement.quantity}`}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              maxLength={10}
            />
          )}

          <Text style={styles.sectionTitle}>Price</Text>

          <AppInput
            label={`Unit price (₹ per ${requirement.unit}) *`}
            value={form.unitPrice}
            onChangeText={(value) => updateField("unitPrice", value)}
            placeholder="For example: 125.50"
            keyboardType="decimal-pad"
            autoCapitalize="none"
            maxLength={10}
          />

          <Text style={styles.sectionTitle}>GST</Text>
          <Text style={styles.fieldLabel}>How is GST quoted? *</Text>
          <ChoiceChips
            options={GST_PRICING_MODES.map((mode) => mode.label)}
            selectedValues={[selectedPricingMeta.label]}
            onPress={handlePricingModeChange}
          />
          <Text style={styles.gstHint}>{selectedPricingMeta.description}</Text>

          <Text style={styles.fieldLabel}>GST rate *</Text>
          <ChoiceChips
            options={GST_RATES.map(String)}
            selectedValues={[form.gstRate]}
            onPress={(value) => updateField("gstRate", value)}
            getOptionLabel={(value) => `${value}%`}
          />

          {needsGstin ? (
            <View style={styles.warningCard}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.error}
              />
              <View style={styles.warningTextBlock}>
                <Text style={styles.warningText}>
                  Add your GSTIN before charging GST on a quotation.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("BusinessProfile")}
                >
                  <Text style={styles.warningLink}>Open business profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {taxPreview ? (
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Entered price</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(taxPreview.enteredAmount)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Taxable value</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(taxPreview.taxableValue)}
                </Text>
              </View>

              {taxPreview.cgstAmount > 0 ? (
                <>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      CGST ({taxPreview.gstRate / 2}%)
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(taxPreview.cgstAmount)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      SGST ({taxPreview.gstRate / 2}%)
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(taxPreview.sgstAmount)}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    IGST ({taxPreview.gstRate}%)
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(taxPreview.igstAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.breakdownDivider} />

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Grand total</Text>
                <Text style={styles.breakdownTotalValue}>
                  {formatCurrency(taxPreview.grandTotal)}
                </Text>
              </View>

              <Text style={styles.breakdownHint}>
                {form.pricingMode === "inclusive"
                  ? "GST is included in the entered price."
                  : "GST is added on top of the entered price."}
              </Text>
            </View>
          ) : (
            <View style={styles.previewEmptyCard}>
              <Ionicons
                name="calculator-outline"
                size={20}
                color={colors.textMuted}
              />
              <Text style={styles.previewEmptyText}>
                Enter a quantity and unit price to preview GST and EMD.
              </Text>
            </View>
          )}

          <View style={styles.emdCard}>
            <View style={styles.emdHeader}>
              <View style={styles.emdIconCircle}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>
              <View style={styles.emdHeaderText}>
                <Text style={styles.emdTitle}>
                  EMD hold at {emdRate}%
                </Text>
                <Text style={styles.emdDescription}>
                  Calculated on taxable value, excluding GST.
                </Text>
              </View>
              <Text style={styles.emdAmount}>
                {taxPreview ? formatCurrency(emdAmount) : "—"}
              </Text>
            </View>

            <View style={styles.emdMetaRow}>
              <Text style={styles.emdMetaLabel}>Wallet available</Text>
              <Text style={styles.emdMetaValue}>
                {availableForEmd === null
                  ? "Unavailable"
                  : formatCurrency(availableForEmd)}
              </Text>
            </View>

            {currentHeldEmd > 0 ? (
              <View style={styles.emdMetaRow}>
                <Text style={styles.emdMetaLabel}>Already held on this quote</Text>
                <Text style={styles.emdMetaValue}>
                  {formatCurrency(currentHeldEmd)}
                </Text>
              </View>
            ) : null}

            {walletError ? (
              <Text style={styles.emdError}>{walletError}</Text>
            ) : emdShortfall > 0 ? (
              <Text style={styles.emdError}>
                Add {formatCurrency(emdShortfall)} to your wallet to cover this
                hold.
              </Text>
            ) : (
              <Text style={styles.emdSafe}>
                Your wallet can cover this EMD hold.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => navigation.navigate("Wallet")}
              style={styles.walletLinkRow}
            >
              <Ionicons
                name="wallet-outline"
                size={15}
                color={colors.primary}
              />
              <Text style={styles.walletLinkText}>Open EMD wallet</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Delivery</Text>

          <AppInput
            label="Delivery date *"
            value={form.deliveryDate}
            onChangeText={(value) => updateField("deliveryDate", value)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
          />
          <Text style={styles.dateHint}>
            Buyer needs delivery by {formatDate(requirement.deliveryDate)}.
            Use the YYYY-MM-DD format.
          </Text>

          <Text style={styles.sectionTitle}>Message</Text>

          <AppInput
            label="Message to the buyer"
            value={form.message}
            onChangeText={(value) => updateField("message", value)}
            placeholder="Share your production capacity, quality details, or terms (optional)"
            multiline
            maxLength={1000}
          />

          {!isEdit ? (
            <View style={styles.termsCard}>
              <TouchableOpacity
                style={styles.termsToggle}
                activeOpacity={0.8}
                onPress={() =>
                  updateField("termsAccepted", !form.termsAccepted)
                }
              >
                <View
                  style={[
                    styles.checkbox,
                    form.termsAccepted && styles.checkboxSelected
                  ]}
                >
                  {form.termsAccepted ? (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color={colors.white}
                    />
                  ) : null}
                </View>

                <Text style={styles.termsText}>
                  I accept the EMD, cancellation, GST, and marketplace terms
                  for this quotation.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate("ProcurementPolicy")}
                style={styles.policyLinkRow}
              >
                <Text style={styles.policyLink}>
                  Read the full policy (terms {TERMS_VERSION})
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.termsAcceptedCard}>
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={colors.success}
              />
              <Text style={styles.termsAcceptedText}>
                Terms {editingQuotation?.termsVersion || TERMS_VERSION} were
                accepted when this quotation was sent.
              </Text>
            </View>
          )}

          <AppButton
            title={
              isEdit
                ? "Save changes"
                : `Send quotation · hold ${formatCurrency(emdAmount)}`
            }
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
  requirementCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  requirementLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  requirementTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  requirementMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary
  },
  requirementBudget: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary,
    marginTop: spacing.xs
  },
  requirementEmd: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  offerHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  readOnlyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  readOnlyLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  readOnlyValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary
  },
  readOnlyHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  totalTextBlock: {
    flex: 1,
    marginRight: spacing.md
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D7E7E0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs
  },
  totalHint: {
    fontSize: 12,
    lineHeight: 18,
    color: "#D7E7E0"
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  gstHint: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md
  },
  warningTextBlock: {
    flex: 1,
    marginLeft: spacing.sm
  },
  warningText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.error
  },
  warningLink: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.error,
    marginTop: spacing.xs,
    textDecorationLine: "underline"
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary
  },
  breakdownTotalValue: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.primary
  },
  breakdownHint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  previewEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md
  },
  previewEmptyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginLeft: spacing.sm
  },
  emdCard: {
    backgroundColor: colors.mint,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  emdHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  emdIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  emdHeaderText: {
    flex: 1,
    marginRight: spacing.sm
  },
  emdTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary
  },
  emdDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.primary,
    marginTop: 1
  },
  emdAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primary
  },
  emdMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2
  },
  emdMetaLabel: {
    fontSize: 11,
    color: colors.primary
  },
  emdMetaValue: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary
  },
  emdError: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.error,
    marginTop: spacing.xs
  },
  emdSafe: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.success,
    marginTop: spacing.xs
  },
  walletLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#CFE4D9",
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    width: "100%"
  },
  walletLinkText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    marginLeft: spacing.xs
  },
  termsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  termsToggle: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary
  },
  policyLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing.sm
  },
  policyLink: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    marginRight: 2
  },
  termsAcceptedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  termsAcceptedText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginLeft: spacing.sm
  },
  dateHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md
  },
  cancelButton: {
    marginTop: spacing.sm
  }
});
