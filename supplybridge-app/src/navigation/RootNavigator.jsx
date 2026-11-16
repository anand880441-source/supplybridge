import {
  DefaultTheme,
  NavigationContainer
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { NotificationsProvider } from "../context/NotificationsContext";
import { UnreadMessagesProvider } from "../context/UnreadMessagesContext";
import BusinessEditScreen from "../screens/business/BusinessEditScreen";
import BusinessPortfolioScreen from "../screens/business/BusinessPortfolioScreen";
import BusinessProfileScreen from "../screens/business/BusinessProfileScreen";
import BusinessVerificationScreen from "../screens/business/BusinessVerificationScreen";
import PublicBusinessProfileScreen from "../screens/business/PublicBusinessProfileScreen";
import ConversationScreen from "../screens/messages/ConversationScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import OrderDetailScreen from "../screens/orders/OrderDetailScreen";
import QuotationDetailScreen from "../screens/quotations/QuotationDetailScreen";
import QuotationFormScreen from "../screens/quotations/QuotationFormScreen";
import RequirementQuotesScreen from "../screens/quotations/RequirementQuotesScreen";
import ProcurementPolicyScreen from "../screens/procurement/ProcurementPolicyScreen";
import RequirementDetailScreen from "../screens/requirements/RequirementDetailScreen";
import RequirementFormScreen from "../screens/requirements/RequirementFormScreen";
import RequirementRepostScreen from "../screens/requirements/RequirementRepostScreen";
import WalletScreen from "../screens/wallet/WalletScreen";
import AuthNavigator from "./AuthNavigator";
import BuyerNavigator from "./BuyerNavigator";
import SellerNavigator from "./SellerNavigator";

const RootStack = createNativeStackNavigator();

const sharedHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: "700" }
};

const appNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.white,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.coral
  }
};

// Shared screens (business, requirements, quotations, and conversations) sit
// above the role tabs, so both buyers and sellers can open them from any tab.
function AuthenticatedNavigator({ role }) {
  const RoleNavigator =
    role === "seller" ? SellerNavigator : BuyerNavigator;

  return (
    <RootStack.Navigator key={role} screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={RoleNavigator} />

      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Notifications"
        }}
      />

      <RootStack.Screen
        name="BusinessProfile"
        component={BusinessProfileScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Business profile"
        }}
      />

      <RootStack.Screen
        name="BusinessEdit"
        component={BusinessEditScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Edit business"
        }}
      />

      <RootStack.Screen
        name="BusinessVerification"
        component={BusinessVerificationScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Verification"
        }}
      />

      <RootStack.Screen
        name="BusinessPortfolio"
        component={BusinessPortfolioScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Portfolio"
        }}
      />

      <RootStack.Screen
        name="PublicBusinessProfile"
        component={PublicBusinessProfileScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Business profile"
        }}
      />

      <RootStack.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Wallet"
        }}
      />

      <RootStack.Screen
        name="ProcurementPolicy"
        component={ProcurementPolicyScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Procurement policy"
        }}
      />

      <RootStack.Screen
        name="RequirementForm"
        component={RequirementFormScreen}
        options={({ route }) => ({
          ...sharedHeaderOptions,
          headerTitle: route.params?.requirementId
            ? "Edit requirement"
            : "Post requirement"
        })}
      />

      <RootStack.Screen
        name="RequirementDetail"
        component={RequirementDetailScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Requirement details"
        }}
      />

      <RootStack.Screen
        name="RequirementRepost"
        component={RequirementRepostScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Repost requirement"
        }}
      />

      <RootStack.Screen
        name="RequirementQuotes"
        component={RequirementQuotesScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Compare quotations"
        }}
      />

      <RootStack.Screen
        name="QuotationForm"
        component={QuotationFormScreen}
        options={({ route }) => ({
          ...sharedHeaderOptions,
          headerTitle: route.params?.quotationId
            ? "Edit quotation"
            : "Send quotation"
        })}
      />

      <RootStack.Screen
        name="QuotationDetail"
        component={QuotationDetailScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Quotation details"
        }}
      />

      <RootStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Order details"
        }}
      />

      <RootStack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{
          ...sharedHeaderOptions,
          headerTitle: "Conversation"
        }}
      />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.brandName}>SupplyBridge</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Restoring your session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={appNavigationTheme}>
      {!user ? (
        <AuthNavigator />
      ) : (
        <UnreadMessagesProvider>
          <NotificationsProvider>
            <AuthenticatedNavigator role={user.activeRole} />
          </NotificationsProvider>
        </UnreadMessagesProvider>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.lg
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.md
  }
});
