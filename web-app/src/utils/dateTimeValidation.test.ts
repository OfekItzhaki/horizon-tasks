import { describe, it, expect } from 'vitest';
import {
  validateDueDate,
  validateTime,
  validateCustomReminderDate,
  validateDaysBefore,
  normalizeTime,
} from '@tasks-management/frontend-services';

describe('dateTimeValidation', () => {
  describe('validateDueDate', () => {
    it('allows empty string', () => {
      expect(validateDueDate('')).toMatchObject({ valid: true });
      expect(validateDueDate('   ')).toMatchObject({ valid: true });
    });
    it('accepts valid YYYY-MM-DD', () => {
      expect(validateDueDate('2026-01-15')).toMatchObject({ valid: true });
      expect(validateDueDate('2025-12-31')).toMatchObject({ valid: true });
    });
    it('allows past dates', () => {
      expect(validateDueDate('2020-01-01')).toMatchObject({ valid: true });
    });
    it('rejects invalid format', () => {
      expect(validateDueDate('01/15/2026').valid).toBe(false);
      expect(validateDueDate('2026-1-5').valid).toBe(false);
    });
    it('rejects invalid dates', () => {
      expect(validateDueDate('2026-02-30').valid).toBe(false);
      expect(validateDueDate('2026-13-01').valid).toBe(false);
    });
  });

  describe('validateTime', () => {
    it('accepts valid HH:mm', () => {
      expect(validateTime('09:00')).toMatchObject({ valid: true });
      expect(validateTime('23:59')).toMatchObject({ valid: true });
      expect(validateTime('00:00')).toMatchObject({ valid: true });
    });
    it('rejects empty', () => {
      expect(validateTime('').valid).toBe(false);
      expect(validateTime('   ').valid).toBe(false);
    });
    it('rejects invalid format', () => {
      expect(validateTime('25:00').valid).toBe(false);
      expect(validateTime('12:60').valid).toBe(false);
    });
  });

  describe('validateCustomReminderDate', () => {
    it('rejects empty', () => {
      expect(validateCustomReminderDate('').valid).toBe(false);
    });
    it('rejects past dates', () => {
      expect(validateCustomReminderDate('2020-01-01').valid).toBe(false);
    });
    it('accepts today and future', () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(validateCustomReminderDate(today)).toMatchObject({ valid: true });
      expect(validateCustomReminderDate('2030-12-31')).toMatchObject({ valid: true });
    });
  });

  describe('validateDaysBefore', () => {
    it('allows empty', () => {
      expect(validateDaysBefore('')).toMatchObject({ valid: true });
    });
    it('accepts non-negative integers', () => {
      expect(validateDaysBefore('0')).toMatchObject({ valid: true });
      expect(validateDaysBefore('1')).toMatchObject({ valid: true });
      expect(validateDaysBefore('7')).toMatchObject({ valid: true });
    });
    it('rejects negative', () => {
      expect(validateDaysBefore('-1').valid).toBe(false);
    });
    it('rejects non-integers', () => {
      expect(validateDaysBefore('1.5').valid).toBe(false);
      expect(validateDaysBefore('abc').valid).toBe(false);
    });
  });

  describe('normalizeTime', () => {
    it('returns HH:mm for valid input', () => {
      expect(normalizeTime('09:00')).toBe('09:00');
      expect(normalizeTime('9:05')).toBe('09:05');
    });
    it('returns undefined for invalid', () => {
      expect(normalizeTime('25:00')).toBeUndefined();
      expect(normalizeTime('')).toBeUndefined();
    });
  });
});
