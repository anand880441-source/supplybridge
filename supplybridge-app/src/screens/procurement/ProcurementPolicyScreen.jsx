import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SkeletonBlock from "../../components/common/SkeletonBlock";
import { colors, radius, shadows, spacing } from "../../constants/theme";
import { getProcurementPolicy } from "../../services/procurementService";

const CANCELLATION_OUTCOMES = [
  {
    actor: "Buyer cancels",
    outcome: "EMD is released back to the seller.",
    icon: "return-up-back-outline",
    tone: colors.secondary
  },
  {
    actor: "Order is delivered",
    outcome: "EMD is released back to the seller.",
    icon: "checkmark-circle-outline",
    tone: colors.success
  },
  {
    actor: "Seller cancels",
    outcome: "EMD is forfeited and credited to the buyer's wallet.",
    icon: "alert-circle-outline",
    tone: colors.error
  }
];

const GST_POINTS = [
  "GST can be quoted at 0%, 5%, 12%, 18%, or 28%, with the amount either included in or added to the price.",
  "CGST and SGST are recorded when the buyer's delivery state matches the seller's state. IGST is recorded otherwise.",
  "Seller GSTIN is required for taxable quotations. Tax amounts are records only; the seller must issue a valid tax invoice."
];

function TermsSection({ section, isHighlighted, onLayout }) {
  return (
    <View
      onLayout={onLayout}
      style={[styles.termCard, isHighlighted && styles.termCardHighlighted]}
    >
      <View style={styles.termHeader}>
        <View style={styles.termNumber}>
          <Text style={styles.termNumberText}>{section.number}</Text>
        </View>
        <View style={styles.termHeaderText}>
          <Text style={styles.termTitle}>{section.title}</Text>
          <Text style={styles.termSummary}>{section.summary}</Text>
        </View>
        <Ionicons
          name={section.icon || "document-text-outline"}
          size={19}
          color={colors.secondary}
        />
      </View>

      <View style={styles.bulletList}>
        {(section.bullets || []).map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProcurementPolicyScreen({ route }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const sectionPositions = useRef({});
  const pendingSectionRef = useRef(route.params?.sectionId || "");
  const hasAutoScrolledRef = useRef(false);

  const [policy, setPolicy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(
    route.params?.sectionId || ""
  );

  const loadPolicy = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const response = await getProcurementPolicy();
      setPolicy(response.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const scrollToSection = useCallback((sectionId) => {
    setActiveSectionId(sectionId);
    pendingSectionRef.current = sectionId;

    const position = sectionPositions.current[sectionId];

    if (position !== undefined) {
      scrollRef.current?.scrollTo({
        y: Math.max(position - 12, 0),
        animated: true
      });
      pendingSectionRef.current = "";
      hasAutoScrolledRef.current = true;
    }
  }, []);

  useEffect(() => {
    const sectionId = route.params?.sectionId;

    if (sectionId && policy) {
      hasAutoScrolledRef.current = false;
      scrollToSection(sectionId);
    }
  }, [policy, route.params?.sectionId, scrollToSection]);

  const handleSectionLayout = (sectionId, event) => {
    sectionPositions.current[sectionId] = event.nativeEvent.layout.y;

    if (
      pendingSectionRef.current === sectionId &&
      !hasAutoScrolledRef.current
    ) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(event.nativeEvent.layout.y - 12, 0),
          animated: true
        });
        pendingSectionRef.current = "";
        hasAutoScrolledRef.current = true;
      });
    }
  };

  if (isLoading && !policy) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <SkeletonBlock height={150} borderRadius={radius.xl} />
        <SkeletonBlock height={80} borderRadius={radius.xl} style={styles.skeletonGap} />
        <SkeletonBlock height={300} borderRadius={radius.xl} style={styles.skeletonGap} />
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.loadingSpinner}
        />
      </View>
    );
  }

  const sections = policy?.termsSections || [];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPolicy({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={colors.mint}
              />
            </View>
            {policy ? (
              <View style={styles.versionChip}>
                <Text style={styles.versionText}>{policy.termsVersion}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.heroTitle}>Terms for buying and selling</Text>
          <Text style={styles.heroDescription}>
            These rules cover accounts, business verification, requirements,
            quotations, EMD, orders, shipment, delivery, cancellations, tax,
            disputes, and privacy.
          </Text>

          {policy ? (
            <View style={styles.heroMetaRow}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color="#D7E7E0"
              />
              <Text style={styles.heroMeta}>
                Effective {policy.termsEffectiveDate || "15 Nov 2026"} ·{" "}
                {sections.length || 16} sections
              </Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {sections.length > 0 ? (
          <View style={styles.tocCard}>
            <Text style={styles.sectionEyebrow}>ON THIS PAGE</Text>
            <Text style={styles.sectionTitle}>Jump to a section</Text>

            <View style={styles.tocGrid}>
              {sections.map((section) => (
                <Pressable
                  key={section.id}
                  onPress={() => scrollToSection(section.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to ${section.title}`}
                  style={({ pressed }) => [
                    styles.tocItem,
                    activeSectionId === section.id && styles.tocItemActive,
                    pressed && styles.pressed
                  ]}
                >
                  <Text
                    style={[
                      styles.tocNumber,
                      activeSectionId === section.id &&
                        styles.tocNumberActive
                    ]}
                  >
                    {String(section.number).padStart(2, "0")}
                  </Text>
                  <Text
                    style={[
                      styles.tocLabel,
                      activeSectionId === section.id && styles.tocLabelActive
                    ]}
                    numberOfLines={2}
                  >
                    {section.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>SECURITY DEPOSIT</Text>
          <Text style={styles.sectionTitle}>
            EMD of {policy?.emdRateMin ?? 2}%–{policy?.emdRateMax ?? 5}%
          </Text>
          <Text style={styles.bodyText}>
            Sellers choose an EMD rate when quoting. The amount is calculated
            on the taxable value, not on GST, and must be available in the
            seller's sandbox wallet.
          </Text>

          <View style={styles.rateRow}>
            {(policy?.emdRates || [2, 3, 4, 5]).map((rate) => (
              <View key={rate} style={styles.rateChip}>
                <Text style={styles.rateChipText}>{rate}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.subsectionTitle}>When money moves</Text>
          <Text style={styles.bodyText}>
            Sending a quotation places the EMD on hold. Buyer acceptance
            captures it with the order. Rejection, withdrawal, expiry, or a
            non-selected quotation releases it. Delivery or buyer cancellation
            releases it; seller cancellation forfeits it to the buyer.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>CANCELLATIONS</Text>
          <Text style={styles.sectionTitle}>EMD outcomes</Text>

          {CANCELLATION_OUTCOMES.map((item, index) => (
            <View
              key={item.actor}
              style={[
                styles.outcomeRow,
                index === CANCELLATION_OUTCOMES.length - 1 &&
                  styles.outcomeRowLast
              ]}
            >
              <View style={styles.outcomeIcon}>
                <Ionicons name={item.icon} size={18} color={item.tone} />
              </View>
              <View style={styles.outcomeTextBlock}>
                <Text style={styles.outcomeTitle}>{item.actor}</Text>
                <Text style={styles.outcomeDescription}>{item.outcome}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>TAX</Text>
          <Text style={styles.sectionTitle}>GST is recorded, not filed</Text>

          {GST_POINTS.map((point) => (
            <View key={point} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.fullTermsHeading}>
          <Text style={styles.fullTermsEyebrow}>FULL AGREEMENT</Text>
          <Text style={styles.fullTermsTitle}>The complete terms</Text>
          <Text style={styles.fullTermsSubtitle}>
            Review each section before accepting a quotation or creating an
            account.
          </Text>
        </View>

        {sections.map((section) => (
          <TermsSection
            key={section.id}
            section={section}
            isHighlighted={activeSectionId === section.id}
            onLayout={(event) =>
              handleSectionLayout(section.id, event)
            }
          />
        ))}

        <View style={styles.scopeCard}>
          <Text style={styles.scopeTitle}>Current platform scope</Text>
          <Text style={styles.scopeText}>
            Wallet top-ups are simulated and no real payment is collected.
            SupplyBridge does not operate courier services, issue tax invoices,
            or provide legal advice. Disputes are reviewed using order records,
            shipment details, delivery confirmation, and messages.
          </Text>
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
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg
  },
  skeletonGap: {
    marginTop: spacing.md
  },
  loadingSpinner: {
    marginTop: spacing.lg
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.floating
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "#2D6B5C",
    alignItems: "center",
    justifyContent: "center"
  },
  heroTitle: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.white,
    marginBottom: spacing.xs
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: "#D7E7E0"
  },
  versionChip: {
    backgroundColor: "#2D6B5C",
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  versionText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.mint,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md
  },
  heroMeta: {
    fontSize: 11,
    color: "#D7E7E0",
    marginLeft: spacing.xs
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card
  },
  tocCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary
  },
  tocGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginTop: spacing.xs
  },
  tocItem: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: spacing.sm
  },
  tocItemActive: {
    opacity: 1
  },
  tocNumber: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: 2
  },
  tocNumberActive: {
    color: colors.coral
  },
  tocLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.textPrimary
  },
  tocLabelActive: {
    color: colors.primary
  },
  rateRow: {
    flexDirection: "row",
    marginTop: spacing.md
  },
  rateChip: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm
  },
  rateChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md
  },
  outcomeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider
  },
  outcomeRowLast: {
    borderBottomWidth: 0
  },
  outcomeIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  outcomeTextBlock: {
    flex: 1
  },
  outcomeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textPrimary
  },
  outcomeDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 1
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
    marginTop: 6,
    marginRight: spacing.sm
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary
  },
  fullTermsHeading: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs
  },
  fullTermsEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs
  },
  fullTermsTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  fullTermsSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary
  },
  termCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  termCardHighlighted: {
    borderColor: colors.secondary,
    borderWidth: 2
  },
  termHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm
  },
  termNumber: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  termNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary
  },
  termHeaderText: {
    flex: 1,
    marginRight: spacing.sm
  },
  termTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 2
  },
  termSummary: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary
  },
  bulletList: {
    marginTop: spacing.xs
  },
  scopeCard: {
    backgroundColor: colors.mint,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  scopeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.xs
  },
  scopeText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.primary
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
  pressed: {
    opacity: 0.8
  }
});
