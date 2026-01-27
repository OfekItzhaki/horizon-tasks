import { Task } from '@tasks-management/frontend-services';
import { isRtlLanguage } from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';
import {
  ReminderTimeframe,
  convertBackendToReminders,
  formatReminderDisplay,
} from '@tasks-management/frontend-services';

interface ReminderDisplayProps {
  task: Task;
}

export default function ReminderDisplay({ task }: ReminderDisplayProps) {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);

  // Convert all reminders (including reminderConfig)
  const reminders = convertBackendToReminders(
    task.reminderDaysBefore,
    task.specificDayOfWeek,
    task.dueDate || null,
    task.reminderConfig,
  );

  // Debug logging
  if (import.meta.env.DEV) {
    console.log('🔍 View Mode - Task Reminder Data:', {
      taskId: task.id,
      taskDescription: task.description,
      reminderDaysBefore: task.reminderDaysBefore,
      specificDayOfWeek: task.specificDayOfWeek,
      dueDate: task.dueDate,
      reminderConfig: task.reminderConfig,
      reminderConfigType: typeof task.reminderConfig,
      reminderConfigIsArray: Array.isArray(task.reminderConfig),
      reminderConfigStringified: JSON.stringify(task.reminderConfig),
      convertedRemindersCount: reminders.length,
      convertedReminders: reminders,
    });
  }

  // Show reminders section if there are any reminders
  if (reminders.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="premium-header-section text-lg mb-4">
        {t('reminders.title', { defaultValue: 'Reminders' })}
      </h3>
      <div className="space-y-3">
        {reminders.map((reminder, idx) => {
          const timeStr = reminder.time || '09:00';
          const displayText = formatReminderDisplay(reminder, t);
          
          return (
            <div 
              key={reminder.id || idx} 
              className="premium-card p-4 hover:shadow-lg transition-shadow"
            >
              <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span className="text-xl flex-shrink-0">
                  {reminder.hasAlarm ? '🔔' : '⏰'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {displayText}
                  </div>
                  
                  {/* Additional information */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span>🕐</span>
                      <span>{timeStr}</span>
                    </span>
                    
                    {reminder.hasAlarm && (
                      <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                        <span>🔔</span>
                        <span>{t('reminders.alarmOn', { defaultValue: 'Alarm enabled' })}</span>
                      </span>
                    )}

                    {reminder.location && (
                      <span className="flex items-center gap-1" title={reminder.location}>
                        <span>📍</span>
                        <span className="truncate max-w-[180px]">{reminder.location}</span>
                      </span>
                    )}
                    
                    {reminder.daysBefore !== undefined && reminder.daysBefore > 0 && task.dueDate && (
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        <span>
                          {(() => {
                            const due = new Date(task.dueDate);
                            const reminderDate = new Date(due);
                            reminderDate.setDate(reminderDate.getDate() - reminder.daysBefore);
                            return reminderDate.toLocaleDateString();
                          })()}
                        </span>
                      </span>
                    )}
                    
                    {reminder.timeframe === ReminderTimeframe.EVERY_DAY && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span>🔄</span>
                        <span>{t('reminders.recurring', { defaultValue: 'Recurring' })}</span>
                      </span>
                    )}
                    
                    {reminder.timeframe === ReminderTimeframe.EVERY_WEEK && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <span>🔄</span>
                        <span>{t('reminders.recurring', { defaultValue: 'Recurring' })}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
