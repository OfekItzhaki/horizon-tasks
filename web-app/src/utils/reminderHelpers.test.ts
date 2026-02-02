import { describe, it, expect } from 'vitest';
import {
  ReminderTimeframe,
  ReminderSpecificDate,
  type ReminderConfig,
  convertBackendToReminders,
  convertRemindersToBackend,
  formatReminderDisplay,
} from '@tasks-management/frontend-services';

describe('reminderHelpers', () => {
  describe('convertBackendToReminders', () => {
    it('should return empty array when no reminder data provided', () => {
      const result = convertBackendToReminders(undefined, null, null, undefined);
      expect(result).toEqual([]);
    });

    it('should convert reminderDaysBefore array to ReminderConfig', () => {
      const dueDate = '2026-01-30T00:00:00.000Z';
      const result = convertBackendToReminders([7, 1], null, dueDate, undefined);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'days-before-7',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '09:00',
        daysBefore: 7,
      });
      expect(result[1]).toMatchObject({
        id: 'days-before-1',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '09:00',
        daysBefore: 1,
      });
    });

    it('should not convert reminderDaysBefore when dueDate is missing', () => {
      const result = convertBackendToReminders([7, 1], null, null, undefined);
      expect(result).toEqual([]);
    });

    it('should convert specificDayOfWeek to ReminderConfig', () => {
      const result = convertBackendToReminders(undefined, 1, null, undefined);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'day-of-week-1',
        timeframe: ReminderTimeframe.EVERY_WEEK,
        time: '09:00',
        dayOfWeek: 1,
      });
    });

    it('should handle reminderConfig as array', () => {
      const reminderConfig: ReminderConfig[] = [
        {
          id: 'test-1',
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '10:00',
          hasAlarm: true,
        },
        {
          id: 'test-2',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '14:30',
          specificDate: ReminderSpecificDate.START_OF_WEEK,
        },
      ];

      const result = convertBackendToReminders(undefined, null, null, reminderConfig);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'test-1',
        timeframe: ReminderTimeframe.EVERY_DAY,
        time: '10:00',
        hasAlarm: true,
      });
      expect(result[1]).toMatchObject({
        id: 'test-2',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '14:30',
        specificDate: ReminderSpecificDate.START_OF_WEEK,
      });
    });

    it('should handle reminderConfig as single object', () => {
      const reminderConfig: ReminderConfig = {
        id: 'test-single',
        timeframe: ReminderTimeframe.EVERY_DAY,
        time: '08:00',
        hasAlarm: false,
      };

      const result = convertBackendToReminders(undefined, null, null, reminderConfig);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-single',
        timeframe: ReminderTimeframe.EVERY_DAY,
        time: '08:00',
        hasAlarm: false,
      });
    });

    it('should handle reminderConfig as JSON string', () => {
      const reminderConfig = JSON.stringify([
        {
          id: 'test-json',
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '12:00',
        },
      ]);

      const result = convertBackendToReminders(undefined, null, null, reminderConfig);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-json',
        timeframe: ReminderTimeframe.EVERY_DAY,
        time: '12:00',
      });
    });

    it('should handle invalid JSON string gracefully', () => {
      const invalidJson = '{ invalid json }';
      const result = convertBackendToReminders(undefined, null, null, invalidJson);
      expect(result).toEqual([]);
    });

    it('should generate IDs for reminders without IDs', () => {
      const reminderConfig = [
        {
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '09:00',
        },
      ];

      const result = convertBackendToReminders(undefined, null, null, reminderConfig);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBeDefined();
      expect(result[0].id).toContain('reminder-');
    });

    it('should combine all reminder types', () => {
      const dueDate = '2026-01-30T00:00:00.000Z';
      const reminderConfig: ReminderConfig[] = [
        {
          id: 'every-day',
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '09:00',
        },
      ];

      const result = convertBackendToReminders([1], 1, dueDate, reminderConfig);
      
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(r => r.id === 'every-day')).toBe(true);
      expect(result.some(r => r.id === 'days-before-1')).toBe(true);
      expect(result.some(r => r.id === 'day-of-week-1')).toBe(true);
    });
  });

  describe('convertRemindersToBackend', () => {
    it('should return empty arrays and null when no reminders provided', () => {
      const result = convertRemindersToBackend([]);
      
      expect(result).toEqual({
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        reminderConfig: null,
      });
    });

    it('should convert EVERY_DAY reminders to reminderConfig', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'every-day-1',
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '09:00',
          hasAlarm: true,
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.reminderConfig).toEqual(reminders);
      expect(result.reminderDaysBefore).toEqual([]);
      expect(result.specificDayOfWeek).toBeNull();
    });

    it('should convert SPECIFIC_DATE with CUSTOM_DATE to reminderConfig', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'custom-date',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '14:30',
          specificDate: ReminderSpecificDate.CUSTOM_DATE,
          customDate: '2026-01-27T00:00:00.000Z',
          hasAlarm: true,
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.reminderConfig).toEqual(reminders);
      expect(result.reminderDaysBefore).toEqual([]);
      expect(result.specificDayOfWeek).toBeNull();
    });

    it('should convert and then restore SPECIFIC_DATE with CUSTOM_DATE correctly', () => {
      const originalReminders: ReminderConfig[] = [
        {
          id: 'custom-date',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '00:20',
          specificDate: ReminderSpecificDate.CUSTOM_DATE,
          customDate: '2026-01-27T00:00:00.000Z',
          hasAlarm: true,
        },
      ];

      // Convert to backend format
      const backendFormat = convertRemindersToBackend(originalReminders);
      expect(backendFormat.reminderConfig).toBeDefined();
      expect(Array.isArray(backendFormat.reminderConfig)).toBe(true);
      
      // Convert back from backend format
      const restored = convertBackendToReminders(
        undefined,
        null,
        null,
        backendFormat.reminderConfig,
      );
      
      expect(restored).toHaveLength(1);
      expect(restored[0]).toMatchObject({
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '00:20',
        specificDate: ReminderSpecificDate.CUSTOM_DATE,
        customDate: '2026-01-27T00:00:00.000Z',
        hasAlarm: true,
      });
    });

    it('should convert SPECIFIC_DATE with START_OF_WEEK to reminderConfig', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'start-week',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '08:00',
          specificDate: ReminderSpecificDate.START_OF_WEEK,
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.reminderConfig).toEqual(reminders);
    });

    it('should convert EVERY_MONTH to reminderConfig', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'every-month',
          timeframe: ReminderTimeframe.EVERY_MONTH,
          time: '10:00',
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.reminderConfig).toEqual(reminders);
    });

    it('should convert EVERY_YEAR to reminderConfig', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'every-year',
          timeframe: ReminderTimeframe.EVERY_YEAR,
          time: '12:00',
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.reminderConfig).toEqual(reminders);
    });

    it('should convert daysBefore reminders to reminderDaysBefore array', () => {
      const dueDate = '2026-01-30T00:00:00.000Z';
      const reminders: ReminderConfig[] = [
        {
          id: 'days-7',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '09:00',
          daysBefore: 7,
        },
        {
          id: 'days-1',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '09:00',
          daysBefore: 1,
        },
      ];

      const result = convertRemindersToBackend(reminders, dueDate);
      
      expect(result.reminderDaysBefore).toEqual([7, 1]);
      expect(result.reminderConfig).toBeNull();
    });

    it('should not include daysBefore reminders when dueDate is missing', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'days-7',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '09:00',
          daysBefore: 7,
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.reminderDaysBefore).toEqual([]);
    });

    it('should sort and deduplicate reminderDaysBefore', () => {
      const dueDate = '2026-01-30T00:00:00.000Z';
      const reminders: ReminderConfig[] = [
        {
          id: 'days-1',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          daysBefore: 1,
        },
        {
          id: 'days-7',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          daysBefore: 7,
        },
        {
          id: 'days-1-duplicate',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          daysBefore: 1,
        },
      ];

      const result = convertRemindersToBackend(reminders, dueDate);
      
      expect(result.reminderDaysBefore).toEqual([7, 1]);
    });

    it('should convert EVERY_WEEK reminders to specificDayOfWeek', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'weekly',
          timeframe: ReminderTimeframe.EVERY_WEEK,
          time: '09:00',
          dayOfWeek: 1, // Monday
        },
      ];

      const result = convertRemindersToBackend(reminders);
      
      expect(result.specificDayOfWeek).toBe(1);
      expect(result.reminderConfig).toBeNull();
    });

    it('should handle multiple reminder types together', () => {
      const dueDate = '2026-01-30T00:00:00.000Z';
      const reminders: ReminderConfig[] = [
        {
          id: 'every-day',
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '09:00',
        },
        {
          id: 'custom-date',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '14:00',
          specificDate: ReminderSpecificDate.CUSTOM_DATE,
          customDate: '2026-01-27T00:00:00.000Z',
        },
        {
          id: 'days-7',
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '10:00',
          daysBefore: 7,
        },
        {
          id: 'weekly',
          timeframe: ReminderTimeframe.EVERY_WEEK,
          time: '08:00',
          dayOfWeek: 2,
        },
      ];

      const result = convertRemindersToBackend(reminders, dueDate);
      
      expect(result.reminderConfig).toHaveLength(2);
      expect(result.reminderConfig?.some(r => r.id === 'every-day')).toBe(true);
      expect(result.reminderConfig?.some(r => r.id === 'custom-date')).toBe(true);
      expect(result.reminderDaysBefore).toEqual([7]);
      expect(result.specificDayOfWeek).toBe(2);
    });

    it('should preserve location in reminderConfig round-trip', () => {
      const reminders: ReminderConfig[] = [
        {
          id: 'loc-1',
          timeframe: ReminderTimeframe.EVERY_DAY,
          time: '10:00',
          location: 'Office',
          hasAlarm: true,
        },
      ];
      const back = convertRemindersToBackend(reminders);
      expect(back.reminderConfig).toBeDefined();
      expect(Array.isArray(back.reminderConfig)).toBe(true);
      expect(back.reminderConfig![0].location).toBe('Office');
      const restored = convertBackendToReminders(undefined, null, null, back.reminderConfig);
      expect(restored).toHaveLength(1);
      expect(restored[0].location).toBe('Office');
    });
  });

  describe('formatReminderDisplay', () => {
    it('should format daysBefore reminder', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '09:00',
        daysBefore: 7,
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('7 days before due date at 09:00');
    });

    it('should format single day before reminder', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '10:00',
        daysBefore: 1,
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('1 day before due date at 10:00');
    });

    it('should format EVERY_DAY reminder', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_DAY,
        time: '09:00',
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Every day at 09:00');
    });

    it('should format EVERY_WEEK reminder', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_WEEK,
        time: '10:00',
        dayOfWeek: 1, // Monday
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Every Monday at 10:00');
    });

    it('should format SPECIFIC_DATE with CUSTOM_DATE', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '14:30',
        specificDate: ReminderSpecificDate.CUSTOM_DATE,
        customDate: '2026-01-27T00:00:00.000Z',
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toContain('at 14:30');
      expect(result).toContain('1/27/2026');
    });

    it('should format SPECIFIC_DATE with START_OF_WEEK', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '08:00',
        specificDate: ReminderSpecificDate.START_OF_WEEK,
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Every Monday at 08:00');
    });

    it('should format SPECIFIC_DATE with START_OF_MONTH', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '09:00',
        specificDate: ReminderSpecificDate.START_OF_MONTH,
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('1st of every month at 09:00');
    });

    it('should format EVERY_MONTH reminder', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_MONTH,
        time: '10:00',
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('1st of every month at 10:00');
    });

    it('should format EVERY_YEAR reminder', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_YEAR,
        time: '12:00',
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Same date every year at 12:00');
    });

    it('should use default time when time is missing', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_DAY,
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Every day at 09:00');
    });

    it('should use translation function when provided', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_DAY,
        time: '09:00',
      };

      const t = (key: string, options?: { defaultValue?: string; count?: number }) => {
        if (key === 'reminders.everyDay') return 'Jeden Tag';
        if (key === 'reminders.at') return 'um';
        return options?.defaultValue || key;
      };

      const result = formatReminderDisplay(reminder, t);
      expect(result).toBe('Jeden Tag um 09:00');
    });
  });
});
