import { buildShareExpiryMeta, formatShareDateTime } from './share';

describe('collection share utils', () => {
  const NOW = new Date('2026-03-03T12:00:00.000Z');

  it('formats known datetime string and returns null for invalid value', () => {
    expect(formatShareDateTime('2026-03-10T16:30:00.000Z')).toBeTruthy();
    expect(formatShareDateTime('not-a-date')).toBeNull();
  });

  it('returns no-expiry metadata', () => {
    const meta = buildShareExpiryMeta({ expiresAt: null, expired: false, now: NOW });
    expect(meta.status).toBe('no-expiry');
    expect(meta.badge).toBe('Безстрокове');
  });

  it('returns expired metadata for explicit or time-based expiration', () => {
    const explicit = buildShareExpiryMeta({
      expiresAt: '2026-03-10T12:00:00.000Z',
      expired: true,
      now: NOW,
    });
    expect(explicit.status).toBe('expired');

    const byTime = buildShareExpiryMeta({
      expiresAt: '2026-03-03T11:59:00.000Z',
      expired: false,
      now: NOW,
    });
    expect(byTime.status).toBe('expired');
  });

  it('returns expiring-soon metadata for under 24 hours and <=3 days', () => {
    const under24h = buildShareExpiryMeta({
      expiresAt: '2026-03-04T10:00:00.000Z',
      expired: false,
      now: NOW,
    });
    expect(under24h.status).toBe('expiring-soon');
    expect(under24h.label).toContain('менше 24 год');

    const twoDays = buildShareExpiryMeta({
      expiresAt: '2026-03-05T12:00:00.000Z',
      expired: false,
      now: NOW,
    });
    expect(twoDays.status).toBe('expiring-soon');
    expect(twoDays.label).toContain('залишилось 2 д.');
  });

  it('returns active metadata for long-lived links', () => {
    const meta = buildShareExpiryMeta({
      expiresAt: '2026-03-15T12:00:00.000Z',
      expired: false,
      now: NOW,
    });
    expect(meta.status).toBe('active');
    expect(meta.badge).toBe('Активне');
  });
});
