import { describe, it, expect, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ReminderConfig, ReminderTimeframe } from '@tasks-management/frontend-services';
import {
  ReminderAlarmsStorage,
  ReminderTimesStorage,
} from './storage';

describe('storage', () => {
  beforeEach(() => {
    // Clear AsyncStorage before each test
    AsyncStorage.clear();
  });

  describe('ReminderAlarmsStorage', () => {
    const taskId = 1;
    const reminderId = 'reminder-1';

    it('should return null when no alarms exist', async () => {
      const result = await ReminderAlarmsStorage.getAlarmsForTask(taskId);
      expect(result).toBeNull();
    });

    it('should set and get alarm for reminder', async () => {
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, reminderId, true);
      const alarms = await ReminderAlarmsStorage.getAlarmsForTask(taskId);

      expect(alarms).not.toBeNull();
      expect(alarms![reminderId]).toBe(true);
    });

    it('should update alarm state', async () => {
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, reminderId, true);
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, reminderId, false);
      const alarms = await ReminderAlarmsStorage.getAlarmsForTask(taskId);

      expect(alarms![reminderId]).toBe(false);
    });

    it('should handle multiple alarms for same task', async () => {
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, 'reminder-1', true);
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, 'reminder-2', false);
      const alarms = await ReminderAlarmsStorage.getAlarmsForTask(taskId);

      expect(alarms).not.toBeNull();
      expect(alarms!['reminder-1']).toBe(true);
      expect(alarms!['reminder-2']).toBe(false);
    });

    it('should normalize string "true" to boolean', async () => {
      // Simulate old data with string values
      await AsyncStorage.setItem(
        '@tasks_management:reminder_alarms',
        JSON.stringify({
          [taskId]: {
            [reminderId]: 'true',
          },
        }),
      );

      const alarms = await ReminderAlarmsStorage.getAlarmsForTask(taskId);
      expect(alarms![reminderId]).toBe(true);
    });

    it('should normalize number 1 to boolean true', async () => {
      await AsyncStorage.setItem(
        '@tasks_management:reminder_alarms',
        JSON.stringify({
          [taskId]: {
            [reminderId]: 1,
          },
        }),
      );

      const alarms = await ReminderAlarmsStorage.getAlarmsForTask(taskId);
      expect(alarms![reminderId]).toBe(true);
    });

    it('should remove alarms for task', async () => {
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, reminderId, true);
      await ReminderAlarmsStorage.removeAlarmsForTask(taskId);
      const alarms = await ReminderAlarmsStorage.getAlarmsForTask(taskId);

      expect(alarms).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Mock AsyncStorage to throw error
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      const result = await ReminderAlarmsStorage.getAlarmsForTask(taskId);
      expect(result).toBeNull();
    });
  });

  describe('ReminderTimesStorage', () => {
    const taskId = 1;
    const reminderId = 'reminder-1';
    const time = '09:00';

    it('should return null when no times exist', async () => {
      const result = await ReminderTimesStorage.getTimesForTask(taskId);
      expect(result).toBeNull();
    });

    it('should set and get time for reminder', async () => {
      await ReminderTimesStorage.setTimeForReminder(taskId, reminderId, time);
      const times = await ReminderTimesStorage.getTimesForTask(taskId);

      expect(times).not.toBeNull();
      expect(times![reminderId]).toBe(time);
    });

    it('should update time for reminder', async () => {
      await ReminderTimesStorage.setTimeForReminder(taskId, reminderId, '09:00');
      await ReminderTimesStorage.setTimeForReminder(taskId, reminderId, '14:30');
      const times = await ReminderTimesStorage.getTimesForTask(taskId);

      expect(times![reminderId]).toBe('14:30');
    });

    it('should set multiple times for task', async () => {
      const times = {
        'reminder-1': '09:00',
        'reminder-2': '14:00',
        'reminder-3': '18:00',
      };

      await ReminderTimesStorage.setTimesForTask(taskId, times);
      const result = await ReminderTimesStorage.getTimesForTask(taskId);

      expect(result).toEqual(times);
    });

    it('should remove times when setting empty object', async () => {
      await ReminderTimesStorage.setTimeForReminder(taskId, reminderId, time);
      await ReminderTimesStorage.setTimesForTask(taskId, {});
      const result = await ReminderTimesStorage.getTimesForTask(taskId);

      expect(result).toBeNull();
    });

    it('should remove times for task', async () => {
      await ReminderTimesStorage.setTimeForReminder(taskId, reminderId, time);
      await ReminderTimesStorage.removeTimesForTask(taskId);
      const result = await ReminderTimesStorage.getTimesForTask(taskId);

      expect(result).toBeNull();
    });

    it('should handle multiple tasks independently', async () => {
      await ReminderTimesStorage.setTimeForReminder(1, 'reminder-1', '09:00');
      await ReminderTimesStorage.setTimeForReminder(2, 'reminder-1', '10:00');

      const task1Times = await ReminderTimesStorage.getTimesForTask(1);
      const task2Times = await ReminderTimesStorage.getTimesForTask(2);

      expect(task1Times!['reminder-1']).toBe('09:00');
      expect(task2Times!['reminder-1']).toBe('10:00');
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));

      const result = await ReminderTimesStorage.getTimesForTask(taskId);
      expect(result).toBeNull();
    });
  });
});
