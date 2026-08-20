import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { updatePushToken } from '../api/auth';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function useNotifications(onNotification) {
  const notifListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotifications();

    try {
      notifListener.current = Notifications.addNotificationReceivedListener((notification) => {
        onNotification?.(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        onNotification?.(response.notification, data);
      });
    } catch (_) {}

    return () => {
      try {
        if (notifListener.current) Notifications.removeNotificationSubscription(notifListener.current);
        if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
      } catch (_) {}
    };
  }, []);
}

async function registerForPushNotifications() {
  if (Platform.OS === 'android' && isExpoGo) {
    // Remote push notifications were removed from Expo Go on Android in SDK 53+
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData?.data) {
      await updatePushToken(tokenData.data);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'MediAI',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0EA5A4',
      });
    }
  } catch (e) {
    // Graceful fallback for environments where push notifications are restricted
  }
}
