import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppButton from "../../components/common/AppButton";
import BusinessAvatar from "../../components/common/BusinessAvatar";
import StatusPill from "../../components/common/StatusPill";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { getMyBusiness } from "../../services/businessService";

const VERIFICATION_META = {
  unverified: {
    label: "Unverified",
    tone: "neutral",
    icon: "shield-outline",
    description:
      "Add your legal details and documents, then submit for verification."
  },
  pending: {
    label: "Under review",
    tone: "warning",
    icon: "time-outline",
    description:
      "Your documents are with the review team. You cannot change them until the review is complete."
  },
  verified: {
    label: "Verified",
    tone: "success",
    icon: "shield-checkmark-outline",
    description:
      "Your legal identity and business documents have been reviewed."
  },
  rejected: {
    label: "Action needed",
    tone: "danger",
    icon: "alert-circle-outline",
    description:
      "The review team could not verify your profile. Check the note and submit again."
  }
};

const getCompleteness = (business) => {
  const checks = [
    Boolean(business.logoUrl),
    Boolean(business.legalName),
    Boolean(business.website),
    Boolean(business.yearEstablished),
    Boolean(business.description),
    Boolean(business.panNumber),
    Boolean(business.registrationNumber),
    Boolean(business.gstin),
    (business.verificationDocuments || []).length > 0,
    (business.portfolio || []).length > 0
  ];
  const completed = checks.filter(Boolean).length;

  return {
    completed,
    total: checks.length,
    percentage: Math.round((completed / checks.length) * 100)
  };
};

const ACTION_ITEMS = [
  {
    key: "edit",
    title: "Business details",
    description: "Contact, legal identity, logo, and categories",
    icon: "create-outline",
    route: "BusinessEdit"
  },
  {
    key: "verification",
    title: "Verification",
    description: "PAN, GST, registration, and address proof",
    icon: "shield-checkmark-outline",
    route: "BusinessVerification"
  },
  {
    key: "portfolio",
    title: "Portfolio",
    description: "Show completed work to buyers and sellers",
    icon: "images-outline",
    route: "BusinessPortfolio"
  }
];

