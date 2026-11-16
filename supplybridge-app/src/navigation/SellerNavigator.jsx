import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../constants/theme";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import ConversationsScreen from "../screens/messages/ConversationsScreen";
import OrdersScreen from "../screens/orders/OrdersScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import MyQuotesScreen from "../screens/quotations/MyQuotesScreen";
import FindNeedsScreen from "../screens/seller/FindNeedsScreen";
import SellerHomeScreen from "../screens/seller/SellerHomeScreen";

const Tab = createBottomTabNavigator();

const MESSAGES_BADGE_STYLE = {
  backgroundColor: colors.coral,
  color: colors.white,
  fontSize: 10,
  fontWeight: "800",
  minWidth: 18,
  height: 18,
  lineHeight: 18
};

const TAB_ICONS = {
  Home: { active: "home", inactive: "home-outline" },
  "Find Needs": { active: "search", inactive: "search-outline" },
  "My Quotes": {
    active: "document-text",
    inactive: "document-text-outline"
  },
  Orders: { active: "cube", inactive: "cube-outline" },
  Messages: { active: "chatbubbles", inactive: "chatbubbles-outline" },
  Profile: { active: "person", inactive: "person-outline" }
};

export default function SellerNavigator() {
  const { unreadTotal } = useUnreadMessages();
  const messagesBadge =
    unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : String(unreadTotal)) : undefined;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];

          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        }
      })}
    >
      <Tab.Screen name="Home" component={SellerHomeScreen} />

      <Tab.Screen name="Find Needs" component={FindNeedsScreen} />

      <Tab.Screen name="My Quotes" component={MyQuotesScreen} />

      <Tab.Screen name="Orders" component={OrdersScreen} />

      <Tab.Screen
        name="Messages"
        component={ConversationsScreen}
        options={{
          tabBarBadge: messagesBadge,
          tabBarBadgeStyle: MESSAGES_BADGE_STYLE
        }}
      />

      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
