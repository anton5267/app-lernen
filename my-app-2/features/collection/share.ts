export type ShareExpiryStatus = 'no-expiry' | 'active' | 'expiring-soon' | 'expired';

export function formatShareDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('uk-UA');
}

export function buildShareExpiryMeta(params: {
  expiresAt: string | null;
  expired: boolean;
  now?: Date;
}) {
  const { expiresAt, expired, now = new Date() } = params;
  if (!expiresAt) {
    return {
      status: 'no-expiry' as ShareExpiryStatus,
      label: 'Безстрокове посилання',
      badge: 'Безстрокове',
    };
  }

  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) {
    return {
      status: 'active' as ShareExpiryStatus,
      label: 'Діє до: невідома дата',
      badge: 'Активне',
    };
  }

  const formatted = target.toLocaleString('uk-UA');
  const diffMs = target.getTime() - now.getTime();
  const expiredByTime = diffMs <= 0;
  if (expired || expiredByTime) {
    return {
      status: 'expired' as ShareExpiryStatus,
      label: `Термін дії завершився: ${formatted}`,
      badge: 'Прострочене',
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil(diffMs / dayMs);
  if (diffMs <= dayMs) {
    return {
      status: 'expiring-soon' as ShareExpiryStatus,
      label: `Діє до: ${formatted} (менше 24 год)`,
      badge: 'Скоро завершиться',
    };
  }

  const suffix = daysLeft <= 3 ? ` (залишилось ${daysLeft} д.)` : '';
  return {
    status: daysLeft <= 3 ? ('expiring-soon' as ShareExpiryStatus) : ('active' as ShareExpiryStatus),
    label: `Діє до: ${formatted}${suffix}`,
    badge: daysLeft <= 3 ? 'Скоро завершиться' : 'Активне',
  };
}
