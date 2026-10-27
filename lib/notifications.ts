import { Product } from './products';

let Notifications: any = null;
let handlerSet = false;

function getNotifications() {
  if (Notifications) return Notifications;
  try {
    Notifications = require('expo-notifications');
    if (!handlerSet) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }
    return Notifications;
  } catch (e) {
    console.log('Notifications are not available in this environment:', e);
    return null;
  }
}

export async function requestPermissions(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleProductReminder(
  product: Product
): Promise<string | undefined> {
  const N = getNotifications();
  if (!N) return undefined;

  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return undefined;

    const expiry = new Date(product.expiryAt);
    const triggerDate = new Date(expiry);

    if (product.reminderUnit === 'days') {
      triggerDate.setDate(triggerDate.getDate() - product.reminderValue);
    } else {
      triggerDate.setHours(triggerDate.getHours() - product.reminderValue);
    }

    if (triggerDate.getTime() <= Date.now()) return undefined;

    const id = await N.scheduleNotificationAsync({
      content: {
        title: 'FreshDate Reminder',
        body: `${product.name} expires on ${expiry.toLocaleString()}`,
        data: { productId: product.id },
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return id;
  } catch (e) {
    console.log('Could not schedule reminder:', e);
    return undefined;
  }
}

export async function cancelNotification(notificationId?: string) {
  if (!notificationId) return;
  const N = getNotifications();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}