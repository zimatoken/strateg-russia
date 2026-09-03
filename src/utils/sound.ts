// STAGE10: Notification sound helpers
const NOTIFICATIONS_KEY = 'zima_notifications_enabled';

export function isNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(NOTIFICATIONS_KEY);
  return saved !== 'false';
}

export function playNotificationSound(): void {
  if (typeof document === 'undefined' || !document.hidden || !isNotificationsEnabled()) {
    return;
  }

  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.3;
    void audio.play().catch(() => undefined);
  } catch {
    // STAGE10: silently ignore missing or unsupported audio
  }
}

export function playSendSound(): void {
  if (typeof document === 'undefined' || document.hidden) {
    return;
  }

  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.2;
    void audio.play().catch(() => undefined);
  } catch {
    // Silence if playback fails
  }
}
