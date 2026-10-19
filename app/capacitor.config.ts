import type { CapacitorConfig } from '@capacitor/cli';

// The phone app is this web build inside a native shell. `npm run build` makes dist/, `npx cap sync ios` copies it into ios/.
const config: CapacitorConfig = {
  appId: 'com.ardaulker.xsword', // the App ID in Arda's Apple Developer account (chosen 19 Oct 2026; it can never change once on App Store Connect)
  appName: 'X Sword',
  webDir: 'dist',
  ios: { contentInset: 'never', backgroundColor: '#0B1026' },
  android: { backgroundColor: '#0B1026' },
  // The game is dark everywhere: light status and navigation bar icons.
  plugins: { SystemBars: { style: 'DARK' } },
};

export default config;
