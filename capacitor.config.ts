import type { CapacitorConfig } from '@capacitor/cli';

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
  // Development only - uncomment for local development:
  // server: {
  //   url: 'http://localhost:3000',
  //   cleartext: true
  // }
};

export default config;
