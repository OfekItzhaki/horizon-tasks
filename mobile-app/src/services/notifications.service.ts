import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderConfig, ReminderTimeframe, ReminderSpecificDate } from '../types';
import Constants from 'expo-constants';

<<<<<<< HEAD
// Track if notification handler has been configured
let notificationHandlerConfigured = false;

/**
 * Check if we're running in Expo Go (where notifications don't work)
 * Made extra safe to never throw
 */
function isExpoGo(): boolean {
  try {
    // Check multiple ways to detect Expo Go
    const appOwnership = Constants?.appOwnership;
    if (appOwnership === 'expo' || appOwnership === 'guest') {
      return true;
    }
    // Also check executionEnvironment for newer Expo versions
    const exEnv = (Constants as any)?.executionEnvironment;
    if (exEnv === 'storeClient' || exEnv === 'standalone') {
      return false; // Production build
    }
    // Default to true (Expo Go) to be safe
    return appOwnership !== 'standalone';
  } catch {
    // If anything fails, assume Expo Go to be safe
=======
/**
 * Check if we're running in Expo Go (where notifications don't work)
 */
function isExpoGo(): boolean {
  try {
    // In Expo Go, appOwnership is 'expo' or 'guest'
    // In standalone builds, it's 'standalone' or undefined
    return Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest';
  } catch {
    // If Constants isn't available, assume Expo Go to be safe
>>>>>>> main
    return true;
  }
}

<<<<<<< HEAD
/**
 * Configure notification channel for Android (required for scheduled notifications)
 * Deferred to be called explicitly, not at module load
 */
async function setupNotificationChannel(): Promise<void> {
=======
// Configure notification channel for Android (required for scheduled notifications)
async function setupNotificationChannel() {
>>>>>>> main
  if (isExpoGo()) {
    return;
  }

  try {
<<<<<<< HEAD
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Task Reminders',
        description: 'Notifications for task reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default', // Use string instead of boolean for Android compatibility
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
    }
=======
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Task Reminders',
      description: 'Notifications for task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
>>>>>>> main
  } catch (error) {
    console.error('Error setting up notification channel:', error);
  }
}

<<<<<<< HEAD
/**
 * Configure notification handler - called lazily, not at module load
 * This prevents issues with module-level code execution in Expo Go
 */
async function ensureNotificationHandlerConfigured(): Promise<void> {
  if (notificationHandlerConfigured || isExpoGo()) {
    return;
  }

=======
// Configure how notifications are handled when app is in foreground
// Only configure if not in Expo Go (where notifications don't work)
if (!isExpoGo()) {
>>>>>>> main
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
<<<<<<< HEAD
    await setupNotificationChannel();
    notificationHandlerConfigured = true;
  } catch (error) {
    console.error('Error configuring notification handler:', error);
  }
}

// NOTE: We no longer run notification setup at module load time
// It will be initialized lazily when requestNotificationPermissions is called

=======
    // Setup notification channel for Android
    setupNotificationChannel();
  } catch (error) {
    // Silently fail if notifications aren't available
  }
}

>>>>>>> main
export interface ScheduledNotification {
  identifier: string;
  taskId: number;
  reminderId: string;
}

/**
 * Request notification permissions
 * Returns false silently in Expo Go where notifications aren't supported
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Skip in Expo Go
  if (isExpoGo()) {
    console.log('Skipping notification permissions - running in Expo Go');
    return false;
  }

  try {
<<<<<<< HEAD
    // Initialize notification handler and channel (deferred from module load)
    await ensureNotificationHandlerConfigured();
=======
    // Setup notification channel first (Android requirement)
    await setupNotificationChannel();
>>>>>>> main
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        },
      });
      finalStatus = status;
    }
    
    const granted = finalStatus === 'granted';
    console.log(`Notification permissions: ${granted ? 'GRANTED' : 'DENIED'} (status: ${finalStatus})`);
    return granted;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a notification for a reminder
 */
