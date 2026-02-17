import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './src/navigation/MainNavigator';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/store/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { registerForPushNotificationsAsync } from './src/utils/notificationHelper';
import * as Notifications from 'expo-notifications';

function AppInner() {
  const { theme } = useTheme();
  const { user, token, updatePushToken } = useAuth();

  React.useEffect(() => {
    if (token && user && !user.pushToken) {
      registerForPushNotificationsAsync().then(pushToken => {
        if (pushToken) {
          updatePushToken(pushToken);
        }
      });
    }

    // Listen for notification interactions
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Notification clicked

      // Navigation logic could go here
    });

    return () => subscription.remove();
  }, [token, user]);

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <MainNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  );
}