function DetailRow({ icon, label, value, isLast = false }) {
  if (!value) {
    return null;
  }

  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <Ionicons name={icon} size={18} color={colors.secondary} />
      <View style={styles.detailTextBlock}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BusinessProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [business, setBusiness] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading business profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.coral}
          />
        </View>
        <Text style={styles.stateTitle}>Could not load your profile</Text>
        <Text style={styles.stateDescription}>{error}</Text>
        <AppButton
          title="Try again"
          onPress={() => loadBusiness()}
          style={styles.stateButton}
        />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.centeredState}>
        <StatusBar style="dark" />
        <View style={styles.emptyIconCircle}>
          <Ionicons name="business-outline" size={30} color={colors.primary} />
        </View>
        <Text style={styles.stateTitle}>Create your business profile</Text>
        <Text style={styles.stateDescription}>
          Add your company details once. The same profile is used whenever you
          buy or sell on SupplyBridge.
        </Text>
        <AppButton
          title="Create business profile"
          onPress={() => navigation.navigate("BusinessEdit")}
          style={styles.stateButton}
        />
      </View>
    );
  }

  const verification =
    VERIFICATION_META[business.verificationStatus] ||
    VERIFICATION_META.unverified;
  const completeness = getCompleteness(business);

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
          <BusinessAvatar business={business} size={76} />

          <Text style={styles.companyName}>{business.companyName}</Text>
          {business.legalName && business.legalName !== business.companyName ? (
            <Text style={styles.legalName}>{business.legalName}</Text>
          ) : null}
          <Text style={styles.businessType}>
            {business.businessType}
            {business.city ? ` - ${business.city}` : ""}
            {business.state ? `, ${business.state}` : ""}
          </Text>

          <StatusPill
            label={verification.label}
            icon={verification.icon}
            tone={verification.tone}
          />

          <View style={styles.completenessBlock}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessLabel}>Profile strength</Text>
              <Text style={styles.completenessValue}>
                {completeness.percentage}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completeness.percentage}%` }
                ]}
              />
            </View>
            <Text style={styles.completenessHint}>
              {completeness.completed} of {completeness.total} profile signals
              completed
            </Text>
          </View>
        </View>

        <View style={styles.verificationCard}>
          <View style={styles.verificationHeader}>
            <View style={styles.verificationIcon}>
              <Ionicons
                name={verification.icon}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.verificationTextBlock}>
              <Text style={styles.verificationTitle}>
                {business.verificationStatus === "verified"
                  ? "Business verified"
                  : business.verificationStatus === "pending"
                    ? "Verification under review"
                    : business.verificationStatus === "rejected"
                      ? "Verification needs attention"
                      : "Build buyer confidence"}
              </Text>
              <Text style={styles.verificationDescription}>
                {business.verificationNote || verification.description}
              </Text>
            </View>
          </View>
          <AppButton
            title={
              business.verificationStatus === "verified"
                ? "View verification"
                : business.verificationStatus === "pending"
                  ? "View submitted documents"
                  : "Manage verification"
            }
            onPress={() => navigation.navigate("BusinessVerification")}
            variant="secondary"
            style={styles.verificationButton}
          />
        </View>

        <View style={styles.actionGrid}>
          {ACTION_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.actionCard}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.actionTextBlock}>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDescription}>{item.description}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Public profile preview</Text>
          <Text style={styles.bodyText}>
            Buyers and sellers see your company name, logo, city, categories,
            portfolio, and verification badge. Contact details are shown only
            if you allow them.
          </Text>
          <AppButton
            title="View public profile"
            onPress={() =>
              navigation.navigate("PublicBusinessProfile", {
                businessId: String(business.id)
              })
            }
            variant="secondary"
            style={styles.cardButton}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact details</Text>
          <DetailRow
            icon="person-outline"
            label="Contact person"
            value={business.contactPerson}
          />
          <DetailRow
            icon="call-outline"
            label="Phone"
            value={business.phone}
          />
          <DetailRow
            icon="mail-outline"
            label="Email"
            value={business.email}
          />
          <DetailRow
            icon="globe-outline"
            label="Website"
            value={business.website}
          />
          <DetailRow
            icon="location-outline"
            label="Address"
            value={`${business.address}, ${business.city}, ${business.state} - ${business.pincode}`}
            isLast
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal and tax</Text>
          <DetailRow
            icon="document-text-outline"
            label="Legal name"
            value={business.legalName}
          />
          <DetailRow
            icon="card-outline"
            label="PAN"
            value={business.panNumber}
          />
          <DetailRow
            icon="receipt-outline"
            label="GSTIN"
            value={business.gstin}
          />
          <DetailRow
            icon="ribbon-outline"
            label="Registration number"
            value={business.registrationNumber}
          />
          <DetailRow
            icon="calendar-outline"
            label="Year established"
            value={business.yearEstablished}
          />
          <Text style={styles.lastUpdated}>
            Contact details {business.showContactOnProfile === false
              ? "hidden"
              : "shown"}{" "}
            on your public profile
          </Text>
        </View>

        {business.categories.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Product categories</Text>
            <View style={styles.chipRow}>
              {business.categories.map((category) => (
                <View key={category} style={styles.chip}>
                  <Text style={styles.chipText}>{category}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.portfolioHeader}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <Text style={styles.portfolioCount}>
              {(business.portfolio || []).length}/6
            </Text>
          </View>
          <Text style={styles.bodyText}>
            {business.portfolio?.length
              ? "Your completed projects appear on the public profile."
              : "Add photos of completed projects to make your profile more credible."}
          </Text>
          <AppButton
            title={
              business.portfolio?.length
                ? "Manage portfolio"
                : "Add portfolio work"
            }
            onPress={() => navigation.navigate("BusinessPortfolio")}
            variant="secondary"
            style={styles.cardButton}
          />
        </View>
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
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
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
  stateButton: {
    width: "100%"
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md
  },
  companyName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
    marginTop: spacing.md
  },
  legalName: {
    fontSize: 12,
    color: "#C8DED6",
    marginTop: 2,
    textAlign: "center"
  },
  businessType: {
    fontSize: 12,
    color: "#D7E7E0",
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: "center"
  },
  completenessBlock: {
    width: "100%",
    marginTop: spacing.lg
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  completenessLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C8DED6",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  completenessValue: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white
  },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: "#2D6B5C",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.mint
  },
  completenessHint: {
    fontSize: 10,
    color: "#C8DED6",
    marginTop: spacing.xs
  },
  verificationCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  verificationIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  verificationTextBlock: {
    flex: 1
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary
  },
  verificationDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2
  },
  verificationButton: {
    marginTop: spacing.sm
  },
  actionGrid: {
    marginBottom: spacing.sm
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  actionTextBlock: {
    flex: 1
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary
  },
  actionDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 1
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
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary
  },
  cardButton: {
    marginTop: spacing.sm
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0
  },
  detailTextBlock: {
    flex: 1,
    marginLeft: spacing.sm
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary
  },
  lastUpdated: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary
  },
  portfolioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  portfolioCount: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: spacing.sm
  }
});
