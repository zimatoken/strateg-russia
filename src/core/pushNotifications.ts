// src/core/pushNotifications.ts
// Push notification client-side logic
import { getDialogCore } from './dialogCore';

/**
 * Convert URL-safe base64 to Uint8Array for VAPID key
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported');
    return false;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }

    // Get VAPID public key from server
    const response = await fetch('/api/push/vapid-public-key');
    if (!response.ok) {
      console.error('Failed to get VAPID public key');
      return false;
    }
    
    const { publicKey } = await response.json();
    const vapidKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey as BufferSource
    });

    // Send subscription to server
    const core = getDialogCore();
    const userId = core.getConnectionState().currentStrategId;
    
    if (!userId) {
      console.error('No user ID available for push subscription');
      return false;
    }

    const subscribeResponse = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        subscription
      })
    });

    if (!subscribeResponse.ok) {
      console.error('Failed to save subscription on server');
      return false;
    }

    // Store subscription status locally
    localStorage.setItem('strateg-push-subscribed', 'true');
    console.log('Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from server
      const core = getDialogCore();
      const userId = core.getConnectionState().currentStrategId;
      
      if (userId) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });
      }
    }

    localStorage.removeItem('strateg-push-subscribed');
    console.log('Successfully unsubscribed from push notifications');
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export function isPushSubscribed(): boolean {
  return localStorage.getItem('strateg-push-subscribed') === 'true';
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}
