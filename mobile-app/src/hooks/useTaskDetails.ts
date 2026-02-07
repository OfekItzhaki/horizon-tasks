import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import { Task, Step, UpdateTaskDto } from '../types';
import {
    type ReminderConfig,
    ReminderTimeframe,
    convertBackendToReminders,
    convertRemindersToBackend,
} from '@tasks-management/frontend-services';
import { scheduleTaskReminders, cancelAllTaskNotifications } from '../services/notifications.service';
import { ReminderTimesStorage } from '../utils/storage';
import { handleApiError, isAuthError, showErrorAlert } from '../utils/errorHandler';

export function useTaskDetails(taskId: number) {
    const [task, setTask] = useState<Task | null>(null);
    const [steps, setSteps] = useState<Step[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reminderAlarmStates, setReminderAlarmStates] = useState<Record<string, boolean>>({});

    // Edit form state
    const [editDescription, setEditDescription] = useState('');
    const [editDueDate, setEditDueDate] = useState('');
    const [editReminders, setEditReminders] = useState<ReminderConfig[]>([]);

    const loadTaskData = useCallback(async () => {
        try {
            const [taskData, stepsData] = await Promise.all([
                tasksService.getById(taskId),
                stepsService.getByTask(taskId),
            ]);

            setTask(taskData);
            setSteps(stepsData);

            // Initialize edit form
            setEditDescription(taskData.description);
            setEditDueDate(taskData.dueDate ? taskData.dueDate.split('T')[0] : '');
            const convertedReminders = convertBackendToReminders(
                taskData.reminderDaysBefore,
                taskData.specificDayOfWeek,
                taskData.dueDate || undefined,
                taskData.reminderConfig,
            ) as ReminderConfig[];

            setEditReminders(convertedReminders);

            // Update local alarm states
            const alarmStates: Record<string, boolean> = {};
            convertedReminders.forEach(r => {
                alarmStates[r.id] = r.hasAlarm || false;
            });
            setReminderAlarmStates(alarmStates);
        } catch (error: unknown) {
            if (!isAuthError(error)) {
                handleApiError(error, 'Unable to load task. Please try again.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [taskId]);

    useEffect(() => {
        loadTaskData();
    }, [loadTaskData]);

    const handleToggleTask = async () => {
        if (!task) return;
        const currentCompleted = Boolean(task.completed);
        const newCompleted = !currentCompleted;
        setTask(prev => prev ? { ...prev, completed: newCompleted } : prev);
        try {
            await tasksService.update(taskId, { completed: newCompleted });
        } catch (error: unknown) {
            setTask(prev => prev ? { ...prev, completed: currentCompleted } : prev);
            handleApiError(error, 'Unable to toggle task completion.');
        }
    };

    const handleSaveEdit = async () => {
        if (!editDescription.trim()) {
            showErrorAlert('Validation Error', null, 'Please enter a task description.');
            return;
        }

        setIsSubmitting(true);
        try {
            const updateData: UpdateTaskDto = { description: editDescription.trim() };
            let dueDateStr: string | undefined;

            if (editDueDate.trim()) {
                const date = new Date(editDueDate);
                if (!isNaN(date.getTime())) {
                    dueDateStr = date.toISOString();
                    updateData.dueDate = dueDateStr;
                }
            } else {
                updateData.dueDate = null;
            }

            const dueDateForConversion = dueDateStr || (task?.dueDate || undefined);
            const reminderData = convertRemindersToBackend(editReminders, dueDateForConversion);

            updateData.reminderDaysBefore = reminderData.reminderDaysBefore || [];
            updateData.specificDayOfWeek = reminderData.specificDayOfWeek !== undefined ? reminderData.specificDayOfWeek : null;
            updateData.reminderConfig = reminderData.reminderConfig || null;

            const updatedTask = await tasksService.update(taskId, updateData);

            // Store reminder times
            const reminderTimes: Record<string, string> = {};
            editReminders.forEach(reminder => {
                if (reminder.time) {
                    let normalizedId = reminder.id;
                    if (reminder.daysBefore !== undefined && reminder.daysBefore > 0) {
                        normalizedId = `days-before-${reminder.daysBefore}`;
                    } else if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
                        normalizedId = `day-of-week-${reminder.dayOfWeek}`;
                    }
                    reminderTimes[normalizedId] = reminder.time;
                }
            });

            if (Object.keys(reminderTimes).length > 0) {
                await ReminderTimesStorage.setTimesForTask(taskId, reminderTimes);
            } else {
                await ReminderTimesStorage.removeTimesForTask(taskId);
            }

            if (editReminders.length > 0) {
                await scheduleTaskReminders(taskId, updatedTask.description, editReminders, dueDateStr || null);
            } else {
                await cancelAllTaskNotifications(taskId);
            }

            setIsEditing(false);
            loadTaskData();
        } catch (error: unknown) {
            handleApiError(error, 'Unable to update task.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStep = async (step: Step) => {
        const currentCompleted = Boolean(step.completed);
        const newCompleted = !currentCompleted;
        setSteps(prev => prev.map(s => s.id === step.id ? { ...s, completed: newCompleted } : s));
        try {
            await stepsService.update(step.id, { completed: newCompleted });
        } catch (error: unknown) {
            setSteps(prev => prev.map(s => s.id === step.id ? { ...s, completed: currentCompleted } : s));
            handleApiError(error, 'Unable to update step.');
        }
    };

    const handleAddStep = async (description: string) => {
        try {
            await stepsService.create(taskId, { description: description.trim() });
            loadTaskData();
            return true;
        } catch (error: unknown) {
            handleApiError(error, 'Unable to add step.');
            return false;
        }
    };

    const handleDeleteStep = async (stepId: number) => {
        try {
            await stepsService.delete(stepId);
            loadTaskData();
        } catch (error: unknown) {
            handleApiError(error, 'Unable to delete step.');
        }
    };

    const updateStep = async (stepId: number, description: string) => {
        try {
            await stepsService.update(stepId, { description: description.trim() });
            loadTaskData();
            return true;
        } catch (error: unknown) {
            handleApiError(error, 'Unable to update step.');
            return false;
        }
    };

    return {
        task,
        steps,
        loading,
        refreshing,
        isEditing,
        isSubmitting,
        editDescription,
        editDueDate,
        editReminders,
        reminderAlarmStates,
        setEditDescription,
        setEditDueDate,
        setEditReminders,
        setIsEditing,
        onRefresh: () => { setRefreshing(true); loadTaskData(); },
        handleToggleTask,
        handleSaveEdit,
        handleCancelEdit: () => {
            if (task) {
                setEditDescription(task.description);
                setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
                setEditReminders(convertBackendToReminders(task.reminderDaysBefore, task.specificDayOfWeek, task.dueDate || undefined) as ReminderConfig[]);
            }
            setIsEditing(false);
        },
        handleToggleStep,
        handleAddStep,
        handleDeleteStep,
        updateStep,
        handleToggleReminderAlarm: async (reminderId: string) => {
            if (!task) return;
            try {
                const currentAlarm = !!reminderAlarmStates[reminderId];
                const nextAlarm = !currentAlarm;

                const nextAlarmStates = { ...reminderAlarmStates, [reminderId]: nextAlarm };
                setReminderAlarmStates(nextAlarmStates);

                const nextReminders = editReminders.map(r => r.id === reminderId ? { ...r, hasAlarm: nextAlarm } : r);
                setEditReminders(nextReminders);

                const allReminders = convertBackendToReminders(
                    task.reminderDaysBefore,
                    task.specificDayOfWeek,
                    task.dueDate || undefined,
                    task.reminderConfig,
                ) as ReminderConfig[];

                const updatedReminders = allReminders.map(r => ({
                    ...r,
                    hasAlarm: nextAlarmStates[r.id] ?? false
                }));

                await scheduleTaskReminders(taskId, task.description, updatedReminders, task.dueDate || null);
                const reminderData = convertRemindersToBackend(updatedReminders, task.dueDate || undefined);

                await tasksService.update(taskId, {
                    reminderConfig: reminderData.reminderConfig || null,
                    reminderDaysBefore: reminderData.reminderDaysBefore || [],
                    specificDayOfWeek: reminderData.specificDayOfWeek ?? null,
                });

                setTask(prev => prev ? { ...prev, ...reminderData } : prev);
            } catch (error: unknown) {
                handleApiError(error, 'Unable to update alarm.');
                loadTaskData();
            }
        }
    };
}
