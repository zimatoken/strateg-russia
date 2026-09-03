import { afterEach, describe, expect, it } from 'vitest';
import { updateBadge } from '../src/utils/badge';

describe('badge utility', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/icon-192.png';
    document.head.appendChild(link);
  });

  it('replaces favicon with a badge for positive counts and restores it for zero', () => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/icon-192.png';
    document.head.appendChild(link);

    updateBadge(7);
    const withBadge = document.querySelector('link[rel="icon"]');
    expect(withBadge?.getAttribute('href')).toContain('data:image/png;base64');

    updateBadge(0);
    const restored = document.querySelector('link[rel="icon"]');
    expect(restored?.getAttribute('href')).toBe('/icon-192.png');
  });
});
