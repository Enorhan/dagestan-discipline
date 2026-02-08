import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.dagestani.disciple',
  appName: 'Dagestani Disciple',
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
