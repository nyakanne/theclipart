import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'me.vindica.app',
  appName: 'Vindica',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
}

export default config
