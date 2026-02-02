import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeBooleans } from './normalize';
import type { ReminderConfig } from '@tasks-management/frontend-services';
import type { User } from '../types';

const TOKEN_KEY = '@tasks_management:token';
const USER_KEY = '@tasks_management:user';
const NOTIFICATION_PERMISSION_SHOWN_KEY = '@app:notification_permission_shown';

/**
 * Storage for app preferences
 */
export const AppPreferencesStorage = {
  async hasSeenNotificationPermission(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_SHOWN_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  },

  async setNotificationPermissionShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_SHOWN_KEY, 'true');
    } catch {
      // Ignore errors
    }
  },
};

/**
 * Token storage utilities
 */
export const TokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  },
};

/**
 * User storage utilities
 */
export const UserStorage = {
  async getUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(USER_KEY);
      if (!userJson) {
        return null;
      }
      const user = JSON.parse(userJson);
      // Normalize boolean fields to ensure they're actual booleans
      return normalizeBooleans(user) as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      // Ensure we're storing proper types - normalize before storing
      const normalizedUser = normalizeBooleans(user);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },
};

/**
 * Client-side storage for "every day" reminders
 * Backend doesn't support EVERY_DAY reminders (only 0-6 for weekly),
 * so we store them locally keyed by task ID
 */
const EVERY_DAY_REMINDERS_KEY = '@tasks_management:everyday_reminders';
const REMINDER_ALARMS_KEY = '@tasks_management:reminder_alarms';
const REMINDER_TIMES_KEY = '@tasks_management:reminder_times';

export const EveryDayRemindersStorage = {
  async getRemindersForTask(taskId: number): Promise<ReminderConfig[] | null> {
    try {
      const allRemindersJson = await AsyncStorage.getItem(EVERY_DAY_REMINDERS_KEY);
      if (!allRemindersJson) {
        return null;
      }
      const allReminders: Record<string, ReminderConfig[]> = JSON.parse(allRemindersJson);
      return allReminders[taskId.toString()] || null;
    } catch (error) {
      console.error('Error getting every day reminders:', error);
      return null;
    }
  },

  async setRemindersForTask(taskId: number, reminders: ReminderConfig[]): Promise<void> {
    try {
      const allRemindersJson = await AsyncStorage.getItem(EVERY_DAY_REMINDERS_KEY);
      const allReminders: Record<string, ReminderConfig[]> = allRemindersJson 
        ? JSON.parse(allRemindersJson) 
        : {};
      
      if (reminders.length > 0) {
        allReminders[taskId.toString()] = reminders;
      } else {
        delete allReminders[taskId.toString()];
      }
      
      await AsyncStorage.setItem(EVERY_DAY_REMINDERS_KEY, JSON.stringify(allReminders));
    } catch (error) {
      console.error('Error setting every day reminders:', error);
    }
  },

  async removeRemindersForTask(taskId: number): Promise<void> {
    try {
      const allRemindersJson = await AsyncStorage.getItem(EVERY_DAY_REMINDERS_KEY);
      if (!allRemindersJson) {
        return;
      }
      const allReminders: Record<string, ReminderConfig[]> = JSON.parse(allRemindersJson);
      delete allReminders[taskId.toString()];
      await AsyncStorage.setItem(EVERY_DAY_REMINDERS_KEY, JSON.stringify(allReminders));
    } catch (error) {
      console.error('Error removing every day reminders:', error);
    }
  },
};

/**
 * Storage for reminder alarm states (hasAlarm property)
 * Since backend doesn't store alarm state, we persist it client-side
 */
