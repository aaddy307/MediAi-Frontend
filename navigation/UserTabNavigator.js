import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { colors, typography } from '../constants/theme';

// Screens
import HomeScreen from '../screens/user/HomeScreen';
import DoctorsScreen from '../screens/user/DoctorsScreen';
import SymptomCheckerScreen from '../screens/user/SymptomCheckerScreen';
import HealthScreen from '../screens/user/HealthScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import AppointmentsScreen from '../screens/user/AppointmentsScreen';
import BookAppointmentScreen from '../screens/user/BookAppointmentScreen';
import ChatListScreen from '../screens/user/ChatListScreen';
import ChatScreen from '../screens/user/ChatScreen';
import MedicineStoreScreen from '../screens/user/MedicineStoreScreen';
import MedicineRemindersScreen from '../screens/user/MedicineRemindersScreen';
import EmergencyScreen from '../screens/user/EmergencyScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'slide_from_right',
};

// Nested stacks for tab screens that have sub-screens
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Doctors" component={DoctorsScreen} options={{ headerShown: true, title: 'Find Doctors', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ headerShown: true, title: 'Emergency SOS', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="MedicineStore" component={MedicineStoreScreen} options={{ headerShown: true, title: 'Medicine Store & Pharmacy', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="MedicineReminders" component={MedicineRemindersScreen} options={{ headerShown: true, title: 'Medicine Reminders', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="Health" component={HealthScreen} options={{ headerShown: true, title: 'Health Records & Vitals', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="Reports" component={require('../screens/user/ReportsScreen').default} options={{ headerShown: true, title: 'My Reports', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ headerShown: true, title: 'Book Appointment', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="Notifications" component={require('../screens/user/NotificationsScreen').default} options={{ headerShown: true, title: 'Notifications', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
    </Stack.Navigator>
  );
}

function AppointmentsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="AppointmentsMain" component={AppointmentsScreen} />
      <Stack.Screen name="Doctors" component={DoctorsScreen} options={{ headerShown: true, title: 'Find Doctors', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="MedicineReminders" component={MedicineRemindersScreen} options={{ headerShown: true, title: 'Medicine Reminders', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ headerShown: true, title: 'Book Appointment', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="ChatListMain" component={ChatListScreen} />
      <Stack.Screen
        name="ChatRoom"
        component={ChatScreen}
        options={({ route }) => ({
          headerShown: true,
          title: 'Chat',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        })}
      />
      <Stack.Screen
        name="Doctors"
        component={DoctorsScreen}
        options={{
          headerShown: true,
          title: 'Find Doctors',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="MedicineReminders"
        component={MedicineRemindersScreen}
        options={{
          headerShown: true,
          title: 'Medicine Reminders',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{
          headerShown: true,
          title: 'Book Appointment',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
    </Stack.Navigator>
  );
}

function SymptomStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="SymptomMain" component={SymptomCheckerScreen} />
      <Stack.Screen
        name="BookAppointment"
        component={BookAppointmentScreen}
        options={{
          headerShown: true,
          title: 'Book Appointment',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="Doctors"
        component={DoctorsScreen}
        options={{
          headerShown: true,
          title: 'Find Doctors',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <Stack.Screen
        name="MedicineReminders"
        component={MedicineRemindersScreen}
        options={{
          headerShown: true,
          title: 'Medicine Reminders',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
    </Stack.Navigator>
  );
}

function DoctorsStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="DoctorsMain" component={DoctorsScreen} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ headerShown: true, title: 'Book Appointment', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
    </Stack.Navigator>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function UserTabNavigator() {
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
            Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Symptom: focused ? 'pulse' : 'pulse-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={ICONS[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Appointments" component={AppointmentsStack} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Symptom" component={SymptomStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
