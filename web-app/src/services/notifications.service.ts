import {
  type ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  convertBackendToReminders,
} from '@tasks-management/frontend-services';
import toast from 'react-hot-toast';
import React from 'react';

/**
 * Web Notifications Service
 * Handles browser notifications for task reminders
 */

// Store scheduled notification timeouts
const scheduledNotifications = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNotificationSupported()) {
    if (import.meta.env.DEV) {
      console.warn('Notifications are not supported in this browser');
    }
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  // Check if we've already been denied by the browser
  if (Notification.permission === 'denied') {
    if (import.meta.env.DEV) {
      console.warn('Notification permission was denied. Please enable it in browser settings.');
    }
    return false;
  }

  // Check user preference in localStorage
  const storedPreference = localStorage.getItem('tasks_notifications_enabled');
  if (storedPreference === 'false') {
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();

  // Remember the choice
  localStorage.setItem('tasks_notifications_enabled', (permission === 'granted').toString());

  return permission === 'granted';
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

    case ReminderTimeframe.EVERY_MONTH:
      // 1st of next month
      notificationDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      notificationDate.setHours(hours, minutes, 0, 0);
      return notificationDate;

    case ReminderTimeframe.EVERY_YEAR:
      // Same date next year
      notificationDate = new Date(now);
      notificationDate.setFullYear(notificationDate.getFullYear() + 1);
      notificationDate.setHours(hours, minutes, 0, 0);
      return notificationDate;
  }

  return null;
}

/**
 * Format notification body text
 * Format: "Task Name" -> Location + Time (if available)
 */
function formatNotificationBody(
  taskDescription: string,
  reminder: ReminderConfig,
  dueDate: Date | string | null,
): string {
  const parts: string[] = [];

  if (reminder.location?.trim()) {
    parts.push(`📍 ${reminder.location.trim()}`);
  }

  const timeStr = reminder.time || '09:00';
  const timeParts = timeStr.split(':');
  const hours = parseInt(timeParts[0] || '9', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  parts.push(`🕐 ${timeFormatted}`);

  let message = `"${taskDescription}"`;

  // Add due date info if available
  if (reminder.daysBefore !== undefined && reminder.daysBefore >= 0 && dueDate) {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const now = new Date();
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil === 0) {
      parts.push('(due today)');
    } else if (daysUntil === 1) {
      parts.push('(due tomorrow)');
    } else {
      parts.push(`(due in ${daysUntil} days)`);
    }
  }

  // Combine: "Task Name" -> Time (due info)
  if (parts.length > 0) {
    message += ` → ${parts.join(' ')}`;
  }

  return message;
}

/**
 * Show a notification immediately
 */
export async function showNotification(
  title: string,
  options: NotificationOptions & { data?: { taskId?: number; reminderId?: string } } = {},
): Promise<void> {
  // 1. Browser Native Notification
  if (isNotificationSupported()) {
    const permission = await requestNotificationPermissions();
    if (permission) {
      try {
        const notification = new Notification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          if (options.data?.taskId) {
            window.location.href = `/tasks/${options.data.taskId}`;
          }
        };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error showing browser notification:', error);
        }
      }
    }
  }

  // 2. ALWAYS show an in-app toast "popup" as well
  toast((t) => (
    React.createElement('div', {
      className: 'flex flex-col gap-1',
      onClick: () => {
        toast.dismiss(t.id);
        if (options.data?.taskId) {
          window.location.href = `/tasks/${options.data.taskId}`;
        }
      }
    }, [
      React.createElement('strong', { key: 'title', className: 'text-sm font-bold' }, title),
      options.body && React.createElement('p', { key: 'body', className: 'text-xs opacity-90' }, options.body),
      React.createElement('div', { key: 'actions', className: 'mt-2 flex gap-2' }, [
        React.createElement('button', {
          key: 'view',
          className: 'px-2 py-1 bg-primary-600 dark:bg-primary-500 text-white text-[10px] rounded font-bold uppercase shadow-sm',
        }, 'View Task')
      ])
    ])
  ), {
    duration: 8000,
    position: 'top-right',
    icon: '🔔',
  });
}

