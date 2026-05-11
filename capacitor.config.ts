import type { CapacitorConfig } from '@capacitor/cli';

// Live reload is dev-only: ignore CAPACITOR_LIVE_RELOAD_URL whenever NODE_ENV is production
// so a stray env var cannot bake a remote/localhost server URL into a TestFlight/App Store build.
const liveReloadUrl =
  process.env.NODE_ENV === 'production' ? undefined : process.env.CAPACITOR_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.dagestani.disciple',
  appName: 'MatFlow',
  webDir: 'out',
  server: {
    // If the WebView ever fails a top-level navigation, recover into the bundled app shell.
    errorPath: 'index.html',
    ...(liveReloadUrl ? {
      url: liveReloadUrl,
      cleartext: liveReloadUrl.startsWith('http://'),
    } : {}),
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    backgroundColor: '#0a0a0a',
    preferredContentMode: 'mobile',
  },
};

export default config;
