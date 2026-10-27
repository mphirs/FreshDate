import * as Notifications from 'expo-notifications';
import { Product } from './products';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleProductReminder(product: Product): Promise<string | undefined> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return undefined;

  const expiry = new Date(product.expiryAt);
  let triggerDate = new Date(expiry);

  if (product.reminderUnit === 'days') {
    triggerDate.setDate(triggerDate.getDate() - product.reminderValue);
  } else {
    triggerDate.setHours(triggerDate.getHours() - product.reminderValue);
  }

  // Don't schedule if the reminder time is already in the past
  if (triggerDate.getTime() <= Date.now()) {
    return undefined;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'FreshDate Reminder',
      body: `${product.name} expires on ${expiry.toLocaleString()}`,
      data: { productId: product.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function cancelNotification(notificationId?: string) {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}