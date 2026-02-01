import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  DAY_NAMES,
  formatReminderDisplay,
  validateTime,
  validateCustomReminderDate,
  validateDaysBefore,
  normalizeTime,
} from '@tasks-management/frontend-services';
import { isRtlLanguage } from '@tasks-management/frontend-services';

interface ReminderConfigProps {
  reminders: ReminderConfig[];
  onRemindersChange: (reminders: ReminderConfig[]) => void;
  /** Task due date (YYYY-MM-DD) when set; required for "days before due date" reminders. */
  taskDueDate?: string | null;
}

const TIMEFRAMES = [
  { value: ReminderTimeframe.SPECIFIC_DATE, label: 'Specific Date' },
  { value: ReminderTimeframe.EVERY_DAY, label: 'Every Day' },
  { value: ReminderTimeframe.EVERY_WEEK, label: 'Every Week' },
  { value: ReminderTimeframe.EVERY_MONTH, label: 'Every Month' },
  { value: ReminderTimeframe.EVERY_YEAR, label: 'Every Year' },
];

const SPECIFIC_DATES = [
  { value: ReminderSpecificDate.START_OF_WEEK, label: 'Start of Week (Monday)' },
  { value: ReminderSpecificDate.START_OF_MONTH, label: 'Start of Month (1st)' },
  { value: ReminderSpecificDate.START_OF_YEAR, label: 'Start of Year (Jan 1st)' },
  { value: ReminderSpecificDate.CUSTOM_DATE, label: 'Custom Date' },
];