/**
 * Trigger a test notification (dev-only). Use to verify permissions and delivery.
 * In dev, call from console: window.__tasksTestNotification?.()
 */
export async function triggerTestNotification(): Promise<boolean> {
  if (!import.meta.env.DEV) {
    return false;
  }
  const ok = await requestNotificationPermissions();
  if (!ok) {
    console.warn('[Notifications] Test skipped: permission not granted.');
    return false;
  }
  await showNotification('Tasks test notification', {
    body: 'If you see this, reminders should work. Try a custom reminder in a few minutes.',
    tag: 'test-notification',
  });
  console.log('[Notifications] Test notification sent.');
  return true;
}

/**
 * Schedule a reminder notification
 */
export async function scheduleReminderNotification(
  taskId: number,
  taskDescription: string,
  reminder: ReminderConfig,
  dueDate: Date | string | null,
): Promise<string | null> {
  if (!isNotificationSupported()) {
    if (import.meta.env.DEV) {
      console.warn('[Notifications] Skipped: browser does not support notifications.');
    }
    return null;
  }

  const permission = await requestNotificationPermissions();
  if (!permission) {
    if (import.meta.env.DEV) {
      console.warn('[Notifications] Skipped: permission not granted. Enable in browser settings.');
    }
    return null;
  }

  try {
    const timeParts = (reminder.time || '09:00').split(':');
    const hours = parseInt(timeParts[0] || '9', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);

    let scheduleDate: Date | null = null;
    let isRecurring = false;

    // Handle different reminder types
    if (reminder.timeframe === ReminderTimeframe.EVERY_DAY) {
      // Schedule for today at the specified time, then set up recurring
      scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (scheduleDate < new Date()) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      isRecurring = true;
    } else if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
      // Calculate next occurrence of the specified day of week
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntil = reminder.dayOfWeek - currentDay;

      if (daysUntil < 0) {
        daysUntil += 7; // Next week
      } else if (daysUntil === 0) {
        // Today - check if time has passed
        const todayAtTime = new Date();
        todayAtTime.setHours(hours, minutes, 0, 0);
        if (todayAtTime < now) {
          daysUntil = 7; // Next week
        }
      }

      scheduleDate = new Date(now);
      scheduleDate.setDate(scheduleDate.getDate() + daysUntil);
      scheduleDate.setHours(hours, minutes, 0, 0);

      isRecurring = true;
    } else {
      // One-time notification (including custom date)
      scheduleDate = calculateNotificationDate(reminder, dueDate);
      if (!scheduleDate) {
        if (import.meta.env.DEV) {
          console.warn('[Notifications] Skipped scheduling: no date for reminder', reminder.id, reminder);
        }
        return null;
      }
      // If in the past, delay <= 0 below: we skip (no notification for one-time past reminders)
    }

    if (!scheduleDate) {
      return null;
    }

    const notificationId = `reminder-${taskId}-${reminder.id}`;
    const delay = scheduleDate.getTime() - Date.now();

    if (delay <= 0) {
      // One-time reminders in the past: skip (don't notify on login for old reminders)
      /*
      if (!isRecurring) {
        if (import.meta.env.DEV) {
          console.log('[Notifications] Skipped past one-time reminder', notificationId, 'task', taskId, 'reminder', reminder.id);
        }
        return null;
      }
      */
      if (!isRecurring) return null;
      // Recurring reminder: fire now and schedule next occurrence
      if (import.meta.env.DEV) {
        console.log('[Notifications] Firing immediately (past or due now)', notificationId, 'task', taskId, 'reminder', reminder.id);
      }
      await showNotification(taskDescription, {
        body: formatNotificationBody(taskDescription, reminder, dueDate),
        tag: notificationId,
        data: { taskId, reminderId: reminder.id },
      });
      scheduleNextRecurringNotification(taskId, taskDescription, reminder, dueDate, notificationId);
      return notificationId;
    }

    // Schedule the notification
    const timeoutId = setTimeout(async () => {
      await showNotification(taskDescription, {
        body: formatNotificationBody(taskDescription, reminder, dueDate),
        tag: notificationId,
        data: { taskId, reminderId: reminder.id },
      });

      // If recurring, schedule next occurrence
      if (isRecurring) {
        scheduleNextRecurringNotification(taskId, taskDescription, reminder, dueDate, notificationId);
      }
    }, delay);

    scheduledNotifications.set(notificationId, timeoutId);

    /*
    if (import.meta.env.DEV) {
      console.log('[Notifications] Scheduled', notificationId, 'for task', taskId, 'at', scheduleDate.toISOString(), 'in', Math.round(delay / 1000), 's');
    }
    */

    return notificationId;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error scheduling notification:', error);
    }
    return null;
  }
}

