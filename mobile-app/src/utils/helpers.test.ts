import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  type ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  formatReminderDisplay,
  convertRemindersToBackend,
  convertBackendToReminders,
  DAY_NAMES,
} from '@tasks-management/frontend-services';
import { formatDate } from './helpers';

describe('helpers', () => {
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

    it('should format EVERY_WEEK reminder with default day when dayOfWeek is undefined', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.EVERY_WEEK,
        time: '08:00',
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Every Monday at 08:00');
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

    it('should format SPECIFIC_DATE with START_OF_YEAR', () => {
      const reminder: ReminderConfig = {
        id: 'test',
        timeframe: ReminderTimeframe.SPECIFIC_DATE,
        time: '12:00',
        specificDate: ReminderSpecificDate.START_OF_YEAR,
      };

      const result = formatReminderDisplay(reminder);
      expect(result).toBe('Jan 1st every year at 12:00');
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

      // Custom date reminders should be in reminderConfig
      expect(result.reminderConfig).toBeDefined();
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

      expect(result.reminderConfig).toBeDefined();
      expect(result.reminderDaysBefore).toEqual([7]);
      expect(result.specificDayOfWeek).toBe(2);
    });

  });

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
      expect(result.some((r) => r.id === 'every-day')).toBe(true);
      expect(result.some((r) => r.id === 'days-before-1')).toBe(true);
      expect(result.some((r) => r.id === 'day-of-week-1')).toBe(true);
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      // Mock current date to ensure consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Today" for today\'s date', () => {
      const today = new Date('2026-01-26T12:00:00.000Z').toISOString();
      const result = formatDate(today);
      expect(result).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow\'s date', () => {
      const tomorrow = new Date('2026-01-27T12:00:00.000Z').toISOString();
      const result = formatDate(tomorrow);
      expect(result).toBe('Tomorrow');
    });

    it('should return formatted date for future dates', () => {
      const futureDate = new Date('2026-02-15T12:00:00.000Z').toISOString();
      const result = formatDate(futureDate);
      expect(result).toContain('Feb');
      expect(result).toContain('15');
    });

    it('should include year for dates in different year', () => {
      jest.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));
      const nextYear = new Date('2027-01-15T12:00:00.000Z').toISOString();
      const result = formatDate(nextYear);
      expect(result).toContain('2027');
    });

    it('should not include year for dates in same year', () => {
      jest.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));
      const sameYear = new Date('2026-12-25T12:00:00.000Z').toISOString();
      const result = formatDate(sameYear);
      expect(result).not.toContain('2026');
    });
  });

  describe('DAY_NAMES', () => {
    it('should contain all 7 days of the week', () => {
      expect(DAY_NAMES).toHaveLength(7);
      expect(DAY_NAMES).toEqual([
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]);
    });
  });
});
