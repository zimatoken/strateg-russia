import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  parseDeepLink,
  generateDeepLink,
  generateWebFallback,
  parseWebParams,
  normalizeZimaId,
  isValidZimaId,
  resolveIncomingDeepLink,
  clearDeepLinkUrl,
} from '../src/core/deepLink';

describe('deepLink', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:5173/',
        origin: 'http://localhost:5173',
        pathname: '/',
        search: '',
      },
      writable: true,
    });
    vi.mocked(window.history.replaceState).mockClear?.();
  });

  it('parseDeepLink parses zima://chat?id=...', () => {
    const result = parseDeepLink('zima://chat?id=ZIMA-ABC123DEF');
    expect(result).toEqual({ action: 'chat', id: 'ZIMA-ABC123DEF' });
  });

  it('parseDeepLink returns null for invalid scheme', () => {
    expect(parseDeepLink('https://example.com')).toBeNull();
  });

  it('parseDeepLink returns null when id is missing', () => {
    expect(parseDeepLink('zima://chat')).toBeNull();
  });

  it('generateDeepLink builds encoded url', () => {
    expect(generateDeepLink('zima-abc123def')).toBe('zima://chat?id=ZIMA-ABC123DEF');
  });

  it('generateWebFallback builds https url', () => {
    expect(generateWebFallback('ZIMA-ABC123DEF')).toBe(
      'https://zima.app/?action=chat&id=ZIMA-ABC123DEF'
    );
  });

  it('parseWebParams reads action and id from search', () => {
    const params = parseWebParams('?action=chat&id=TEST123');
    expect(params).toEqual({ action: 'chat', id: 'TEST123' });
  });

  it('parseWebParams handles protocol handler nested action', () => {
    const params = parseWebParams('?action=chat?id=ZIMA-ABC123DEF');
    expect(params).toEqual({ action: 'chat', id: 'ZIMA-ABC123DEF' });
  });

  it('normalizeZimaId uppercases and trims', () => {
    expect(normalizeZimaId('  zima-abc123def  ')).toBe('ZIMA-ABC123DEF');
    expect(normalizeZimaId('abc123def')).toBe('ZIMA-ABC123DEF');
  });

  it('isValidZimaId validates format', () => {
    expect(isValidZimaId('ZIMA-ABC123DEF')).toBe(true);
    expect(isValidZimaId('TEST123')).toBe(false);
  });

  it('resolveIncomingDeepLink reads from window.location', () => {
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:5173',
        pathname: '/',
        search: '?action=chat&id=ZIMA-USERAAAA',
      },
      writable: true,
    });

    expect(resolveIncomingDeepLink()).toEqual({
      action: 'chat',
      id: 'ZIMA-USERAAAA',
    });
  });

  it('clearDeepLinkUrl calls history.replaceState', () => {
    const replaceState = vi.fn();
    Object.defineProperty(window, 'history', {
      value: { replaceState },
      writable: true,
    });

    clearDeepLinkUrl();
    expect(replaceState).toHaveBeenCalledWith({}, document.title, '/');
  });
});
