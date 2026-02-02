import type { ReminderConfig } from '@tasks-management/frontend-services';
import ReminderConfigComponent from './ReminderConfig';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@tasks-management/frontend-services';

interface TaskEditFormProps {
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
  editDueDate: string;
  onEditDueDateChange: (value: string) => void;
  editReminders: ReminderConfig[];
  onRemindersChange: (reminders: ReminderConfig[]) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function TaskEditForm({
  editDescription,
  onEditDescriptionChange,
  editDueDate,
  onEditDueDateChange,
  editReminders,
  onRemindersChange,
  onSave,
  onCancel,
  isSaving,
}: TaskEditFormProps) {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);

  return (
    <div className="premium-card p-6 mb-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
          {t('taskDetails.form.descriptionLabel')}
        </label>
        <input
          type="text"
          value={editDescription}
          onChange={(e) => onEditDescriptionChange(e.target.value)}
          className="premium-input w-full"
          placeholder={t('taskDetails.form.descriptionPlaceholder')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
          {t('taskDetails.dueDate', { defaultValue: 'Due Date' })}
        </label>
        <input
          type="date"
          value={editDueDate}
          onChange={(e) => onEditDueDateChange(e.target.value)}
          className="premium-input w-full"
        />
      </div>

      <ReminderConfigComponent
        reminders={editReminders}
        onRemindersChange={onRemindersChange}
        taskDueDate={editDueDate.trim() ? editDueDate : null}
      />

      <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>

        <button
          onClick={onSave}
          disabled={isSaving || !editDescription.trim()}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? t('common.loading') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
