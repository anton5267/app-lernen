function createSourceChecker({ tmdbApiKey, youtubeApiKey, twitchClientId, twitchClientSecret }) {
  return function isSourceConfigured(source) {
    if (source === 'tmdb') {
      return Boolean(tmdbApiKey);
    }
    if (source === 'youtube') {
      return Boolean(youtubeApiKey);
    }
    if (source === 'twitch') {
      return Boolean(twitchClientId && twitchClientSecret);
    }
    return false;
  };
}

function formatSourceModeLog(isSourceConfigured, nodeEnv) {
  return `[sources] tmdb=${isSourceConfigured('tmdb') ? 'real' : 'demo'} youtube=${isSourceConfigured('youtube') ? 'real' : 'demo'} twitch=${isSourceConfigured('twitch') ? 'real' : 'demo'} env=${nodeEnv}`;
}

module.exports = {
  createSourceChecker,
  formatSourceModeLog,
};
