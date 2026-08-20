import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../constants/theme';

// Screens
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminDoctorsScreen from '../screens/admin/AdminDoctorsScreen';
import AdminAppointmentsScreen from '../screens/admin/AdminAppointmentsScreen';
import AdminPharmacyOrdersScreen from '../screens/admin/AdminPharmacyOrdersScreen';
import AdminEmergencyMonitoringScreen from '../screens/admin/AdminEmergencyMonitoringScreen';
import AdminTransactionsScreen from '../screens/admin/AdminTransactionsScreen';
import AdminAmbulancesScreen from '../screens/admin/AdminAmbulancesScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import AuditLogScreen from '../screens/admin/AuditLogScreen';
import SupportTicketsScreen from '../screens/admin/SupportTicketsScreen';
import MedicineStockScreen from '../screens/admin/MedicineStockScreen';

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
      <Stack.Screen name="AdminHomeMain" component={AdminHomeScreen} />
      <Stack.Screen name="AdminDoctors" component={AdminDoctorsScreen} options={{ headerShown: true, title: 'Doctors & Verification', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminAppointments" component={AdminAppointmentsScreen} options={{ headerShown: true, title: 'Appointments Oversight', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminPharmacy" component={AdminPharmacyOrdersScreen} options={{ headerShown: true, title: 'Pharmacy Delivery Orders', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminEmergency" component={AdminEmergencyMonitoringScreen} options={{ headerShown: true, title: 'Live Emergency Monitoring', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} options={{ headerShown: true, title: 'Financial Transactions', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminAmbulances" component={AdminAmbulancesScreen} options={{ headerShown: true, title: 'Ambulance Fleet Dispatch', ...HEADER_OPTS }} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ headerShown: true, title: 'Staff & Patient Users', ...HEADER_OPTS }} />
      <Stack.Screen name="MedicineStockMgmt" component={MedicineStockScreen} options={{ headerShown: true, title: 'Medicine Stock Inventory', ...HEADER_OPTS }} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} options={{ headerShown: true, title: 'Support Tickets', ...HEADER_OPTS }} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} options={{ headerShown: true, title: 'Security Audit Logs', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ headerShown: true, title: 'Hospital Settings', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Doctors tab
function DoctorsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AdminDoctorsMain" component={AdminDoctorsScreen} options={{ headerShown: true, title: 'Doctors & Verification', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Emergency tab
function EmergencyStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AdminEmergencyMain" component={AdminEmergencyMonitoringScreen} options={{ headerShown: true, title: 'Live Emergency Monitoring', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Pharmacy tab
function PharmacyStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AdminPharmacyMain" component={AdminPharmacyOrdersScreen} options={{ headerShown: true, title: 'Pharmacy Delivery Orders', ...HEADER_OPTS }} />
      <Stack.Screen name="MedicineStockMgmt" component={MedicineStockScreen} options={{ headerShown: true, title: 'Medicine Stock Inventory', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

// Stack for the Settings tab
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AdminSettingsMain" component={AdminSettingsScreen} options={{ headerShown: true, title: 'Hospital Settings', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminAmbulances" component={AdminAmbulancesScreen} options={{ headerShown: true, title: 'Ambulance Fleet Dispatch', ...HEADER_OPTS }} />
      <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} options={{ headerShown: true, title: 'Financial Transactions', ...HEADER_OPTS }} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ headerShown: true, title: 'Staff & Patient Users', ...HEADER_OPTS }} />
      <Stack.Screen name="MedicineStockMgmt" component={MedicineStockScreen} options={{ headerShown: true, title: 'Medicine Stock Inventory', ...HEADER_OPTS }} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} options={{ headerShown: true, title: 'Support Tickets', ...HEADER_OPTS }} />
      <Stack.Screen name="AuditLog" component={AuditLogScreen} options={{ headerShown: true, title: 'Security Audit Logs', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

export default function AdminStackNavigator() {
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
            Doctors: focused ? 'medkit' : 'medkit-outline',
            Emergency: focused ? 'warning' : 'warning-outline',
            Pharmacy: focused ? 'cart' : 'cart-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={ICONS[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Console" component={HomeStack} />
      <Tab.Screen name="Doctors" component={DoctorsStack} />
      <Tab.Screen name="Emergency" component={EmergencyStack} />
      <Tab.Screen name="Pharmacy" component={PharmacyStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
