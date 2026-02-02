/**
 * Mobile-specific helpers.
 * Reminder types and convert/format are in @tasks-management/frontend-services.
 */

/**
 * Format a date string for display
 * Shows "Today", "Tomorrow", or formatted date
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
