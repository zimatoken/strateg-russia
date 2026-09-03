import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MobileBottomNav from '../src/components/mobile/MobileBottomNav';

describe('MobileBottomNav', () => {
  it('marks the active tab as pressed for assistive tech', () => {
    render(<MobileBottomNav activeTab="contacts" onTabChange={() => undefined} />);

    const contactsButton = screen.getByRole('button', { name: /Контакты/i });
    expect(contactsButton.getAttribute('aria-pressed')).toBe('true');

    const chatsButton = screen.getByRole('button', { name: /Дом/i });
    expect(chatsButton.getAttribute('aria-pressed')).toBe('false');
  });
});
