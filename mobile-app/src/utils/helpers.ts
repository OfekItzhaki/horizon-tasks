import { ReminderConfig, ReminderTimeframe, ReminderSpecificDate } from '../types';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format a reminder configuration for display
 */
export const formatReminderDisplay = (reminder: ReminderConfig): string => {
  const timeStr = reminder.time || '09:00';
  let description = '';

  // Check daysBefore first as it overrides other formats
  if (reminder.daysBefore !== undefined && reminder.daysBefore > 0) {
    return `${reminder.daysBefore} day(s) before due date at ${timeStr}`;
  }

  switch (reminder.timeframe) {
    case ReminderTimeframe.SPECIFIC_DATE:
      if (reminder.specificDate === ReminderSpecificDate.START_OF_WEEK) {
        description = `Every Monday at ${timeStr}`;
      } else if (reminder.specificDate === ReminderSpecificDate.START_OF_MONTH) {
        description = `1st of every month at ${timeStr}`;
      } else if (reminder.specificDate === ReminderSpecificDate.START_OF_YEAR) {
        description = `Jan 1st every year at ${timeStr}`;
      } else if (reminder.customDate) {
        const date = new Date(reminder.customDate);
        description = `${date.toLocaleDateString()} at ${timeStr}`;
      } else {
        description = `Specific date at ${timeStr}`;
      }
      break;
    case ReminderTimeframe.EVERY_DAY:
      description = `Every day at ${timeStr}`;
      break;
    case ReminderTimeframe.EVERY_WEEK:
      const dayName = reminder.dayOfWeek !== undefined ? DAY_NAMES[reminder.dayOfWeek] : 'Monday';
      description = `Every ${dayName} at ${timeStr}`;
      break;
    case ReminderTimeframe.EVERY_MONTH:
      description = `1st of every month at ${timeStr}`;
      break;
    case ReminderTimeframe.EVERY_YEAR:
      description = `Same date every year at ${timeStr}`;
      break;
  }

  return description;
};

/**
 * Convert reminder configurations to backend format
 * Note: EVERY_DAY reminders are handled client-side only via notifications
 */
export const convertRemindersToBackend = (
  reminders: ReminderConfig[],
  dueDate?: string,
): { dueDate?: string; reminderDaysBefore?: number[]; specificDayOfWeek?: number } => {
  const result: { dueDate?: string; reminderDaysBefore?: number[]; specificDayOfWeek?: number } = {};

  if (dueDate) {
    result.dueDate = new Date(dueDate).toISOString();
  }

  const daysBefore: number[] = [];
  let dayOfWeek: number | undefined;

  reminders.forEach((reminder) => {
    // Note: EVERY_DAY reminders are NOT saved to backend (backend only supports 0-6 for weekly)
    // They're handled client-side via notifications only
    // Skip EVERY_DAY reminders for backend storage
    if (reminder.timeframe === ReminderTimeframe.EVERY_DAY) {
      return; // Skip - handled by notification system only
    }
    
    // For reminders with daysBefore (relative to due date) - this is the primary use case
    if (reminder.daysBefore !== undefined && reminder.daysBefore > 0) {
      if (dueDate) {
        daysBefore.push(reminder.daysBefore);
      }
      // Note: daysBefore reminders require a due date, but we still want to save them
      // if a due date is provided in the same request
    }

    // For weekly reminders
    if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
      dayOfWeek = reminder.dayOfWeek;
    }

    // For specific date reminders that are relative to due date
    if (reminder.timeframe === ReminderTimeframe.SPECIFIC_DATE && dueDate && reminder.customDate) {
      const reminderDate = new Date(reminder.customDate);
      const due = new Date(dueDate);
      const diffDays = Math.ceil((due.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 365) { // Reasonable range
        daysBefore.push(diffDays);
      }
    }
  });

  // Always set reminderDaysBefore if we have valid daysBefore values
  if (daysBefore.length > 0) {
    // Remove duplicates and sort descending
    result.reminderDaysBefore = [...new Set(daysBefore)].sort((a, b) => b - a);
  } else {
    // Set empty array if no daysBefore reminders
    result.reminderDaysBefore = [];
  }

  // Set specificDayOfWeek (0-6 for weekly reminders only, backend doesn't support "every day")
  if (dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6) {
    result.specificDayOfWeek = dayOfWeek;
  }

  return result;
};

/**
 * Format a date string for display
 * Shows "Today", "Tomorrow", or formatted date
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time for comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
};
