import {
  Task,
  normalizeTasks as sharedNormalizeTasks,
  normalizeTask as sharedNormalizeTask,
  isOverdue as sharedIsOverdue,
  filterTasksByQuery as sharedFilterTasksByQuery,
  sortTasks as sharedSortTasks,
  getSortLabel as sharedGetSortLabel,
  calculateStepsProgress as sharedCalculateStepsProgress,
  SortOption
} from '@tasks-management/frontend-services';

/**
 * Normalize tasks - ensure boolean fields are properly typed
 */
export const normalizeTasks = sharedNormalizeTasks;

/**
 * Normalize a single task
 */
export const normalizeTask = sharedNormalizeTask;

/**
 * Check if a task has repeating reminders
 * A task is repeating if it has weekly reminders (specificDayOfWeek) 
 * or daily reminders (client-side via displayEveryDayReminders)
 */
export function isRepeatingTask(
  task: Task,
  displayEveryDayReminders?: any[],
): boolean {
  const hasWeeklyReminder = task.specificDayOfWeek !== null &&
    task.specificDayOfWeek !== undefined;
  const hasDailyReminders = displayEveryDayReminders &&
    displayEveryDayReminders.length > 0;
  return hasWeeklyReminder || hasDailyReminders || false;
}

/**
 * Check if a task is overdue
 */
export const isOverdue = sharedIsOverdue;

/**
 * Filter tasks by search query
 */
export const filterTasksByQuery = sharedFilterTasksByQuery;

/**
 * Sort tasks by various criteria
 */
export { type SortOption };
export const sortTasks = sharedSortTasks;

/**
 * Get formatted sort option label
 */
export const getSortLabel = sharedGetSortLabel;

/**
 * Calculate steps progress percentage
 */
export const calculateStepsProgress = sharedCalculateStepsProgress;
