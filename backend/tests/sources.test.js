const { createSourceChecker, formatSourceModeLog } = require('../src/sources');

describe('sources helpers', () => {
  it('computes source configuration flags', () => {
    const checker = createSourceChecker({
      tmdbApiKey: 'tmdb',
      youtubeApiKey: '',
      twitchClientId: 'client',
      twitchClientSecret: 'secret',
    });

    expect(checker('tmdb')).toBe(true);
    expect(checker('youtube')).toBe(false);
    expect(checker('twitch')).toBe(true);
    expect(checker('unknown')).toBe(false);
  });

  it('formats source mode log line', () => {
    const checker = (source) => source !== 'youtube';
    expect(formatSourceModeLog(checker, 'test')).toBe(
      '[sources] tmdb=real youtube=demo twitch=real env=test'
    );
  });
});
