import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workops.app',
  appName: 'WorkOp',
  webDir: 'build',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '822771091336-bvi7fm4l8jhh7ujkppi0p0pgiisvtkgu.apps.googleusercontent.com', // Replace with actual Web Client ID from Google Cloud Console
      forceCodeForRefreshToken: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff'
    }
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
