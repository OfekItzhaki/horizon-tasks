/**
 * TypeScript types matching the backend API
 */

export enum ListType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
  FINISHED = 'FINISHED', // System list for archived completed tasks
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  profilePicture: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToDoList {
  id: number;
  name: string;
  type: ListType;
  ownerId: number;
  order: number;
  isSystem: boolean; // System lists (like "Finished Tasks") cannot be deleted
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  description: string;
  completed: boolean;
  completedAt: string | null; // When the task was marked complete
  completionCount: number; // How many times this repeating task has been completed
  todoListId: number;
  originalListId: number | null; // Original list when archived (for restore)
  order: number;
  dueDate: string | null;
  reminderDaysBefore: number[];
  specificDayOfWeek: number | null;
  completionCount: number;
  createdAt: string;
  updatedAt: string;
  todoList?: ToDoList;
}

export interface Step {
  id: number;
  description: string;
  completed: boolean;
  taskId: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderNotification {
  taskId: number;
  taskDescription: string;
  dueDate: string;
  reminderDate: string;
  message: string;
  title: string;
  listName: string;
  listType: ListType;
}

// DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  profilePicture?: string;
}

export interface CreateTodoListDto {
  name: string;
  type?: ListType;
}

export interface UpdateTodoListDto {
  name?: string;
  type?: ListType;
}

export interface CreateTaskDto {
  description: string;
  dueDate?: string;
  reminderDaysBefore?: number[];
  specificDayOfWeek?: number;
}

export interface UpdateTaskDto {
  description?: string;
  completed?: boolean;
  dueDate?: string | null;
  reminderDaysBefore?: number[];
  specificDayOfWeek?: number | null;
}

export interface CreateStepDto {
  description: string;
  completed?: boolean;
}

export interface UpdateStepDto {
  description?: string;
  completed?: boolean;
}

export interface ReorderStepsDto {
  stepIds: number[];
}

export interface ShareListDto {
  sharedWithId: number;
}

// Reminder Configuration Types
export enum ReminderTimeframe {
  SPECIFIC_DATE = 'SPECIFIC_DATE',
  EVERY_DAY = 'EVERY_DAY',
  EVERY_WEEK = 'EVERY_WEEK',
  EVERY_MONTH = 'EVERY_MONTH',
  EVERY_YEAR = 'EVERY_YEAR',
}

export enum ReminderSpecificDate {
  START_OF_WEEK = 'START_OF_WEEK',
  START_OF_MONTH = 'START_OF_MONTH',
  START_OF_YEAR = 'START_OF_YEAR',
  CUSTOM_DATE = 'CUSTOM_DATE',
}

export interface ReminderConfig {
  id: string; // Unique ID for this reminder
  timeframe: ReminderTimeframe;
  time: string; // HH:MM format
  specificDate?: ReminderSpecificDate;
  customDate?: string; // ISO date string for SPECIFIC_DATE with CUSTOM_DATE
  dayOfWeek?: number; // 0-6 for weekly reminders
  daysBefore?: number; // For reminders before due date
  hasAlarm?: boolean; // Whether to play sound/vibration for this reminder
}

export interface TaskReminderConfig {
  reminders: ReminderConfig[];
  dueDate?: string; // ISO date string
}





