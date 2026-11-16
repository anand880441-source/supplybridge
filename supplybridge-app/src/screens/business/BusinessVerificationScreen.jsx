import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import StatusPill from "../../components/common/StatusPill";
import { formatDate } from "../../utils/formatters";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  deleteVerificationDocument,
  getMyBusiness,
  submitBusinessVerification,
  uploadVerificationDocument
} from "../../services/businessService";

const DOCUMENT_TYPES = [
  {
    value: "pan",
    label: "PAN card",
    description: "Company or proprietor PAN",
    icon: "card-outline"
  },
  {
    value: "gst",
    label: "GST certificate",
    description: "Required because a GSTIN is added",
    icon: "receipt-outline"
  },
  {
    value: "registration",
    label: "Registration proof",
    description: "Incorporation, shop, or firm registration",
    icon: "ribbon-outline"
  },
  {
    value: "address",
    label: "Address proof",
    description: "Utility bill, rent agreement, or address document",
    icon: "location-outline"
  }
];

const STATUS_META = {
  unverified: {
    label: "Not submitted",
    tone: "neutral",
    title: "Get your business verified",
    description:
      "Upload your legal documents once. Verified profiles carry a badge that other businesses can trust."
  },
  pending: {
    label: "Under review",
    tone: "warning",
    title: "Verification is under review",
    description:
      "The review team is checking your documents. Locked documents cannot be changed until the review is complete."
  },
  verified: {
    label: "Verified",
    tone: "success",
    title: "Your business is verified",
    description:
      "Your legal identity and documents were accepted. Changing a document will require a fresh review."
  },
  rejected: {
    label: "Action needed",
    tone: "danger",
    title: "Verification was not approved",
    description:
      "Review the note below, correct the details or documents, and submit again."
  }
};

