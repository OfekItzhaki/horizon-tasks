/**
 * TypeScript types matching the backend API
 */

export enum NotificationFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

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
  notificationFrequency: NotificationFrequency;
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
  deletedAt?: string | null;
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
  reminderConfig?: any; // JSON field for storing reminder configurations
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
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

export interface UpdateUserDto {
  email?: string;
  name?: string;
  profilePicture?: string;
  password?: string;
  notificationFrequency?: NotificationFrequency;
}

export interface CreateTodoListDto {
  name: string;
}

export interface UpdateTodoListDto {
  name?: string;
}

export interface CreateTaskDto {
  description: string;
  dueDate?: string;
  reminderDaysBefore?: number[];
  specificDayOfWeek?: number;
  reminderConfig?: any;
}

export interface UpdateTaskDto {
  description?: string;
  completed?: boolean;
  dueDate?: string | null;
  reminderDaysBefore?: number[];
  specificDayOfWeek?: number | null;
  reminderConfig?: any;
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

// Reminder types (ReminderConfig, ReminderTimeframe, ReminderSpecificDate, etc.)
// are in @tasks-management/frontend-services