export async function scheduleReminderNotification(
  taskId: number,
  taskDescription: string,
  reminder: ReminderConfig,
  dueDate: Date | string | null,
): Promise<string | null> {
  // Skip in Expo Go
  if (isExpoGo()) {
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Build trigger based on reminder type
    let trigger: Notifications.TriggerInput;
    const timeParts = (reminder.time || '09:00').split(':');
    const hours = parseInt(timeParts[0] || '9', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);

    // For recurring daily reminders, use daily trigger
    if (reminder.timeframe === ReminderTimeframe.EVERY_DAY) {
      // Ensure notification channel is set up
      await setupNotificationChannel();
      
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      } as Notifications.DailyTriggerInput;
      console.log(`Scheduling daily reminder at ${hours}:${minutes.toString().padStart(2, '0')} (repeats: true)`);
    } 
    // For recurring weekly reminders, use weekly trigger
    else if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
      // Ensure notification channel is set up
      await setupNotificationChannel();
      
      trigger = {
        weekday: reminder.dayOfWeek + 1, // expo-notifications uses 1-7 (Sunday = 1)
        hour: hours,
        minute: minutes,
        repeats: true,
      } as Notifications.WeeklyTriggerInput;
      console.log(`Scheduling weekly reminder: weekday ${reminder.dayOfWeek + 1} at ${hours}:${minutes.toString().padStart(2, '0')} (repeats: true)`);
    } 
    // For other reminders, calculate the date first
    else {
      const triggerDate = calculateNotificationDate(reminder, dueDate);
      if (!triggerDate) {
        return null;
      }

      // Don't schedule if the date is in the past (for one-time notifications)
      if (triggerDate < new Date() && reminder.timeframe !== ReminderTimeframe.EVERY_MONTH && reminder.timeframe !== ReminderTimeframe.EVERY_YEAR) {
        return null;
      }

      trigger = {
        date: triggerDate,
      };
    }

    // Ensure notification channel is set up before scheduling
    await setupNotificationChannel();
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${taskDescription}`,
        body: formatNotificationBody(reminder, dueDate),
<<<<<<< HEAD
        sound: reminder.hasAlarm === true ? 'default' : undefined, // Use string for Android compatibility
=======
        sound: reminder.hasAlarm === true, // Play sound only if alarm is enabled
>>>>>>> main
        data: {
          taskId,
          reminderId: reminder.id,
        },
        // Android requires channelId in content
        ...(Platform.OS === 'android' && { channelId: 'default' }),
      },
      trigger,
    });

    console.log(`Scheduled notification ${notificationId} for task ${taskId}, reminder ${reminder.id} (${reminder.timeframe})`);
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Calculate the exact date/time for a notification based on reminder config
 */
function calculateNotificationDate(
  reminder: ReminderConfig,
  dueDate: Date | string | null,
): Date | null {
  const now = new Date();
  const timeParts = (reminder.time || '09:00').split(':');
  const hours = parseInt(timeParts[0] || '9', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);

  // Don't calculate for recurring daily/weekly - they use recurring triggers
  if (reminder.timeframe === ReminderTimeframe.EVERY_DAY || 
      (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined)) {
    return null;
  }

  let notificationDate: Date;

  // If reminder is relative to due date
  if (reminder.daysBefore !== undefined && reminder.daysBefore >= 0 && dueDate) {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    notificationDate = new Date(due);
    notificationDate.setDate(notificationDate.getDate() - reminder.daysBefore);
    notificationDate.setHours(hours, minutes, 0, 0);
    return notificationDate;
  }

  // Handle different timeframes
  switch (reminder.timeframe) {
    case ReminderTimeframe.SPECIFIC_DATE:
      if (reminder.customDate) {
        notificationDate = new Date(reminder.customDate);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      }
      // For START_OF_WEEK, START_OF_MONTH, START_OF_YEAR - calculate next occurrence
      if (reminder.specificDate === ReminderSpecificDate.START_OF_WEEK) {
        // Next Monday
        const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
        notificationDate = new Date(now);
        notificationDate.setDate(notificationDate.getDate() + daysUntilMonday);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      }
      if (reminder.specificDate === ReminderSpecificDate.START_OF_MONTH) {
        // 1st of next month
        notificationDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      }
      if (reminder.specificDate === ReminderSpecificDate.START_OF_YEAR) {
        // Jan 1st of next year
        notificationDate = new Date(now.getFullYear() + 1, 0, 1);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      }
      break;

    case ReminderTimeframe.EVERY_DAY:
      // Next occurrence of this time today or tomorrow
      notificationDate = new Date(now);
      notificationDate.setHours(hours, minutes, 0, 0);
      if (notificationDate < now) {
        notificationDate.setDate(notificationDate.getDate() + 1);
      }
      return notificationDate;

    case ReminderTimeframe.EVERY_WEEK:
      if (reminder.dayOfWeek !== undefined) {
        // Next occurrence of this day of week
        const daysUntil = (reminder.dayOfWeek - now.getDay() + 7) % 7 || 7;
        notificationDate = new Date(now);
        notificationDate.setDate(notificationDate.getDate() + daysUntil);
        notificationDate.setHours(hours, minutes, 0, 0);
        return notificationDate;
      }
      break;

    case ReminderTimeframe.EVERY_MONTH:
      // 1st of next month
      notificationDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      notificationDate.setHours(hours, minutes, 0, 0);
      return notificationDate;

    case ReminderTimeframe.EVERY_YEAR:
      // Same date next year
      notificationDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      notificationDate.setHours(hours, minutes, 0, 0);
      return notificationDate;
  }

  return null;
}

/**
 * Format notification body text
 */
function formatNotificationBody(
  reminder: ReminderConfig,
  dueDate: Date | string | null,
): string {
  if (reminder.daysBefore !== undefined && reminder.daysBefore >= 0 && dueDate) {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const daysUntil = Math.ceil((due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil === 0) {
      return 'This task is due today!';
    } else if (daysUntil === 1) {
      return 'This task is due tomorrow.';
    } else {
      return `This task is due in ${daysUntil} days.`;
    }
  }

  return 'Reminder for your task';
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  // Skip in Expo Go
  if (isExpoGo()) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    // Silently fail if notifications aren't available
  }
}

/**
 * Cancel all notifications for a task
 */
export async function cancelAllTaskNotifications(taskId: number): Promise<void> {
  // Skip in Expo Go
  if (isExpoGo()) {
    return;
  }

  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const taskNotifications = allNotifications.filter(
      (notification) => notification.content.data?.taskId === taskId,
    );
    
    for (const notification of taskNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  } catch (error) {
    // Silently fail if notifications aren't available
  }
}

/**
 * Schedule multiple notifications for a task's reminders
 */
export async function scheduleTaskReminders(
  taskId: number,
  taskDescription: string,
  reminders: ReminderConfig[],
  dueDate: Date | string | null,
): Promise<string[]> {
  // First cancel all existing notifications for this task
  await cancelAllTaskNotifications(taskId);

  const notificationIds: string[] = [];

  for (const reminder of reminders) {
    const id = await scheduleReminderNotification(
      taskId,
      taskDescription,
      reminder,
      dueDate,
    );
    if (id) {
      notificationIds.push(id);
    }
  }

  return notificationIds;
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getAllScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  if (isExpoGo()) {
    return [];
  }
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Reschedule all reminders for all tasks (call on app startup)
 * This ensures notifications are scheduled even after app restart
 */
export async function rescheduleAllReminders(): Promise<void> {
  // Skip in Expo Go
  if (isExpoGo()) {
    console.log('Skipping reminder rescheduling - running in Expo Go');
    return;
  }

  try {
    // Import here to avoid circular dependencies
    const { tasksService } = await import('./tasks.service');
    const { EveryDayRemindersStorage } = await import('../utils/storage');
    const { ReminderTimeframe } = await import('../types');

    // Get all tasks
    const allTasks = await tasksService.getAll();
    console.log(`Rescheduling reminders for ${allTasks.length} tasks`);

    let scheduledCount = 0;

    for (const task of allTasks) {
      if (!task.dueDate && !task.specificDayOfWeek) {
        // Skip tasks without due date or weekly reminder
        continue;
      }

      // Convert backend reminders to ReminderConfig format
      const reminders: ReminderConfig[] = [];

      // Add backend reminders (daysBefore and weekly)
      if (task.reminderDaysBefore && task.reminderDaysBefore.length > 0 && task.dueDate) {
        task.reminderDaysBefore.forEach((days) => {
          reminders.push({
            id: `days-before-${days}`,
            timeframe: ReminderTimeframe.SPECIFIC_DATE,
            time: '09:00',
            daysBefore: days,
          });
        });
      }

      if (task.specificDayOfWeek !== null && task.specificDayOfWeek !== undefined) {
        reminders.push({
          id: `day-of-week-${task.specificDayOfWeek}`,
          timeframe: ReminderTimeframe.EVERY_WEEK,
          time: '09:00',
          dayOfWeek: task.specificDayOfWeek,
        });
      }

      // Add client-side EVERY_DAY reminders
      const everyDayReminders = await EveryDayRemindersStorage.getRemindersForTask(task.id);
      if (everyDayReminders && everyDayReminders.length > 0) {
        reminders.push(...everyDayReminders);
      }

      // Schedule all reminders for this task
      if (reminders.length > 0) {
        await scheduleTaskReminders(
          task.id,
          task.description,
          reminders,
          task.dueDate || null,
        );
        scheduledCount += reminders.length;
      }
    }

    console.log(`Rescheduled ${scheduledCount} reminders across ${allTasks.length} tasks`);
  } catch (error) {
    console.error('Error rescheduling reminders:', error);
  }
}