const ReminderConfigComponent = memo(function ReminderConfigComponent({ reminders, onRemindersChange, taskDueDate = null }: ReminderConfigProps) {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const addReminder = useCallback(() => {
    const newReminder: ReminderConfig = {
      id: Date.now().toString(),
      timeframe: ReminderTimeframe.SPECIFIC_DATE,
      time: '09:00',
      specificDate: ReminderSpecificDate.CUSTOM_DATE,
    };
    setEditingReminder(newReminder);
    setShowEditor(true);
  }, []);

  const saveReminder = useCallback((reminder: ReminderConfig) => {
    // Save the editing reminder ID before closing modal
    const editingId = editingReminder?.id;

    // Close modal immediately for better UX
    setEditingReminder(null);
    setShowEditor(false);

    // Update reminders in background
    if (editingId) {
      const existingIndex = reminders.findIndex((r) => r.id === editingId);
      if (existingIndex >= 0) {
        // Update existing reminder
        const updated = reminders.map((r) =>
          r.id === editingId
            ? {
              ...reminder,
              id: reminder.id,
              time: reminder.time || '09:00',
            }
            : r
        );
        onRemindersChange(updated);
      } else {
        // Add new reminder (shouldn't happen, but handle it)
        onRemindersChange([...reminders, reminder]);
      }
    } else {
      // Add new reminder
      onRemindersChange([...reminders, reminder]);
    }
  }, [editingReminder, reminders, onRemindersChange]);

  const removeReminder = useCallback((id: string) => {
    onRemindersChange(reminders.filter((r) => r.id !== id));
  }, [reminders, onRemindersChange]);

  const editReminder = useCallback((reminder: ReminderConfig) => {
    setEditingReminder(reminder);
    setShowEditor(true);
  }, []);

  // Memoize reminder display strings to avoid recalculating on every render
  const reminderDisplays = useMemo(() => {
    return reminders.map(reminder => ({
      id: reminder.id,
      display: formatReminderDisplay(reminder, t, { use24h: true }),
      hasAlarm: reminder.hasAlarm ?? false,
    }));
  }, [reminders, t]);

  const toggleAlarm = useCallback((reminderId: string) => {
    const updated = reminders.map((r) =>
      r.id === reminderId ? { ...r, hasAlarm: !r.hasAlarm } : r
    );
    onRemindersChange(updated);
  }, [reminders, onRemindersChange]);

  const handleCancelEditor = useCallback(() => {
    setEditingReminder(null);
    setShowEditor(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('reminders.title', { defaultValue: 'Reminders' })}
        </h3>
        <button
          onClick={addReminder}
          className="glass-button text-sm font-medium"
        >
          + {t('reminders.add', { defaultValue: 'Add' })}
        </button>
      </div>

      {reminders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('reminders.empty', { defaultValue: 'No reminders set' })}
        </p>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder, index) => {
            const display = reminderDisplays[index];
            return (
              <div
                key={reminder.id}
                className="premium-card p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">
                    {display.display}
                  </span>
                  <button
                    onClick={() => toggleAlarm(reminder.id)}
                    className="text-lg"
                    title={display.hasAlarm ? t('reminders.alarmOn', { defaultValue: 'Alarm on' }) : t('reminders.alarmOff', { defaultValue: 'Alarm off' })}
                  >
                    {display.hasAlarm ? '🔔' : '🔕'}
                  </button>
                </div>
                <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => editReminder(reminder)}
                    className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 rounded-lg"
                  >
                    {t('common.edit', { defaultValue: 'Edit' })}
                  </button>
                  <button
                    onClick={() => removeReminder(reminder.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 rounded-lg"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reminder Editor Modal */}
      {showEditor && editingReminder && (
        <ReminderEditor
          key={editingReminder.id}
          reminder={editingReminder}
          onSave={saveReminder}
          onCancel={handleCancelEditor}
          taskDueDate={taskDueDate ?? null}
        />
      )}
    </div>
  );
});

export default ReminderConfigComponent;

interface ReminderEditorProps {
  reminder: ReminderConfig;
  onSave: (reminder: ReminderConfig) => void;
  onCancel: () => void;
  taskDueDate: string | null;
}

function ReminderEditor({ reminder, onSave, onCancel, taskDueDate }: ReminderEditorProps) {
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
  const [daysBeforeDueDateError, setDaysBeforeDueDateError] = useState<string | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
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
      setTimeError(timeRes.error ?? t('validation.invalidTime', { defaultValue: 'Invalid time.' }));
      return;
    }

    if (config.timeframe === ReminderTimeframe.SPECIFIC_DATE && config.specificDate === ReminderSpecificDate.CUSTOM_DATE) {
      const dateRes = validateCustomReminderDate(customDate);
      if (!dateRes.valid) {
        setCustomDateError(dateRes.error ?? t('validation.invalidDate', { defaultValue: 'Invalid date.' }));
        return;
      }
    }

    if (config.timeframe === ReminderTimeframe.SPECIFIC_DATE && daysBefore.trim()) {
      const dbRes = validateDaysBefore(daysBefore);
      if (!dbRes.valid) {
        setDaysBeforeError(dbRes.error ?? t('validation.invalidDaysBefore', { defaultValue: 'Invalid value.' }));
        return;
      }
      const num = parseInt(daysBefore, 10);
      if (!Number.isNaN(num) && num > 0 && !taskDueDate) {
        setDaysBeforeDueDateError(
          t('validation.daysBeforeRequiresDueDate', {
            defaultValue: 'Set a task due date to use "days before due date" reminders.',
          })
        );
        return;
      }
    }

    const reminderToSave: ReminderConfig = {
      ...config,
      time: normalizeTime(config.time ?? '') ?? '09:00',
      location: location.trim() || undefined,
      daysBefore: daysBefore.trim() ? parseInt(daysBefore, 10) : undefined,
      customDate: customDate.trim() ? new Date(customDate).toISOString() : undefined,
      dayOfWeek: config.timeframe === ReminderTimeframe.EVERY_WEEK && config.dayOfWeek === undefined
        ? 1
        : config.dayOfWeek,
    };

    onSave(reminderToSave);
  };

  // Use portal to render modal at body level, outside any parent containers
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="premium-card max-w-lg w-full max-h-[90vh] shadow-2xl animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className={`flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl z-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <h3 className="premium-header-section text-xl">
            {t('reminders.configure', { defaultValue: 'Configure Reminder' })}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 dark:hover:text-gray-200 text-3xl leading-none font-light w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">

          <div className="space-y-6">
            {/* Timeframe Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                {t('reminders.timeframe', { defaultValue: 'Timeframe' })}:
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
                    className={`px-4 py-3 rounded-xl text-sm font-semibold ${config.timeframe === tf.value
                      ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/30 scale-105'
                      : 'glass-card text-gray-700 dark:text-gray-200'
                      }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Date Options */}
            {config.timeframe === ReminderTimeframe.SPECIFIC_DATE && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  {t('reminders.dateOption', { defaultValue: 'Date Option' })}:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIFIC_DATES.map((sd) => (
                    <button
                      key={sd.value}
                      onClick={() => setConfig({ ...config, specificDate: sd.value })}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold ${config.specificDate === sd.value
                        ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg shadow-primary-500/30 scale-105'
                        : 'glass-card text-gray-700 dark:text-gray-200'
                        }`}
                    >
                      {sd.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Date Input */}
            {config.timeframe === ReminderTimeframe.SPECIFIC_DATE &&
              config.specificDate === ReminderSpecificDate.CUSTOM_DATE && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    {t('reminders.customDate', { defaultValue: 'Custom Date' })}:
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setCustomDateError(null);
                    }}
                    className={`premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${customDateError ? 'border-red-500 dark:border-red-400' : ''}`}
                  />
                  {customDateError && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                      {customDateError}
                    </p>
                  )}
                </div>
              )}

            {/* Days Before Due Date */}
            {config.timeframe === ReminderTimeframe.SPECIFIC_DATE && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  {t('reminders.daysBefore', { defaultValue: 'Days Before Due Date' })}:
                </label>
                <input
                  type="number"
                  min="0"
                  value={daysBefore}
                  onChange={(e) => {
                    setDaysBefore(e.target.value);
                    setDaysBeforeError(null);
                    setDaysBeforeDueDateError(null);
                  }}
                  placeholder="e.g. 0, 1, 7"
                  className={`premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${(daysBeforeError || daysBeforeDueDateError) ? 'border-red-500 dark:border-red-400' : ''}`}
                />
                {(daysBeforeError || daysBeforeDueDateError) && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                    {daysBeforeError ?? daysBeforeDueDateError}
                  </p>
                )}
              </div>
            )}

            {/* Day of Week (for EVERY_WEEK) */}
            {config.timeframe === ReminderTimeframe.EVERY_WEEK && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  {t('reminders.dayOfWeek', { defaultValue: 'Day of Week' })}:
                </label>
                <select
                  value={config.dayOfWeek ?? 1}
                  onChange={(e) =>
                    setConfig({ ...config, dayOfWeek: parseInt(e.target.value, 10) })
                  }
                  className="premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                >
                  {DAY_NAMES.map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Time Input (24-hour format) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                <span>🕐</span>
                {t('reminders.time', { defaultValue: 'Time' })}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(24h)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <select
                    value={(config.time || '09:00').split(':')[0]}
                    onChange={(e) => {
                      const mins = (config.time || '09:00').split(':')[1] || '00';
                      setConfig({ ...config, time: `${e.target.value}:${mins}` });
                      setTimeError(null);
                    }}
                    className={`premium-input w-full text-center text-lg font-mono focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${timeError ? 'border-red-500 dark:border-red-400' : ''}`}
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const val = String(i).padStart(2, '0');
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
                <span className="text-xl font-bold text-gray-400">:</span>
                <div className="flex-1">
                  <select
                    value={(config.time || '09:00').split(':')[1]}
                    onChange={(e) => {
                      const hrs = (config.time || '09:00').split(':')[0] || '09';
                      setConfig({ ...config, time: `${hrs}:${e.target.value}` });
                      setTimeError(null);
                    }}
                    className={`premium-input w-full text-center text-lg font-mono focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${timeError ? 'border-red-500 dark:border-red-400' : ''}`}
                  >
                    {Array.from({ length: 60 }).map((_, i) => {
                      const val = String(i).padStart(2, '0');
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('reminders.time24hHint', { defaultValue: 'Select time in 24-hour format' })}
              </p>
              {timeError && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                  {timeError}
                </p>
              )}
            </div>

            {/* Location (optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                {t('reminders.location', { defaultValue: 'Location' })} <span className="text-gray-500 dark:text-gray-400 font-normal">({t('common.optional', { defaultValue: 'optional' })})</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('reminders.locationPlaceholder', { defaultValue: 'e.g. Office, 123 Main St' })}
                className="premium-input w-full focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Alarm Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasAlarm"
                checked={config.hasAlarm ?? false}
                onChange={(e) => setConfig({ ...config, hasAlarm: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="hasAlarm" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('reminders.enableAlarm', { defaultValue: 'Enable Alarm' })}
              </label>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className={`flex gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onCancel}
            className="flex-1 glass-button"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-glow transition-all"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
