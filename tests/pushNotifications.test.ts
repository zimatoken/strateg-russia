import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  urlBase64ToUint8Array,
  isPushSubscribed,
  getNotificationPermission
} from '../src/core/pushNotifications';

describe('pushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('urlBase64ToUint8Array', () => {
    it('converts base64 string to Uint8Array', () => {
      const base64 = 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA=';
      const result = urlBase64ToUint8Array(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(2);
      expect(result[2]).toBe(3);
    });

    it('handles padding correctly', () => {
      const base64 = 'AQ==';
      const result = urlBase64ToUint8Array(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(1);
    });

    it('handles URL-safe characters', () => {
      const base64 = 'AQ-ID_BA'; // Valid URL-safe base64
      const result = urlBase64ToUint8Array(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(6); // After padding conversion
    });
  });

  describe('isPushSubscribed', () => {
    it('returns false when localStorage has no subscription', () => {
      expect(isPushSubscribed()).toBe(false);
    });

    it('returns true when localStorage has subscription', () => {
      localStorage.setItem('zima-push-subscribed', 'true');
      expect(isPushSubscribed()).toBe(true);
    });

    it('returns false when localStorage has invalid value', () => {
      localStorage.setItem('zima-push-subscribed', 'false');
      expect(isPushSubscribed()).toBe(false);
    });
  });

  describe('getNotificationPermission', () => {
    it('returns denied when Notification is not available', () => {
      // In test environment, Notification might not be available
      const result = getNotificationPermission();
      expect(result).toBe('denied');
    });
  });
});
