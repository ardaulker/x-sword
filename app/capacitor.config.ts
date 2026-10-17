import type { CapacitorConfig } from '@capacitor/cli';

// The phone app is this web build inside a native shell. `npm run build` makes dist/, `npx cap sync ios` copies it into ios/.
const config: CapacitorConfig = {
  appId: 'com.xsword.game', // placeholder: must match the App ID created in the Apple Developer account (Arda's choice)
  appName: 'X Sword',
  webDir: 'dist',
  ios: { contentInset: 'never', backgroundColor: '#0B1026' },
  android: { backgroundColor: '#0B1026' },
  // The game is dark everywhere: light status and navigation bar icons.
  plugins: { SystemBars: { style: 'DARK' } },
};

export default config;
