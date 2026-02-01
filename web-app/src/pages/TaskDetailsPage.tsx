import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueuedMutation } from '../hooks/useQueuedMutation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasks.service';
import FloatingActionButton from '../components/FloatingActionButton';
import Skeleton from '../components/Skeleton';
import ReminderDisplay from '../components/ReminderDisplay';
import TaskEditForm from '../components/TaskEditForm';
import StepsList from '../components/StepsList';
import { useStepManagement } from '../hooks/useStepManagement';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { isRtlLanguage } from '@tasks-management/frontend-services';
import {
  Task,
  ApiError,
  UpdateTaskDto,
  ListType,
} from '@tasks-management/frontend-services';
import { handleApiError, extractErrorMessage } from '../utils/errorHandler';
import {
  type ReminderConfig,
  convertBackendToReminders,
} from '@tasks-management/frontend-services';
import { taskFormSchema } from '../validation/schemas';
import { getCachedTaskById } from '../utils/taskCache';
import { buildTaskUpdatePayload } from '../utils/taskUpdatePayload';
import {
  scheduleTaskReminders,
  cancelAllTaskNotifications,
} from '../services/notifications.service';

export default function TaskDetailsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const { taskId } = useParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const numericTaskId = taskId ? Number(taskId) : null;
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskDescriptionDraft, setTaskDescriptionDraft] = useState('');
  const stepInputRef = useRef<HTMLInputElement>(null);

  // Full edit mode state (for description, due date, reminders)
  const [isFullEditMode, setIsFullEditMode] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editReminders, setEditReminders] = useState<ReminderConfig[]>([]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'Escape',
      handler: () => {
        if (isEditingTask) {
          setIsEditingTask(false);
          setTaskDescriptionDraft(task?.description ?? '');
        } else if (stepManagement.editingStepId !== null) {
          stepManagement.setEditingStepId(null);
          stepManagement.setStepDescriptionDraft('');
        } else if (stepManagement.showAddStep) {
          stepManagement.setShowAddStep(false);
          stepManagement.setNewStepDescription('');
        }
      },
      description: 'Cancel editing',
    },
    {
      key: 's',
      handler: () => {
        if (!stepManagement.showAddStep && task) {
          stepManagement.setShowAddStep(true);
        }
      },
      description: 'Add new step',
    },
  ]);

  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Task, ApiError>({
    queryKey: ['task', numericTaskId],
    enabled: typeof numericTaskId === 'number' && !Number.isNaN(numericTaskId),
    initialData: () => getCachedTaskById(queryClient, numericTaskId),
    queryFn: () => tasksService.getTaskById(numericTaskId as number),
  });

  // Step management hook (initialized after task is loaded)
  const stepManagement = useStepManagement(task);

  // Removed initialReminders - it was causing dependency issues and not being used

  useEffect(() => {
    if (task) {
      // Always sync task description draft
      setTaskDescriptionDraft(task.description);

      // Only update edit form when not in edit mode to avoid overwriting user changes
      if (!isFullEditMode) {
        setEditDescription(task.description);
        setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
        const convertedReminders = convertBackendToReminders(
          task.reminderDaysBefore,
          task.specificDayOfWeek,
          task.dueDate || null,
          task.reminderConfig,
        );
        setEditReminders(convertedReminders);
      }
    }
  }, [task, isFullEditMode]);

  // Auto-focus step input when showAddStep becomes true
  useEffect(() => {
    if (stepManagement.showAddStep && stepInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        stepInputRef.current?.focus();
      }, 0);
    }
  }, [stepManagement.showAddStep]);



  const updateTaskMutation = useQueuedMutation<
    Task,
    ApiError,
    { id: number; data: UpdateTaskDto },
    { previousTask?: Task; previousTasks?: Task[]; todoListId?: number }
  >({
    mutationFn: ({ id, data }) =>
      tasksService.updateTask(id, data),
    onMutate: ({ id, data }) => {
      // Cancel only to prevent race conditions, but don't block
      // Removed cancelQueries to allow parallel mutations

      const previousTask = queryClient.getQueryData<Task>(['task', id]);
      const todoListId = previousTask?.todoListId;

      const previousTasks =
        typeof todoListId === 'number'
          ? queryClient.getQueryData<Task[]>(['tasks', todoListId])
          : undefined;

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', id], {
          ...previousTask,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      if (typeof todoListId === 'number' && previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks', todoListId], (old = []) =>
          old.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString() }
              : t,
          ),
        );
      }

      return { previousTask, previousTasks, todoListId };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.id], ctx.previousTask);
      }
      if (typeof ctx?.todoListId === 'number' && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', ctx.todoListId], ctx.previousTasks);
      }
      handleApiError(err, t('taskDetails.updateTaskFailed', { defaultValue: 'Failed to update task. Please try again.' }));
    },
    onSettled: (_data, _err, vars) => {
      // Non-blocking invalidations - don't await
      queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
      const current = queryClient.getQueryData<Task>(['task', vars.id]);
      if (current?.todoListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', current.todoListId] });
      }
    },
  });


  const safeTaskId =
    typeof numericTaskId === 'number' && !Number.isNaN(numericTaskId)
      ? numericTaskId
      : null;

  // Optimized handlers to prevent unnecessary re-renders
  const handleRemindersChange = useCallback((newReminders: ReminderConfig[]) => {
    // Only update local state - no auto-save to keep UI responsive
    // Reminders will be saved when user clicks "Save" button
    setEditReminders(newReminders);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsFullEditMode(false);
    if (task) {
      setEditDescription(task.description);
      setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      const convertedReminders = convertBackendToReminders(
        task.reminderDaysBefore,
        task.specificDayOfWeek,
        task.dueDate || null,
        task.reminderConfig,
      );
      setEditReminders(convertedReminders);
    }
  }, [task]);

  const handleSaveTask = useCallback(() => {
    if (!task) return;

    const parsed = taskFormSchema.safeParse({
      description: editDescription,
      dueDate: editDueDate || '',
    });
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = first.description?.[0] ?? first.dueDate?.[0] ?? t('validation.invalidForm', { defaultValue: 'Please fix the errors below.' });
      toast.error(msg);
      return;
    }

    const updateData = buildTaskUpdatePayload(
      editDescription,
      editDueDate,
      editReminders,
      task,
    );

    setIsFullEditMode(false);

    updateTaskMutation.mutate(
      { id: task.id, data: updateData },
      {
        onSuccess: async (updatedTask) => {
          toast.success(t('taskDetails.taskUpdated'));

          // Cancel existing notifications for this task
          cancelAllTaskNotifications(task.id);

          // Schedule new notifications if there are reminders
          if (editReminders.length > 0) {
            await scheduleTaskReminders(
              task.id,
              updatedTask.description,
              editReminders,
              updatedTask.dueDate || null,
            );
          }

          // Update cache immediately with the saved reminder data from server response
          // Use the full updatedTask to ensure all fields (including reminderConfig) are present
          queryClient.setQueryData<Task>(['task', task.id], updatedTask);

          // Also update in tasks list cache if it exists
          queryClient.setQueryData<Task[]>(['tasks', task.todoListId], (old = []) =>
            old.map((t) => (t.id === task.id ? updatedTask : t))
          );

          // Invalidate to trigger refetch in background (non-blocking)
          queryClient.invalidateQueries({ queryKey: ['task', task.id] });
          queryClient.invalidateQueries({ queryKey: ['tasks', task.todoListId] });
        },
        onError: (error) => {
          handleApiError(error, t('taskDetails.updateTaskFailed', { defaultValue: 'Failed to update task. Please try again.' }));
        },
      }
    );
  }, [editDescription, editDueDate, editReminders, task, updateTaskMutation, queryClient, t]);

  const restoreTaskMutation = useQueuedMutation<Task, ApiError, { id: number }>({
    mutationFn: ({ id }) => tasksService.restoreTask(id),
    onError: (err) => {
      handleApiError(err, t('tasks.restoreFailed', { defaultValue: 'Failed to restore task. Please try again.' }));
    },
    onSuccess: (restored) => {
      toast.success(t('tasks.restored'));

      // Non-blocking invalidations - don't await
      if (typeof safeTaskId === 'number') {
        queryClient.invalidateQueries({ queryKey: ['task', safeTaskId] });
      }
      if (typeof restored.todoListId === 'number') {
        queryClient.invalidateQueries({
          queryKey: ['tasks', restored.todoListId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }

      // Navigate to the list the task returned to.
      if (typeof restored.todoListId === 'number') {
        navigate(`/lists/${restored.todoListId}/tasks`);
      } else {
        navigate('/lists');
      }
    },
  });

  const permanentDeleteTaskMutation = useQueuedMutation<Task, ApiError, { id: number }>({
    mutationFn: ({ id }) => tasksService.permanentDeleteTask(id),
    onError: (err) => {
      handleApiError(err, t('tasks.deleteForeverFailed', { defaultValue: 'Failed to permanently delete task. Please try again.' }));
    },
    onSuccess: () => {
      toast.success(t('tasks.deletedForever'));

      // Non-blocking invalidations - don't await
      if (typeof safeTaskId === 'number') {
        queryClient.invalidateQueries({ queryKey: ['task', safeTaskId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      navigate('/lists');
    },
  });

  const handleOpenEdit = useCallback(async () => {
    if (!numericTaskId) return;
    try {
      const freshTask = await queryClient.fetchQuery<Task>({
        queryKey: ['task', numericTaskId],
        queryFn: () => tasksService.getTaskById(numericTaskId),
      });
      setEditDescription(freshTask.description);
      setEditDueDate(freshTask.dueDate ? freshTask.dueDate.split('T')[0] : '');
      const convertedReminders = convertBackendToReminders(
        freshTask.reminderDaysBefore,
        freshTask.specificDayOfWeek,
        freshTask.dueDate || null,
        freshTask.reminderConfig,
      );
      setEditReminders(convertedReminders);
    } catch {
      const latestTask = (queryClient.getQueryData<Task>(['task', numericTaskId]) || task) ?? undefined;
      if (latestTask) {
        setEditDescription(latestTask.description);
        setEditDueDate(latestTask.dueDate ? latestTask.dueDate.split('T')[0] : '');
        const convertedReminders = convertBackendToReminders(
          latestTask.reminderDaysBefore,
          latestTask.specificDayOfWeek,
          latestTask.dueDate || null,
          latestTask.reminderConfig,
        );
        setEditReminders(convertedReminders);
      }
    }
    setIsFullEditMode(true);
  }, [task, queryClient, numericTaskId]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow p-6">
          <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-start justify-between gap-3 mb-4`}>
            <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-7 w-72" />
            </div>
            <Skeleton className="h-9 w-44" />
          </div>
          <Skeleton className="h-4 w-40" />
          <div className="mt-6">
            <Skeleton className="h-6 w-24" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded`}>
                  <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'gap-3'} min-w-0 flex-1`}>
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div className="text-sm text-red-800 dark:text-red-200 mb-3">
          {isError
            ? extractErrorMessage(error, t('taskDetails.loadFailed', { defaultValue: 'Failed to load task. Please try again.' }))
            : t('taskDetails.notFound')}
        </div>
        <div className="flex gap-3">
          {isError && (
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              {t('common.retry') || 'Retry'}
            </button>
          )}
          <Link
            to="/lists"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {t('tasks.backToLists')}
          </Link>
        </div>
      </div>
    );
  }

  const isArchivedTask = task.todoList?.type === ListType.FINISHED;

  return (
    <div>
      <div className="mb-6">
        <Link
          to={task.todoListId ? `/lists/${task.todoListId}/tasks` : '/lists'}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium"
        >
          {t('taskDetails.backToTasks')}
        </Link>
      </div>

      <div className="premium-card p-6">
        <div className={`flex items-start justify-between gap-3 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'} flex-1`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => {
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { completed: !task.completed },
                });
              }}
              className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
            />
            {isEditingTask ? (
              <div className="flex flex-col gap-2">
                <input
                  value={taskDescriptionDraft}
                  onChange={(e) => setTaskDescriptionDraft(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!taskDescriptionDraft.trim()}
                    onClick={() => {
                      updateTaskMutation.mutate(
                        {
                          id: task.id,
                          data: { description: taskDescriptionDraft.trim() },
                        },
                        {
                          onSuccess: () => {
                            toast.success(t('taskDetails.taskUpdated'));
                            setIsEditingTask(false);
                          },
                        },
                      );
                    }}
                    className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTask(false);
                      setTaskDescriptionDraft(task.description);
                    }}
                    className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-[#2a2a2a] px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#333333]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <h1
                className="premium-header-section text-2xl cursor-text"
                title={t('taskDetails.clickToEdit')}
                onClick={() => {
                  if (isArchivedTask) return;
                  setIsEditingTask(true);
                  setTaskDescriptionDraft(task.description);
                }}
              >
                {task.description}
              </h1>
            )}
          </div>
          {!isArchivedTask && !isFullEditMode && (
            <button
              onClick={handleOpenEdit}
              className="glass-button text-sm font-medium"
            >
              {t('common.edit', { defaultValue: 'Edit' })}
            </button>
          )}
          {isArchivedTask && (
            <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                disabled={false}
                onClick={() => {
                  const ok = window.confirm(
                    t('tasks.restoreConfirm', { description: task.description }),
                  );
                  if (!ok) return;
                  restoreTaskMutation.mutate({ id: task.id });
                }}
                className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('tasks.restore')}
              </button>
              <button
                type="button"
                disabled={false}
                onClick={() => {
                  const ok = window.confirm(
                    t('tasks.deleteForeverConfirm', { description: task.description }),
                  );
                  if (!ok) return;
                  permanentDeleteTaskMutation.mutate({ id: task.id });
                }}
                className="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('tasks.deleteForever')}
              </button>
            </div>
          )}
        </div>

        {/* Task Info Display (when not in full edit mode) */}
        {!isFullEditMode && (
          <>
            {/* Due Date */}
            {task.dueDate && (
              <div className="mb-6">
                <div className="premium-card p-4">
                  <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-lg">📅</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        {t('taskDetails.dueDate', { defaultValue: 'Due Date' })}
                      </div>
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        {new Date(task.dueDate).toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reminders */}
            <ReminderDisplay task={task} />
          </>
        )}

        {/* Full Edit Form */}
        {isFullEditMode && (
          <TaskEditForm
            editDescription={editDescription}
            onEditDescriptionChange={setEditDescription}
            editDueDate={editDueDate}
            onEditDueDateChange={setEditDueDate}
            editReminders={editReminders}
            onRemindersChange={handleRemindersChange}
            onSave={handleSaveTask}
            onCancel={handleCancelEdit}
            isSaving={updateTaskMutation.isPending}
          />
        )}

        {task && (
          <StepsList
            task={task}
            showAddStep={stepManagement.showAddStep}
            newStepDescription={stepManagement.newStepDescription}
            onNewStepDescriptionChange={stepManagement.setNewStepDescription}
            editingStepId={stepManagement.editingStepId}
            stepDescriptionDraft={stepManagement.stepDescriptionDraft}
            onStepDescriptionDraftChange={stepManagement.setStepDescriptionDraft}
            onCreateStep={stepManagement.handleCreateStep}
            onToggleStep={stepManagement.handleToggleStep}
            onEditStep={stepManagement.handleEditStep}
            onSaveStep={stepManagement.handleSaveStep}
            onCancelEdit={() => {
              stepManagement.setEditingStepId(null);
              stepManagement.setStepDescriptionDraft('');
            }}
            onDeleteStep={stepManagement.handleDeleteStep}
            onCreateStepClick={() => stepManagement.setShowAddStep(true)}
            onCancelAddStep={() => {
              stepManagement.setShowAddStep(false);
              stepManagement.setNewStepDescription('');
            }}
            createStepMutation={stepManagement.createStepMutation}
            stepInputRef={stepInputRef}
          />
        )}
      </div>

    </div>
  );
}
