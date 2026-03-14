import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Use banner/list instead of the deprecated shouldShowAlert
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'pillaflow-default';

const isPermissionGranted = (permissionResponse) =>
  permissionResponse?.granted === true || permissionResponse?.status === 'granted';

export const ensureDefaultChannelAsync = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Pillaflow Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5A5F',
      sound: 'default',
    });
    return ANDROID_CHANNEL_ID;
  }
  return undefined;
};

export const getNotificationPermissionStatusAsync = async () => {
  const permission = await Notifications.getPermissionsAsync();
  const granted = isPermissionGranted(permission);

  if (granted) {
    await ensureDefaultChannelAsync();
  }

  return granted;
};

export const requestNotificationPermissionAsync = async () => {
  const existingPermission = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(existingPermission)) {
    await ensureDefaultChannelAsync();
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();
  const granted = isPermissionGranted(requestedPermission);

  if (!granted) {
    return false;
  }

  await ensureDefaultChannelAsync();
  return true;
};

export const cancelAllScheduledNotificationsAsync = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const cancelScheduledNotificationAsync = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.log('Error cancelling scheduled notification:', error);
  }
};

export const getExpoPushTokenAsync = async (projectId) => {
  if (!projectId) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token?.data || null;
};

export const parseTimeString = (value, fallbackHour = 9, fallbackMinute = 0) => {
  if (!value || typeof value !== 'string') {
    return { hour: fallbackHour, minute: fallbackMinute };
  }

  const match = value.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2] ?? '0', 10);
  const suffix = match[3]?.toUpperCase();

  if (suffix === 'PM' && hour < 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { hour: fallbackHour, minute: fallbackMinute };
  }

  return { hour, minute };
};

export const buildDateWithTime = (dateInput, timeInput, fallbackHour = 9, fallbackMinute = 0) => {
  if (!dateInput) return null;
  const base = new Date(dateInput);
  if (Number.isNaN(base.getTime())) return null;

  const { hour, minute } = parseTimeString(timeInput, fallbackHour, fallbackMinute);
  base.setHours(hour, minute, 0, 0);
  return base;
};

export const formatFriendlyDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatTimeFromDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const scheduleLocalNotificationAsync = async ({ title, body, data, trigger }) => {
  const channelId = await ensureDefaultChannelAsync();
  let normalizedTrigger = trigger;

  // Expo SDK 50+ expects explicit trigger types; wrap Date instances
  if (trigger instanceof Date) {
    normalizedTrigger = { type: 'date', date: trigger };
  }

  const finalTrigger =
    Platform.OS === 'android'
      ? { channelId: channelId || undefined, ...normalizedTrigger }
      : normalizedTrigger;

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: finalTrigger,
  });
};
