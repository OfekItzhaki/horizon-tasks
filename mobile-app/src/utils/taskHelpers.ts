import {
  normalizeTasks as sharedNormalizeTasks,
  normalizeTask as sharedNormalizeTask,
  isOverdue as sharedIsOverdue,
  filterTasksByQuery as sharedFilterTasksByQuery,
  sortTasks as sharedSortTasks,
  getSortLabel as sharedGetSortLabel,
  calculateStepsProgress as sharedCalculateStepsProgress,
} from '@tasks-management/frontend-services';
import type { SortOption as TSortOption } from '@tasks-management/frontend-services';
export type SortOption = TSortOption;
import { Task } from '../types';

/**
 * Normalize tasks - ensure boolean fields are properly typed
 */
export const normalizeTasks = sharedNormalizeTasks as unknown as (tasks: Task[]) => Task[];

/**
 * Normalize a single task
 */
export const normalizeTask = sharedNormalizeTask as unknown as (task: any) => Task;

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
export const isOverdue = sharedIsOverdue as unknown as (task: Task) => boolean;

/**
 * Filter tasks by search query
 */
export const filterTasksByQuery = sharedFilterTasksByQuery as unknown as (tasks: Task[], query: string) => Task[];

/**
 * Sort tasks by various criteria
 */
export const sortTasks = sharedSortTasks as unknown as (tasks: Task[], sortBy: SortOption) => Task[];

/**
 * Get formatted sort option label
 */
export const getSortLabel = sharedGetSortLabel;

/**
 * Calculate steps progress percentage
 */
export const calculateStepsProgress = sharedCalculateStepsProgress as unknown as (task: Task) => number;
