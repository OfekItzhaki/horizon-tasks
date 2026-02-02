import { useState, memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  formatReminderDisplay,
  isRtlLanguage,
} from '@tasks-management/frontend-services';
import ReminderEditor from './ReminderEditor';

interface ReminderConfigProps {
  reminders: ReminderConfig[];
  onRemindersChange: (reminders: ReminderConfig[]) => void;
  taskDueDate?: string | null;
}

const ReminderConfigComponent = memo(function ReminderConfigComponent({
  reminders,
  onRemindersChange,
  taskDueDate = null
}: ReminderConfigProps) {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const [showEditor, setShowEditor] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);

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
    setShowEditor(false);
    setEditingReminder(null);
    const exists = reminders.find((r) => r.id === reminder.id);
    const updated = exists
      ? reminders.map((r) => (r.id === reminder.id ? reminder : r))
      : [...reminders, reminder];
    onRemindersChange(updated);
  }, [reminders, onRemindersChange]);

  const removeReminder = useCallback((id: string) => {
    onRemindersChange(reminders.filter((r) => r.id !== id));
  }, [reminders, onRemindersChange]);

  const reminderDisplays = useMemo(() => {
    return reminders.map(reminder => ({
      id: reminder.id,
      display: formatReminderDisplay(reminder, t, { use24h: true }),
      hasAlarm: reminder.hasAlarm ?? false,
    }));
  }, [reminders, t]);

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('reminders.title', { defaultValue: 'Reminders' })}
        </h3>
        <button
          type="button"
          onClick={addReminder}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-md text-white bg-primary-600 hover:bg-primary-700 transition-all font-inter"
        >
          + {t('reminders.add', { defaultValue: 'Add Reminder' })}
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
                  {display.hasAlarm && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                      🔔 {t('reminders.alarm', { defaultValue: 'Alarm' })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingReminder(reminder); setShowEditor(true); }}
                    className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeReminder(reminder.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && editingReminder && (
        <ReminderEditor
          reminder={editingReminder}
          onSave={saveReminder}
          onCancel={() => { setShowEditor(false); setEditingReminder(null); }}
          taskDueDate={taskDueDate}
        />
      )}
    </div>
  );
});

export default ReminderConfigComponent;