export default function BusinessVerificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [business, setBusiness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");

  const loadBusiness = async ({ refresh = false } = {}) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setError("");

    try {
      const response = await getMyBusiness(token);
      setBusiness(response.data);
    } catch (loadError) {
      if (loadError.status === 404) {
        setBusiness(null);
      } else {
        setError(loadError.message);
      }
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

  const isLocked = business?.verificationStatus === "pending";
  const isVerified = business?.verificationStatus === "verified";
  const currentStatus =
    STATUS_META[business?.verificationStatus] || STATUS_META.unverified;
  const documents = business?.verificationDocuments || [];

  const pickDocument = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: Platform.OS !== "android",
        multiple: false
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (asset.size && asset.size > 8 * 1024 * 1024) {
        Alert.alert(
          "File too large",
          "Verification documents must be 8 MB or smaller."
        );
        return;
      }

      setActiveAction(type);

      try {
        const response = await uploadVerificationDocument(
          token,
          business.id,
          type,
          asset
        );
        setBusiness(response.data);
      } finally {
        setActiveAction("");
      }
    } catch (pickError) {
      Alert.alert("Could not upload document", pickError.message);
    }
  };

  const handleSubmit = async () => {
    setActiveAction("submit");

    try {
      const response = await submitBusinessVerification(token, business.id);
      setBusiness(response.data);
      Alert.alert(
        "Submitted for review",
        "The verification team will review your documents. You will see the status on this screen."
      );
    } catch (submitError) {
      Alert.alert("Could not submit verification", submitError.message);
    } finally {
      setActiveAction("");
    }
  };

  const confirmDelete = (document) => {
    const typeMeta = DOCUMENT_TYPES.find(
      (item) => item.value === document.type
    );

    Alert.alert(
      "Remove document",
      `Remove the ${typeMeta?.label || document.type} document?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActiveAction(document.id);

            try {
              const response = await deleteVerificationDocument(
                token,
                business.id,
                document.id
              );
              setBusiness(response.data);
            } catch (deleteError) {
              Alert.alert(
                "Could not remove document",
                deleteError.message
              );
            } finally {
              setActiveAction("");
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
        <Text style={styles.loadingText}>Loading verification...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <Text style={styles.stateTitle}>Could not load verification</Text>
        <Text style={styles.stateDescription}>{error}</Text>
        <AppButton title="Try again" onPress={() => loadBusiness()} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <Text style={styles.stateTitle}>Create a business profile first</Text>
        <Text style={styles.stateDescription}>
          Verification uses the legal details and documents attached to your
          business profile.
        </Text>
        <AppButton
          title="Open business profile"
          onPress={() => navigation.navigate("BusinessProfile")}
        />
      </View>
    );
  }

  const requiredTypes = ["pan", "registration", "address"];

  if (business.gstin) {
    requiredTypes.push("gst");
  }

  const uploadedTypes = new Set(documents.map((document) => document.type));
  const missingTypes = requiredTypes.filter(
    (type) => !uploadedTypes.has(type)
  );
  const canSubmit =
    !isLocked &&
    !isVerified &&
    missingTypes.length === 0 &&
    Boolean(business.legalName && business.panNumber) &&
    Boolean(business.registrationNumber);

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
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={28}
              color={colors.primary}
            />
          </View>
          <StatusPill
            label={currentStatus.label}
            tone={currentStatus.tone}
            icon="shield-outline"
          />
          <Text style={styles.heroTitle}>{currentStatus.title}</Text>
          <Text style={styles.heroDescription}>
            {currentStatus.description}
          </Text>

          {business.verificationStatus === "rejected" &&
          business.verificationNote ? (
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>Review note</Text>
              <Text style={styles.noteText}>{business.verificationNote}</Text>
            </View>
          ) : null}

          {business.verificationRequestedAt ? (
            <Text style={styles.requestedAt}>
              Submitted {formatDate(business.verificationRequestedAt)}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal details</Text>
          <View style={styles.legalRow}>
            <Text style={styles.legalLabel}>Legal name</Text>
            <Text style={styles.legalValue}>
              {business.legalName || "Not added"}
            </Text>
          </View>
          <View style={styles.legalRow}>
            <Text style={styles.legalLabel}>PAN</Text>
            <Text style={styles.legalValue}>
              {business.panNumber || "Not added"}
            </Text>
          </View>
          <View style={styles.legalRow}>
            <Text style={styles.legalLabel}>GSTIN</Text>
            <Text style={styles.legalValue}>
              {business.gstin || "Not registered"}
            </Text>
          </View>
          <View style={[styles.legalRow, styles.legalRowLast]}>
            <Text style={styles.legalLabel}>Registration number</Text>
            <Text style={styles.legalValue}>
              {business.registrationNumber || "Not added"}
            </Text>
          </View>

          <AppButton
            title="Edit legal details"
            onPress={() => navigation.navigate("BusinessEdit")}
            variant="secondary"
            style={styles.cardButton}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verification documents</Text>
          <Text style={styles.cardDescription}>
            PDF, JPG, PNG, or WebP up to 8 MB. Documents are private and only
            visible to you and the review team.
          </Text>

          {DOCUMENT_TYPES.map((typeMeta) => {
            const document = documents.find(
              (item) => item.type === typeMeta.value
            );
            const isRequired = requiredTypes.includes(typeMeta.value);
            const isUploading = activeAction === typeMeta.value;
            const isDeleting = activeAction === document?.id;
            const isOptionalMissing =
              typeMeta.value === "gst" && !business.gstin;

            return (
              <View key={typeMeta.value} style={styles.documentRow}>
                <View
                  style={[
                    styles.documentIcon,
                    document && styles.documentIconComplete
                  ]}
                >
                  <Ionicons
                    name={
                      document ? "checkmark-circle" : typeMeta.icon
                    }
                    size={20}
                    color={document ? colors.success : colors.secondary}
                  />
                </View>

                <View style={styles.documentTextBlock}>
                  <View style={styles.documentTitleRow}>
                    <Text style={styles.documentTitle}>{typeMeta.label}</Text>
                    {isRequired ? (
                      <Text style={styles.requiredLabel}>Required</Text>
                    ) : null}
                  </View>

                  {document ? (
                    <Text style={styles.documentMeta} numberOfLines={1}>
                      {document.originalName || "Uploaded document"} -{" "}
                      {Math.max(1, Math.round(document.size / 1024))} KB
                    </Text>
                  ) : (
                    <Text style={styles.documentMeta}>
                      {isOptionalMissing
                        ? "Optional while no GSTIN is added"
                        : typeMeta.description}
                    </Text>
                  )}
                </View>

                {document ? (
                  <TouchableOpacity
                    onPress={() => confirmDelete(document)}
                    disabled={isLocked || isDeleting}
                    hitSlop={8}
                    style={styles.documentAction}
                  >
                    {isDeleting ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.error}
                      />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={
                          isLocked ? colors.disabled : colors.error
                        }
                      />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => pickDocument(typeMeta.value)}
                    disabled={isLocked || isUploading || isOptionalMissing}
                    hitSlop={8}
                    style={styles.documentAction}
                  >
                    {isUploading ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                      />
                    ) : (
                      <Ionicons
                        name="cloud-upload-outline"
                        size={20}
                        color={
                          isLocked || isOptionalMissing
                            ? colors.disabled
                            : colors.primary
                        }
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {!business.legalName ||
        !business.panNumber ||
        !business.registrationNumber ? (
          <View style={styles.warningCard}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              Add the legal name, PAN, and registration number before
              submitting for review.
            </Text>
          </View>
        ) : null}

        {missingTypes.length > 0 && !isLocked ? (
          <View style={styles.infoCard}>
            <Ionicons
              name="documents-outline"
              size={18}
              color={colors.secondary}
            />
            <Text style={styles.infoText}>
              Still needed:{" "}
              {DOCUMENT_TYPES.filter((typeMeta) =>
                missingTypes.includes(typeMeta.value)
              )
                .map((typeMeta) => typeMeta.label)
                .join(", ")}
            </Text>
          </View>
        ) : null}

        {!isLocked && !isVerified ? (
          <AppButton
            title="Submit for verification"
            onPress={handleSubmit}
            loading={activeAction === "submit"}
            disabled={!canSubmit || Boolean(activeAction)}
          />
        ) : null}

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ProcurementPolicy", {
              sectionId: "business-verification"
            })
          }
          style={styles.termsLink}
        >
          <Text style={styles.termsLinkText}>
            Read the business verification terms
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  },
  heroDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary
  },
  noteCard: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm
  },
  noteLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.error,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  noteText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.error,
    marginTop: 2
  },
  requestedAt: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  card: {
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
  cardDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  legalRowLast: {
    borderBottomWidth: 0
  },
  legalLabel: {
    fontSize: 12,
    color: colors.textSecondary
  },
  legalValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "right",
    marginLeft: spacing.md
  },
  cardButton: {
    marginTop: spacing.sm
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  documentIconComplete: {
    backgroundColor: colors.successSoft
  },
  documentTextBlock: {
    flex: 1
  },
  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary
  },
  requiredLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: spacing.xs
  },
  documentMeta: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 1
  },
  documentAction: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.warning,
    marginLeft: spacing.sm
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: colors.primary,
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