export const ReminderAlarmsStorage = {
  async getAlarmsForTask(taskId: number): Promise<Record<string, boolean> | null> {
    try {
      const allAlarmsJson = await AsyncStorage.getItem(REMINDER_ALARMS_KEY);
      if (!allAlarmsJson) {
        return null;
      }
      const allAlarms: Record<string, Record<string, any>> = JSON.parse(allAlarmsJson);
      const taskAlarms = allAlarms[taskId.toString()];
      if (!taskAlarms) {
        return null;
      }
      // Normalize boolean values to ensure they're actual booleans, not strings
      const normalized: Record<string, boolean> = {};
      for (const key in taskAlarms) {
        const value = taskAlarms[key];
        // Convert any value to a proper boolean
        normalized[key] = value === true || value === 'true' || value === 1;
      }
      return normalized;
    } catch (error) {
      console.error('Error getting reminder alarms:', error);
      return null;
    }
  },

  async setAlarmForReminder(taskId: number, reminderId: string, hasAlarm: boolean): Promise<void> {
    try {
      const allAlarmsJson = await AsyncStorage.getItem(REMINDER_ALARMS_KEY);
      const allAlarms: Record<string, Record<string, boolean>> = allAlarmsJson 
        ? JSON.parse(allAlarmsJson) 
        : {};
      
      if (!allAlarms[taskId.toString()]) {
        allAlarms[taskId.toString()] = {};
      }
      
      allAlarms[taskId.toString()][reminderId] = hasAlarm;
      
      await AsyncStorage.setItem(REMINDER_ALARMS_KEY, JSON.stringify(allAlarms));
    } catch (error) {
      console.error('Error setting reminder alarm:', error);
    }
  },

  async removeAlarmsForTask(taskId: number): Promise<void> {
    try {
      const allAlarmsJson = await AsyncStorage.getItem(REMINDER_ALARMS_KEY);
      if (!allAlarmsJson) {
        return;
      }
      const allAlarms: Record<string, Record<string, boolean>> = JSON.parse(allAlarmsJson);
      delete allAlarms[taskId.toString()];
      await AsyncStorage.setItem(REMINDER_ALARMS_KEY, JSON.stringify(allAlarms));
    } catch (error) {
      console.error('Error removing reminder alarms:', error);
    }
  },
};

/**
 * Storage for reminder times
 * Since backend doesn't store reminder times, we persist them client-side
 * Keyed by taskId and reminderId
 */
export const ReminderTimesStorage = {
  async getTimesForTask(taskId: number): Promise<Record<string, string> | null> {
    try {
      const allTimesJson = await AsyncStorage.getItem(REMINDER_TIMES_KEY);
      if (!allTimesJson) {
        return null;
      }
      const allTimes: Record<string, Record<string, string>> = JSON.parse(allTimesJson);
      return allTimes[taskId.toString()] || null;
    } catch (error) {
      console.error('Error getting reminder times:', error);
      return null;
    }
  },

  async setTimeForReminder(taskId: number, reminderId: string, time: string): Promise<void> {
    try {
      const allTimesJson = await AsyncStorage.getItem(REMINDER_TIMES_KEY);
      const allTimes: Record<string, Record<string, string>> = allTimesJson 
        ? JSON.parse(allTimesJson) 
        : {};
      
      if (!allTimes[taskId.toString()]) {
        allTimes[taskId.toString()] = {};
      }
      
      allTimes[taskId.toString()][reminderId] = time;
      
      await AsyncStorage.setItem(REMINDER_TIMES_KEY, JSON.stringify(allTimes));
    } catch (error) {
      console.error('Error setting reminder time:', error);
    }
  },

  async setTimesForTask(taskId: number, times: Record<string, string>): Promise<void> {
    try {
      const allTimesJson = await AsyncStorage.getItem(REMINDER_TIMES_KEY);
      const allTimes: Record<string, Record<string, string>> = allTimesJson 
        ? JSON.parse(allTimesJson) 
        : {};
      
      if (Object.keys(times).length > 0) {
        allTimes[taskId.toString()] = times;
      } else {
        delete allTimes[taskId.toString()];
      }
      
      await AsyncStorage.setItem(REMINDER_TIMES_KEY, JSON.stringify(allTimes));
    } catch (error) {
      console.error('Error setting reminder times:', error);
    }
  },

  async removeTimesForTask(taskId: number): Promise<void> {
    try {
      const allTimesJson = await AsyncStorage.getItem(REMINDER_TIMES_KEY);
      if (!allTimesJson) {
        return;
      }
      const allTimes: Record<string, Record<string, string>> = JSON.parse(allTimesJson);
      delete allTimes[taskId.toString()];
      await AsyncStorage.setItem(REMINDER_TIMES_KEY, JSON.stringify(allTimes));
    } catch (error) {
      console.error('Error removing reminder times:', error);
    }
  },
};
