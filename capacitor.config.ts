import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yinkajulius.petroleum',
  appName: 'Yinka Julius Petroleum',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#1E40AF',
      androidSplashResourceName: 'splash_screen',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      fadeInDuration: 500,
      fadeOutDuration: 500
    }
  }
};

export default config;
