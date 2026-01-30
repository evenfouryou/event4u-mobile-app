import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Failed to get push token - permission not granted');
      return null;
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    console.log('[Push] Got Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[Push] Error getting push token:', error);
    return null;
  }
}

export async function registerPushTokenWithServer(token: string): Promise<boolean> {
  try {
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    
    const response = await api.post<{ success: boolean }>('/api/pr/push-token', {
      token,
      platform,
      deviceId: Device.deviceName || undefined,
    });
    
    console.log('[Push] Token registered with server:', response.success);
    return response.success;
  } catch (error) {
    console.error('[Push] Error registering token with server:', error);
    return false;
  }
}

export async function deactivatePushTokenOnServer(token: string): Promise<boolean> {
  try {
    const response = await api.post<{ success: boolean }>('/api/pr/push-token/deactivate', {
      token,
    });
    
    console.log('[Push] Token deactivated on server:', response.success);
    return response.success;
  } catch (error) {
    console.error('[Push] Error deactivating token on server:', error);
    return false;
  }
}

export async function setupPushNotifications(): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  
  if (token) {
    await registerPushTokenWithServer(token);
  }
}
