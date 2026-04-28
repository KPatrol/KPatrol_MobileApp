import { describe, it, expect } from 'vitest';
import { useI18n } from './i18n';

describe('useI18n (unwrapped fallback)', () => {
  it('resolves known keys to Vietnamese by default', () => {
    const { t, locale } = useI18n();
    expect(locale).toBe('vi');
    expect(t('controls.stop')).toBe('Dừng');
    expect(t('path.addToBuilder')).toBe('Thêm vào builder');
  });

  it('returns fallback or key for unknown lookups', () => {
    const { t } = useI18n();
    expect(t('nope.nothing', 'defaulted')).toBe('defaulted');
    expect(t('still.nope')).toBe('still.nope');
  });
});
