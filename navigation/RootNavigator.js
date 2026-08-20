import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import useAuthStore from '../store/authStore';
import AuthStack from './AuthStack';
import UserTabNavigator from './UserTabNavigator';
import DoctorTabNavigator from './DoctorTabNavigator';
import AdminStackNavigator from './AdminStackNavigator';
import SuperAdminStackNavigator from './SuperAdminStackNavigator';
import { colors } from '../constants/theme';

export default function RootNavigator() {
  const { token, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!token) return <AuthStack />;

  // NOTE: confirm exact role string values returned by your backend
  // (e.g. 'super_admin' vs 'superadmin' vs 'superAdmin')
  switch (role) {
    case 'doctor':
      return <DoctorTabNavigator />;
    case 'admin':
      return <AdminStackNavigator />;
    case 'super_admin':
      return <SuperAdminStackNavigator />;
    case 'patient':
    case 'user':
    default:
      return <UserTabNavigator />;
  }
}
