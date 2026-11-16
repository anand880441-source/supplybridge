import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors } from "../constants/theme";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ProcurementPolicyScreen from "../screens/procurement/ProcurementPolicyScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="ProcurementPolicy"
        component={ProcurementPolicyScreen}
        options={{
          headerShown: true,
          headerTitle: "Terms and policy",
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: "700" }
        }}
      />
    </Stack.Navigator>
  );
}
