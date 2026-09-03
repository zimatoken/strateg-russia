// server/push.ts
// Push notification service using web-push with VAPID
import webpush from 'web-push';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const VAPID_FILE = join(__dirname, '../data/vapid.json');

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// In-memory storage for subscriptions (will be replaced with Redis in production)
const subscriptions = new Map<string, PushSubscription>();

// Load or generate VAPID keys
function getVapidKeys(): VapidKeys {
  if (existsSync(VAPID_FILE)) {
    try {
      const data = readFileSync(VAPID_FILE, 'utf-8');
      return JSON.parse(data) as VapidKeys;
    } catch (error) {
      console.error('Failed to load VAPID keys, generating new ones:', error);
    }
  }

  // Generate new VAPID keys
  const keys = webpush.generateVAPIDKeys();
  
  // Ensure data directory exists
  const dataDir = join(__dirname, '../data');
  if (!existsSync(dataDir)) {
    // Create directory if it doesn't exist (simple approach)
    try {
      writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
    } catch (error) {
      console.error('Failed to create data directory or save VAPID keys:', error);
    }
  } else {
    writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  }

  console.log('Generated new VAPID keys');
  return keys;
}

// Initialize web-push with VAPID keys
const vapidKeys = getVapidKeys();
webpush.setVapidDetails(
  'mailto:strateg-russia@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * Get the public VAPID key for client subscription
 */
export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

/**
 * Save a push subscription for a user
 */
export function saveSubscription(userId: string, subscription: PushSubscription): void {
  subscriptions.set(userId, subscription);
  console.log(`Saved push subscription for user: ${userId}`);
}

/**
 * Remove a push subscription for a user
 */
export function removeSubscription(userId: string): void {
  subscriptions.delete(userId);
  console.log(`Removed push subscription for user: ${userId}`);
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: unknown
): Promise<boolean> {
  const subscription = subscriptions.get(userId);
  
  if (!subscription) {
    console.log(`No subscription found for user: ${userId}`);
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      data,
      icon: '/icon-192.png',
      badge: '/-icon-192.png'
    }));
    console.log(`Push notification sent to user: ${userId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send push notification to ${userId}:`, error);
    
    // If subscription is invalid, remove it
    if (error instanceof Error && error.message.includes('410')) {
      removeSubscription(userId);
    }
    
    return false;
  }
}

/**
 * Check if a user has a subscription
 */
export function hasSubscription(userId: string): boolean {
  return subscriptions.has(userId);
}
