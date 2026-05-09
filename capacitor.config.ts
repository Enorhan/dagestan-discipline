import type { CapacitorConfig } from '@capacitor/cli';

// Live reload is dev-only: ignore CAPACITOR_LIVE_RELOAD_URL whenever NODE_ENV is production
// so a stray env var cannot bake a remote/localhost server URL into a TestFlight/App Store build.
const liveReloadUrl =
  process.env.NODE_ENV === 'production' ? undefined : process.env.CAPACITOR_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.dagestani.disciple',
  appName: 'MatFlow',
  webDir: 'out',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#0a0a0a',
    preferredContentMode: 'mobile',
  },
  ...(liveReloadUrl ? {
    server: {
      url: liveReloadUrl,
      cleartext: liveReloadUrl.startsWith('http://'),
      // If live-reload server is down, fall back to the bundled web app instead of a blank WebView.
      errorPath: 'index.html',
    }
  } : {})
};

export default config;
