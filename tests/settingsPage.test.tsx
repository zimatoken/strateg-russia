import { describe, expect, it } from 'vitest';
import { getEnabledModules } from '../src/modules/registry';

describe('settings module', () => {
  it('includes the settings module in the enabled registry', () => {
    const settingsModule = getEnabledModules().find((module) => module.id === 'settings');

    expect(settingsModule).toBeDefined();
    expect(settingsModule?.path).toBe('/settings');
    expect(settingsModule?.title).toBeTruthy();
  });
});
