import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../constants/theme';

// Screens
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import DoctorPatientQueueScreen from '../screens/doctor/DoctorPatientQueueScreen';
import DoctorAppointmentsScreen from '../screens/doctor/DoctorAppointmentsScreen';
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import DoctorPatientsScreen from '../screens/doctor/DoctorPatientsScreen';
import DoctorReportsScreen from '../screens/doctor/DoctorReportsScreen';
import DoctorEarningsScreen from '../screens/doctor/DoctorEarningsScreen';
import DoctorSettingsScreen from '../screens/doctor/DoctorSettingsScreen';
import DoctorEmergencyScannerScreen from '../screens/doctor/DoctorEmergencyScannerScreen';
import DoctorNotificationsScreen from '../screens/doctor/DoctorNotificationsScreen';
import ChatListScreen from '../screens/user/ChatListScreen';
import ChatScreen from '../screens/user/ChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
};

function DoctorHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="DoctorHomeMain" component={DoctorHomeScreen} />
      <Stack.Screen name="DoctorPatientQueue" component={DoctorPatientQueueScreen} options={{ headerShown: true, title: 'Patient Queue', ...HEADER_OPTS }} />
      <Stack.Screen name="DoctorSchedule" component={DoctorScheduleScreen} options={{ headerShown: true, title: 'Working Schedule', ...HEADER_OPTS }} />
      <Stack.Screen name="DoctorReports" component={DoctorReportsScreen} options={{ headerShown: true, title: 'Medical Reports', ...HEADER_OPTS }} />
      <Stack.Screen name="DoctorEarnings" component={DoctorEarningsScreen} options={{ headerShown: true, title: 'Earnings & Payouts', ...HEADER_OPTS }} />
      <Stack.Screen name="DoctorEmergencyScan" component={DoctorEmergencyScannerScreen} options={{ headerShown: true, title: 'Emergency Scanner', ...HEADER_OPTS }} />
      <Stack.Screen name="DoctorNotifications" component={DoctorNotificationsScreen} options={{ headerShown: true, title: 'Notifications', ...HEADER_OPTS }} />
      <Stack.Screen name="DoctorSettings" component={DoctorSettingsScreen} options={{ headerShown: true, title: 'Doctor Settings', ...HEADER_OPTS }} />
      <Stack.Screen name="ChatRoom" component={ChatScreen} options={{ headerShown: true, title: 'Consultation Chat', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="ChatListMain" component={ChatListScreen} />
      <Stack.Screen name="ChatRoom" component={ChatScreen} options={{ headerShown: true, title: 'Chat', ...HEADER_OPTS }} />
    </Stack.Navigator>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DoctorTabNavigator() {
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
            Home: focused ? 'home' : 'home-outline',
            Appointments: focused ? 'calendar' : 'calendar-outline',
            Queue: focused ? 'people-circle' : 'people-circle-outline',
            Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={ICONS[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DoctorHomeStack} />
      <Tab.Screen name="Appointments" component={DoctorAppointmentsScreen} />
      <Tab.Screen name="Queue" component={DoctorPatientQueueScreen} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Settings" component={DoctorSettingsScreen} />
    </Tab.Navigator>
  );
}
