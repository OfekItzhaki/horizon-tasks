import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  DAY_NAMES,
  validateTime,
  validateCustomReminderDate,
  validateDaysBefore,
  normalizeTime,
  isRtlLanguage,
} from '@tasks-management/frontend-services';
import { TIMEFRAMES, SPECIFIC_DATES } from '../config/reminder-options';

interface ReminderEditorProps {
  reminder: ReminderConfig;
  onSave: (reminder: ReminderConfig) => void;
  onCancel: () => void;
  taskDueDate: string | null;
}

export default function ReminderEditor({
  reminder,
  onSave,
  onCancel,
  taskDueDate,
}: ReminderEditorProps) {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const initialCustomDate = useMemo(() => {
    const raw = reminder.customDate ? reminder.customDate.split('T')[0] : '';
    if (!raw) return '';
    const d = new Date(raw);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today ? todayStr : raw;
  }, [reminder.customDate, todayStr]);

  const [config, setConfig] = useState<ReminderConfig>({
    ...reminder,
    time: reminder.time || '09:00',
  });
  const [location, setLocation] = useState<string>(reminder.location ?? '');
  const [daysBefore, setDaysBefore] = useState<string>(
    reminder.daysBefore?.toString() ?? ''
  );
  const [customDate, setCustomDate] = useState<string>(initialCustomDate);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [customDateError, setCustomDateError] = useState<string | null>(null);
  const [daysBeforeError, setDaysBeforeError] = useState<string | null>(null);
  const [daysBeforeDueDateError, setDaysBeforeDueDateError] = useState<
    string | null
  >(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const handleSave = () => {
    setTimeError(null);
    setCustomDateError(null);
    setDaysBeforeError(null);
    setDaysBeforeDueDateError(null);

    const timeRes = validateTime(config.time ?? '');
    if (!timeRes.valid) {
      setTimeError(timeRes.error ?? t('validation.invalidTime'));
      return;
    }

    if (
      config.timeframe === ReminderTimeframe.SPECIFIC_DATE &&
      config.specificDate === ReminderSpecificDate.CUSTOM_DATE
    ) {
      const dateRes = validateCustomReminderDate(customDate);
      if (!dateRes.valid) {
        setCustomDateError(dateRes.error ?? t('validation.invalidDate'));
        return;
      }
    }

    if (
      config.timeframe === ReminderTimeframe.SPECIFIC_DATE &&
      daysBefore.trim()
    ) {
      const dbRes = validateDaysBefore(daysBefore);
      if (!dbRes.valid) {
        setDaysBeforeError(dbRes.error ?? t('validation.invalidDaysBefore'));
        return;
      }
      const num = parseInt(daysBefore, 10);
      if (!Number.isNaN(num) && num > 0 && !taskDueDate) {
        setDaysBeforeDueDateError(t('validation.daysBeforeRequiresDueDate'));
        return;
      }
    }

    const reminderToSave: ReminderConfig = {
      ...config,
      time: normalizeTime(config.time ?? '') ?? '09:00',
      location: location.trim() || undefined,
      daysBefore: daysBefore.trim() ? parseInt(daysBefore, 10) : undefined,
      customDate: customDate.trim()
        ? new Date(customDate).toISOString()
        : undefined,
      dayOfWeek:
        config.timeframe === ReminderTimeframe.EVERY_WEEK &&
        config.dayOfWeek === undefined
          ? 1
          : config.dayOfWeek,
    };

    onSave(reminderToSave);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="premium-card max-w-lg w-full max-h-[90vh] shadow-2xl animate-scale-in flex flex-col border-accent/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 pb-4 border-b border-border-subtle sticky top-0 bg-surface/80 backdrop-blur-md z-10 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-primary">
              {t('reminders.configure', { defaultValue: 'Configure Reminder' })}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-tertiary hover:text-primary p-2 rounded-lg hover:bg-hover transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Frequency Selection */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-tertiary">
              {t('reminders.frequency', { defaultValue: 'Frequency' })}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() =>
                    setConfig({
                      ...config,
                      timeframe: tf.value,
                      specificDate:
                        tf.value === ReminderTimeframe.SPECIFIC_DATE
                          ? ReminderSpecificDate.CUSTOM_DATE
                          : undefined,
                    })
                  }
                  className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${config.timeframe === tf.value ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'bg-surface border-border-subtle text-secondary hover:border-accent/30 hover:bg-hover'}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {config.timeframe === ReminderTimeframe.SPECIFIC_DATE && (
            <div className="space-y-6 animate-fade-in">
              {/* Specific Date Option */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-tertiary">
                  {t('reminders.dateOption', { defaultValue: 'Interval' })}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIFIC_DATES.map((sd) => (
                    <button
                      key={sd.value}
                      onClick={() =>
                        setConfig({ ...config, specificDate: sd.value })
                      }
                      className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${config.specificDate === sd.value ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'bg-surface border-border-subtle text-secondary hover:border-accent/30 hover:bg-hover'}`}
                    >
                      {sd.label}
                    </button>
                  ))}
                </div>
              </div>

              {config.specificDate === ReminderSpecificDate.CUSTOM_DATE && (
                <div className="space-y-3 animate-slide-up">
                  <label className="block text-xs font-bold uppercase tracking-wider text-tertiary">
                    {t('reminders.customDate', { defaultValue: 'Choose Date' })}
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    min={todayStr}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setCustomDateError(null);
                    }}
                    className={`premium-input w-full ${customDateError ? 'border-accent-danger ring-1 ring-accent-danger/20' : ''}`}
                  />
                  {customDateError && (
                    <p className="text-xs text-accent-danger font-medium flex items-center gap-1">
                      <span className="text-lg">⚠</span> {customDateError}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-tertiary">
                  {t('reminders.daysBefore', {
                    defaultValue: 'Advance Warning (Days)',
                  })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={daysBefore}
                    onChange={(e) => {
                      setDaysBefore(e.target.value);
                      setDaysBeforeError(null);
                      setDaysBeforeDueDateError(null);
                    }}
                    placeholder="0"
                    className={`premium-input w-full pr-12 ${daysBeforeError || daysBeforeDueDateError ? 'border-accent-danger ring-1 ring-accent-danger/20' : ''}`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-tertiary font-semibold text-sm">
                    {t('common.days', { defaultValue: 'days' })}
                  </div>
                </div>
                {(daysBeforeError || daysBeforeDueDateError) && (
                  <p className="text-xs text-accent-danger font-medium flex items-center gap-1">
                    <span className="text-lg">⚠</span>{' '}
                    {daysBeforeError ?? daysBeforeDueDateError}
                  </p>
                )}
              </div>
            </div>
          )}

          {config.timeframe === ReminderTimeframe.EVERY_WEEK && (
            <div className="space-y-3 animate-fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-tertiary">
                {t('reminders.dayOfWeek', { defaultValue: 'Day of the Week' })}
              </label>
              <select
                value={config.dayOfWeek ?? 1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    dayOfWeek: parseInt(e.target.value, 10),
                  })
                }
                className="premium-input w-full cursor-pointer hover:border-accent/50"
              >
                {DAY_NAMES.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Picker */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-tertiary flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('reminders.time', { defaultValue: 'Scheduled Time' })}
            </label>
            <div className="flex items-center gap-4 bg-hover/50 p-4 rounded-2xl border border-border-subtle">
              <div className="flex-1 space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-tertiary text-center">
                  HH
                </span>
                <select
                  value={(config.time || '09:00').split(':')[0]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      time: `${e.target.value}:${(config.time || '09:00').split(':')[1] || '00'}`,
                    })
                  }
                  className="w-full bg-surface border border-border-strong rounded-xl py-3 text-center text-xl font-bold text-primary focus:ring-2 focus:ring-accent/20 outline-none appearance-none cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-3xl font-black text-border-strong leading-none pt-4">
                :
              </span>
              <div className="flex-1 space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-widest text-tertiary text-center">
                  MM
                </span>
                <select
                  value={(config.time || '09:00').split(':')[1]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      time: `${(config.time || '09:00').split(':')[0] || '09'}:${e.target.value}`,
                    })
                  }
                  className="w-full bg-surface border border-border-strong rounded-xl py-3 text-center text-xl font-bold text-primary focus:ring-2 focus:ring-accent/20 outline-none appearance-none cursor-pointer"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {timeError && (
              <p className="text-xs text-accent-danger font-medium flex items-center gap-1">
                <span className="text-lg">⚠</span> {timeError}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-tertiary flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {t('reminders.location', { defaultValue: 'Location' })}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('reminders.locationPlaceholder', {
                defaultValue: 'Enter place or address...',
              })}
              className="premium-input w-full"
            />
          </div>

          {/* Alarm Toggle */}
          <div className="flex items-center justify-between p-5 bg-accent/5 rounded-2xl border border-accent/10">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${config.hasAlarm ? 'bg-accent text-white shadow-glow-sm' : 'bg-tertiary/10 text-tertiary'}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-primary text-sm">
                  {t('reminders.enableAlarm', {
                    defaultValue: 'Push Notification Alarm',
                  })}
                </p>
                <p className="text-[11px] text-secondary font-medium">
                  {t('reminders.alarmDesc', {
                    defaultValue:
                      'Trigger a strong alert at the scheduled time',
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig({ ...config, hasAlarm: !config.hasAlarm })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent ${config.hasAlarm ? 'bg-accent' : 'bg-tertiary/30'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.hasAlarm ? (isRtl ? '-translate-x-6' : 'translate-x-6') : isRtl ? '-translate-x-1' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>

        <div
          className={`flex gap-3 p-6 pt-4 border-t border-border-subtle sticky bottom-0 bg-surface/80 backdrop-blur-md ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-border-strong text-secondary font-bold text-sm hover:bg-hover transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-accent text-white font-bold text-sm rounded-xl hover:shadow-glow transition-all active:scale-95"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
