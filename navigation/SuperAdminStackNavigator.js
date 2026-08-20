import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../constants/theme';

// Screens
import SuperAdminHomeScreen from '../screens/super-admin/SuperAdminHomeScreen';
import PlatformUsersScreen from '../screens/super-admin/PlatformUsersScreen';
import ManageHospitalsScreen from '../screens/super-admin/ManageHospitalsScreen';
import SuperAdminEmergencyControlScreen from '../screens/super-admin/SuperAdminEmergencyControlScreen';
import SuperAdminAmbulancesScreen from '../screens/super-admin/SuperAdminAmbulancesScreen';
import PlatformAnalyticsScreen from '../screens/super-admin/PlatformAnalyticsScreen';
import GlobalSettingsScreen from '../screens/super-admin/GlobalSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
};

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
};

// Stack for the Home tab (allowing seamless navigation to sub-screens)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="SuperAdminHomeMain" component={SuperAdminHomeScreen} />
      <Stack.Screen name="PlatformUsers" component={PlatformUsersScreen} options={{ headerShown: true, title: 'Global Platform Users', ...HEADER_OPTS }} />
      <Stack.Screen name="ManageHospitals" component={ManageHospitalsScreen} options={{ headerShown: true, title: 'Manage Hospitals & Admins', ...HEADER_OPTS }} />
      <Stack.Screen name="EmergencyHub" component={SuperAdminEmergencyControlScreen} options={{ headerShown: true, title: 'Emergency Command Hub', ...HEADER_OPTS }} />
      <Stack.Screen name="AmbulanceFleet" component={SuperAdminAmbulancesScreen} options={{ headerShown: true, title: 'Global Ambulance Fleet', ...HEADER_OPTS }} />
      <Stack.Screen name="PlatformAnalytics" component={PlatformAnalyticsScreen} options={{ headerShown: true, title: 'Platform Analytics', ...HEADER_OPTS }} />
      <Stack.Screen name="GlobalSettings" component={GlobalSettingsScreen} options={{ headerShown: true, title: 'Global System Settings', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Users tab
function UsersStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="PlatformUsersMain" component={PlatformUsersScreen} options={{ headerShown: true, title: 'Global Platform Users', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Hospitals tab
function HospitalsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="ManageHospitalsMain" component={ManageHospitalsScreen} options={{ headerShown: true, title: 'Manage Hospitals & Admins', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Emergency tab
function EmergencyStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="EmergencyHubMain" component={SuperAdminEmergencyControlScreen} options={{ headerShown: true, title: 'Emergency Command Hub', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Settings tab
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="GlobalSettingsMain" component={GlobalSettingsScreen} options={{ headerShown: true, title: 'Global System Settings', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

export default function SuperAdminStackNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const barHeight = 54 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.fontWeights.semibold,
          marginTop: 1,
        },
        tabBarIcon: ({ focused, color }) => {
          const ICONS = {
            Console: focused ? 'home' : 'home-outline',
            Users: focused ? 'people' : 'people-outline',
            Hospitals: focused ? 'business' : 'business-outline',
            Emergency: focused ? 'warning' : 'warning-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={ICONS[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Console" component={HomeStack} />
      <Tab.Screen name="Users" component={UsersStack} />
      <Tab.Screen name="Hospitals" component={HospitalsStack} />
      <Tab.Screen name="Emergency" component={EmergencyStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
