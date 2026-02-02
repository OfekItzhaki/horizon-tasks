import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { tasksService } from '../services/tasks.service';
import { listsService } from '../services/lists.service';
import {
  requestNotificationPermissions,
  rescheduleAllReminders,
  triggerTestNotification,
} from '../services/notifications.service';

/**
 * Hook to initialize and manage notifications
 * Requests permissions and reschedules reminders when user is authenticated
 */
export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);

  // Always call useQuery to maintain consistent hook order
  // The query is disabled when not authenticated, so it won't execute
  const { data: allTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      // Get all tasks across all lists
      const lists = await listsService.getAllLists();
      const tasksPromises = lists.map((list) => tasksService.getTasksByList(list.id));
      const tasksArrays = await Promise.all(tasksPromises);
      return tasksArrays.flat();
    },
    enabled: isAuthenticated, // Query only runs when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Request notification permissions when user is authenticated (only once)
  useEffect(() => {
    if (!isAuthenticated || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const initializeNotifications = async () => {
      try {
        await requestNotificationPermissions();
        if (import.meta.env.DEV && typeof window !== 'undefined') {
          (window as Window & { __tasksTestNotification?: () => Promise<boolean> }).__tasksTestNotification =
            triggerTestNotification;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error requesting notification permissions:', error);
        }
      }
    };

    initializeNotifications();
  }, [isAuthenticated]);

  // Reschedule all reminders when tasks are loaded
  // This effect always runs, but guards against execution when not authenticated or no tasks
  useEffect(() => {
    if (!isAuthenticated || !allTasks) {
      return;
    }

    const scheduleReminders = async () => {
      try {
        await rescheduleAllReminders(allTasks);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error rescheduling reminders:', error);
        }
      }
    };

    scheduleReminders();
  }, [isAuthenticated, allTasks]);
}
