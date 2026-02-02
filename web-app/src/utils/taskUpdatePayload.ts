import type { Task, UpdateTaskDto } from '@tasks-management/frontend-services';
import type { ReminderConfig } from '@tasks-management/frontend-services';
import { convertRemindersToBackend } from '@tasks-management/frontend-services';

/**
 * Build UpdateTaskDto from edit form state. Call after validating description/dueDate.
 */
export function buildTaskUpdatePayload(
  editDescription: string,
  editDueDate: string,
  editReminders: ReminderConfig[],
  task: Task,
): UpdateTaskDto {
  const updateData: UpdateTaskDto = {
    description: editDescription.trim(),
  };

  if (editDueDate.trim()) {
    updateData.dueDate = new Date(editDueDate).toISOString();
  } else {
    updateData.dueDate = null;
  }

  const dueDateForConversion =
    updateData.dueDate ?? task.dueDate ?? undefined;
  const reminderData = convertRemindersToBackend(
    editReminders,
    dueDateForConversion,
  );

  updateData.reminderDaysBefore = reminderData.reminderDaysBefore ?? [];
  updateData.specificDayOfWeek =
    reminderData.specificDayOfWeek !== undefined
      ? reminderData.specificDayOfWeek
      : null;
  updateData.reminderConfig = reminderData.reminderConfig ?? null;

  return updateData;
}
