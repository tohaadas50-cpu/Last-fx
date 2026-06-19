import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.textfx.app',
  appName: 'TextFX',
  webDir:  'dist',

  android: {
    // Allow HTTPS calls to Railway (never set to true in production)
    allowMixedContent: false,
    // Adjust WebView when keyboard appears — critical for textarea on mobile
    captureInput: true,
  },

  plugins: {
    // No native plugins required for v1; add Haptics / StatusBar later if needed
  },
}

export default config
