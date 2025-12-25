import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestNotificationPermissions, rescheduleAllReminders } from './src/services/notifications.service';
import { TokenStorage } from './src/utils/storage';

export default function App() {
  useEffect(() => {
    const initializeNotifications = async () => {
      // Request notification permissions on app start
      const hasPermission = await requestNotificationPermissions();
      
      if (hasPermission) {
        // Check if user is logged in before rescheduling reminders
        const hasToken = await TokenStorage.hasToken();
        if (hasToken) {
          // Reschedule all reminders on app startup
          // This ensures notifications persist after app restart
          try {
            await rescheduleAllReminders();
          } catch (error: any) {
            // Silently ignore auth errors - background task shouldn't show alerts
            const isAuthError = error?.response?.status === 401 || 
                                error?.message?.toLowerCase()?.includes('unauthorized');
            if (!isAuthError) {
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
        console.error('Error initializing notifications:', error);
      }
    });
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
