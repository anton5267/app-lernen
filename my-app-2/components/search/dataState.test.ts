import { humanizeDataReason, resolveDataStateReason, resolveDataStateTone, shouldRenderDataStateBanner } from './dataState';

describe('dataState helpers', () => {
  it('humanizes known reasons', () => {
    expect(humanizeDataReason('missing_tmdb_key')).toBe('API ключ TMDB не налаштовано');
    expect(humanizeDataReason('query_required')).toBe('Потрібно ввести пошуковий запит');
  });

  it('resolves fallback reason for demo mode without backend reason', () => {
    expect(resolveDataStateReason({ mode: 'demo', reason: null })).toBe('Активний демо-режим даних');
    expect(resolveDataStateReason({ mode: 'real', reason: null })).toBeNull();
  });

  it('resolves banner tone for key scenarios', () => {
    expect(resolveDataStateTone({ mode: 'demo', reason: 'missing_tmdb_key' })).toBe('warning');
    expect(resolveDataStateTone({ mode: 'real', reason: 'query_required' })).toBe('info');
    expect(resolveDataStateTone({ mode: 'real', reason: null })).toBe('neutral');
  });

  it('hides debug banner in production for real mode without user-facing message', () => {
    expect(
      shouldRenderDataStateBanner({
        mode: 'real',
        reason: null,
        hint: null,
        canSeeDebug: false,
      })
    ).toBe(false);
  });

  it('shows banner when demo mode is active', () => {
    expect(
      shouldRenderDataStateBanner({
        mode: 'demo',
        reason: null,
        hint: null,
        canSeeDebug: false,
      })
    ).toBe(true);
  });
});
