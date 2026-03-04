export type DataSourceMode = 'real' | 'demo';
export type DataStateTone = 'neutral' | 'info' | 'warning';

function normalizeDataText(value?: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

export function humanizeDataReason(reason?: string | null) {
  const normalizedReason = normalizeDataText(reason);
  if (!normalizedReason) {
    return null;
  }
  if (normalizedReason === 'missing_tmdb_key') {
    return 'API ключ TMDB не налаштовано';
  }
  if (normalizedReason === 'missing_youtube_key') {
    return 'API ключ YouTube не налаштовано';
  }
  if (normalizedReason === 'missing_twitch_key') {
    return 'API ключі Twitch не налаштовано';
  }
  if (normalizedReason === 'query_required') {
    return 'Потрібно ввести пошуковий запит';
  }
  if (normalizedReason === 'demo_recommendations') {
    return 'Показано демо-рекомендації';
  }
  if (normalizedReason === 'no_results') {
    return 'Нічого не знайдено';
  }
  return normalizedReason;
}

export function resolveDataStateTone(params: { mode: DataSourceMode; reason?: string | null }) {
  const { mode, reason } = params;
  const normalizedReason = normalizeDataText(reason);
  if (!normalizedReason) {
    return mode === 'demo' ? ('warning' as DataStateTone) : ('neutral' as DataStateTone);
  }

  if (
    normalizedReason === 'missing_tmdb_key' ||
    normalizedReason === 'missing_youtube_key' ||
    normalizedReason === 'missing_twitch_key' ||
    normalizedReason === 'demo_recommendations'
  ) {
    return 'warning';
  }

  if (normalizedReason === 'query_required' || normalizedReason === 'no_results') {
    return 'info';
  }

  return mode === 'demo' ? 'warning' : 'info';
}

export function resolveDataStateReason(params: { mode: DataSourceMode; reason?: string | null }) {
  const { mode, reason } = params;
  const friendlyReason = humanizeDataReason(reason);
  if (friendlyReason) {
    return friendlyReason;
  }

  if (mode === 'demo') {
    return 'Активний демо-режим даних';
  }
  return null;
}

export function shouldRenderDataStateBanner(params: {
  mode: DataSourceMode;
  reason?: string | null;
  hint?: string | null;
  canSeeDebug: boolean;
}) {
  const { mode, reason, hint, canSeeDebug } = params;
  if (canSeeDebug) {
    return true;
  }

  const hasUserMessage = Boolean(resolveDataStateReason({ mode, reason }) || normalizeDataText(hint));
  if (mode === 'real' && !hasUserMessage) {
    return false;
  }
  if (mode === 'demo' && !hasUserMessage) {
    return false;
  }
  return true;
}