/**
 * Schedule next occurrence of a recurring notification
 */
function scheduleNextRecurringNotification(
  taskId: number,
  taskDescription: string,
  reminder: ReminderConfig,
  dueDate: Date | string | null,
  notificationId: string,
): void {
  const timeParts = (reminder.time || '09:00').split(':');
  const hours = parseInt(timeParts[0] || '9', 10);
  const minutes = parseInt(timeParts[1] || '0', 10);

  let nextDate: Date;

  if (reminder.timeframe === ReminderTimeframe.EVERY_DAY) {
    // Schedule for tomorrow at the same time
    nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(hours, minutes, 0, 0);
  } else if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
    // Schedule for next week same day
    nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    nextDate.setHours(hours, minutes, 0, 0);
  } else {
    return; // Not a recurring notification
  }

  const delay = nextDate.getTime() - Date.now();

  const timeoutId = setTimeout(async () => {
    await showNotification(taskDescription, {
      body: formatNotificationBody(taskDescription, reminder, dueDate),
      tag: notificationId,
      data: { taskId, reminderId: reminder.id },
    });

    // Schedule next occurrence
    scheduleNextRecurringNotification(taskId, taskDescription, reminder, dueDate, notificationId);
  }, delay);

  scheduledNotifications.set(notificationId, timeoutId);
}

/**
 * Cancel a scheduled notification
 */
export function cancelNotification(notificationId: string): void {
  const timeoutId = scheduledNotifications.get(notificationId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledNotifications.delete(notificationId);
  }
}

/**
 * Cancel all notifications for a task
 */
export function cancelAllTaskNotifications(taskId: number): void {
  const keysToCancel: string[] = [];

  scheduledNotifications.forEach((_, key) => {
    if (key.startsWith(`reminder-${taskId}-`)) {
      keysToCancel.push(key);
    }
  });

  keysToCancel.forEach((key) => {
    cancelNotification(key);
  });
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
  const notificationIds: string[] = [];

  for (const reminder of reminders) {
    const id = await scheduleReminderNotification(taskId, taskDescription, reminder, dueDate);
    if (id) {
      notificationIds.push(id);
    }
  }

  return notificationIds;
}

/**
 * Reschedule all reminders for all tasks
 * This should be called on app startup to restore scheduled notifications
 */
export async function rescheduleAllReminders(
  tasks: Array<{
    id: number;
    description: string;
    completed: boolean;
    dueDate: string | null;
    reminderDaysBefore: number[];
    specificDayOfWeek: number | null;
    reminderConfig?: unknown;
  }>,
): Promise<void> {
  // Clear all existing scheduled notifications
  scheduledNotifications.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  scheduledNotifications.clear();

  let scheduledCount = 0;

  for (const task of tasks) {
    if (task.completed) {
      continue;
    }

    // Convert backend reminders to ReminderConfig format
    const reminders = convertBackendToReminders(
      task.reminderDaysBefore,
      task.specificDayOfWeek,
      task.dueDate || undefined,
      task.reminderConfig,
    );

    if (reminders.length === 0) {
      continue;
    }

    // Schedule all reminders for this task
    const notificationIds = await scheduleTaskReminders(
      task.id,
      task.description,
      reminders,
      task.dueDate || null,
    );

    scheduledCount += notificationIds.length;
  }
}
