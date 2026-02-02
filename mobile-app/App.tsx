import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions, rescheduleAllReminders, updateDailyTasksNotification } from './src/services/notifications.service';
import { TokenStorage } from './src/utils/storage';
import './src/i18n';

function AppContent() {
  const { isDark } = useTheme();
  useEffect(() => {
    const initializeNotifications = async () => {
      // Request notification permissions on app start (without guidance, as it may have been shown on login)
      const hasPermission = await requestNotificationPermissions(false);

      if (hasPermission) {
        // Check if user is logged in before rescheduling reminders
        const hasToken = await TokenStorage.hasToken();
        if (hasToken) {
          // Reschedule all reminders on app startup
          // This ensures notifications persist after app restart
          try {
            await rescheduleAllReminders();
            // Also update daily tasks notification immediately
            await updateDailyTasksNotification();
          } catch (error: any) {
            // Silently ignore auth errors - background task shouldn't show alerts
            const isAuthError = error?.response?.status === 401 ||
              error?.message?.toLowerCase()?.includes('unauthorized');
            if (!isAuthError) {
              if (process.env.EXPO_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
              throw error; // Re-throw non-auth errors
            }
          }
        }
      }
    };

    initializeNotifications().catch((error) => {
      // Silently ignore auth errors during startup - user will login if needed
      const isAuthError = error?.response?.status === 401 ||
        error?.message?.toLowerCase()?.includes('unauthorized');
      if (!isAuthError) {
        if (process.env.EXPO_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
        console.error('Error initializing notifications:', error);
      }
    });

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;

        // If it's the daily tasks update trigger, update the persistent notification
        if (data?.type === 'daily-tasks-update') {
          try {
            await updateDailyTasksNotification();
          } catch (error) {
            if (process.env.EXPO_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
            console.error('Error updating daily tasks notification:', error);
          }
        }
      }
    );

    // Listen for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data;

        // If it's the daily tasks update trigger, update the persistent notification
        if (data?.type === 'daily-tasks-update') {
          try {
            await updateDailyTasksNotification();
          } catch (error) {
            if (process.env.EXPO_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
            console.error('Error updating daily tasks notification:', error);
          }
        }
      }
    );

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

import ErrorBoundary from './src/components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
