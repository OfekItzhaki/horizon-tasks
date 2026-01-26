import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueuedMutation } from '../hooks/useQueuedMutation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import FloatingActionButton from '../components/FloatingActionButton';
import Skeleton from '../components/Skeleton';
import ReminderConfigComponent from '../components/ReminderConfig';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { isRtlLanguage } from '@tasks-management/frontend-services';
import {
  Task,
  ApiError,
  Step,
  CreateStepDto,
  UpdateTaskDto,
  UpdateStepDto,
  ListType,
} from '@tasks-management/frontend-services';
import { handleApiError, extractErrorMessage } from '../utils/errorHandler';
import {
  ReminderConfig,
  ReminderTimeframe,
  convertBackendToReminders,
  convertRemindersToBackend,
  formatReminderDisplay,
} from '../utils/reminderHelpers';
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
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepDescription, setNewStepDescription] = useState('');
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [stepDescriptionDraft, setStepDescriptionDraft] = useState('');
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
        } else if (editingStepId !== null) {
          setEditingStepId(null);
          setStepDescriptionDraft('');
        } else if (showAddStep) {
          setShowAddStep(false);
          setNewStepDescription('');
        }
      },
      description: 'Cancel editing',
    },
    {
      key: 's',
      handler: () => {
        if (!showAddStep && task) {
          setShowAddStep(true);
        }
      },
      description: 'Add new step',
    },
  ]);

  // Speed-up + consistency:
  // If the user just toggled completion in the list view and immediately navigates here,
  // the network fetch may still return stale data. Use cached task from React Query first.
  const getCachedTaskById = (): Task | undefined => {
    if (typeof numericTaskId !== 'number' || Number.isNaN(numericTaskId)) {
      return undefined;
    }

    const direct = queryClient.getQueryData<Task>(['task', numericTaskId]);
    if (direct) return direct;

    const candidates = queryClient.getQueriesData<Task[]>({
      queryKey: ['tasks'],
    });
    for (const [, tasks] of candidates) {
      const found = tasks?.find((t) => t.id === numericTaskId);
      if (found) return found;
    }
    return undefined;
  };

  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Task, ApiError>({
    queryKey: ['task', numericTaskId],
    enabled: typeof numericTaskId === 'number' && !Number.isNaN(numericTaskId),
    initialData: () => getCachedTaskById(),
    queryFn: () => tasksService.getTaskById(numericTaskId as number),
  });

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
        
        // Debug logging
        if (import.meta.env.DEV) {
          console.log('🔍 useEffect - Task Reminder Data:', {
            taskId: task.id,
            reminderDaysBefore: task.reminderDaysBefore,
            specificDayOfWeek: task.specificDayOfWeek,
            reminderConfig: task.reminderConfig,
            reminderConfigType: typeof task.reminderConfig,
            convertedRemindersCount: convertedReminders.length,
            convertedReminders: convertedReminders,
          });
        }
        
        setEditReminders(convertedReminders);
      }
    }
  }, [task, isFullEditMode]);

  // Auto-focus step input when showAddStep becomes true
  useEffect(() => {
    if (showAddStep && stepInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        stepInputRef.current?.focus();
      }, 0);
    }
  }, [showAddStep]);


  const invalidateTask = (t: Task) => {
    // Non-blocking invalidations - don't await
    queryClient.invalidateQueries({ queryKey: ['task', t.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks', t.todoListId] });
  };

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

  const updateStepMutation = useQueuedMutation<
    Step,
    ApiError,
    { task: Task; stepId: number; data: UpdateStepDto },
    { previousTask?: Task; previousTasks?: Task[] }
  >({
    mutationFn: ({ stepId, data }) => stepsService.updateStep(stepId, data),
    onMutate: async (vars) => {
      // Removed cancelQueries to allow parallel mutations

      const previousTask = queryClient.getQueryData<Task>(['task', vars.task.id]);
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        vars.task.todoListId,
      ]);

      const patchTaskSteps = (t: Task): Task => ({
        ...t,
        steps: (t.steps ?? []).map((s) =>
          s.id === vars.stepId ? { ...s, ...vars.data } : s,
        ),
        updatedAt: new Date().toISOString(),
      });

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], patchTaskSteps(previousTask));
      }

      queryClient.setQueryData<Task[]>(['tasks', vars.task.todoListId], (old = []) =>
        old.map((t) => (t.id === vars.task.id ? patchTaskSteps(t) : t)),
      );

      return { previousTask, previousTasks };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      }
      if (ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', vars.task.todoListId], ctx.previousTasks);
      }
      handleApiError(err, t('taskDetails.updateStepFailed', { defaultValue: 'Failed to update step. Please try again.' }));
    },
    onSettled: (_data, _err, vars) => {
      // Non-blocking invalidation - don't await
      invalidateTask(vars.task);
    },
  });

  const createStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; data: CreateStepDto },
    { previousTask?: Task }
  >({
    mutationFn: ({ task, data }) => stepsService.createStep(task.id, data),
    onMutate: async (vars) => {
      // Removed cancelQueries to allow parallel mutations

      const previousTask = queryClient.getQueryData<Task>(['task', vars.task.id]);

      const now = new Date().toISOString();
      const tempId = -Date.now();
      const optimistic: Step = {
        id: tempId,
        description: vars.data.description,
        completed: Boolean(vars.data.completed ?? false),
        taskId: vars.task.id,
        order: Date.now(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], {
          ...previousTask,
          steps: [...(previousTask.steps ?? []), optimistic],
          updatedAt: now,
        });
      }

      return { previousTask };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      }
      handleApiError(err, t('taskDetails.addStepFailed', { defaultValue: 'Failed to add step. Please try again.' }));
    },
    onSuccess: (_created, vars) => {
      setNewStepDescription('');
      setShowAddStep(false);
      toast.success(t('taskDetails.stepAdded'));
      // ensure list view reflects steps count if needed
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.task.todoListId] });
    },
    onSettled: (_data, _err, vars) => {
      // Non-blocking invalidation - don't await
      invalidateTask(vars.task);
    },
  });

  const deleteStepMutation = useQueuedMutation<
    Step,
    ApiError,
    { task: Task; id: number },
    { previousTask?: Task }
  >({
    mutationFn: ({ id }) => stepsService.deleteStep(id),
    onMutate: async (vars) => {
      // Removed cancelQueries to allow parallel mutations
      const previousTask = queryClient.getQueryData<Task>(['task', vars.task.id]);

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], {
          ...previousTask,
          steps: (previousTask.steps ?? []).filter((s) => s.id !== vars.id),
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousTask };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      }
      handleApiError(err, t('taskDetails.deleteStepFailed', { defaultValue: 'Failed to delete step. Please try again.' }));
    },
    onSuccess: () => {
      toast.success(t('taskDetails.stepDeleted'));
    },
    onSettled: (_data, _err, vars) => {
      // Non-blocking invalidation - don't await
      invalidateTask(vars.task);
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
    if (!editDescription.trim()) {
      toast.error(t('taskDetails.descriptionRequired', { defaultValue: 'Description is required' }));
      return;
    }

    if (!task) return;

    const updateData: UpdateTaskDto = {
      description: editDescription.trim(),
    };

    if (editDueDate.trim()) {
      const date = new Date(editDueDate);
      if (!isNaN(date.getTime())) {
        updateData.dueDate = date.toISOString();
      }
    } else {
      updateData.dueDate = null;
    }

    // Use the new due date for conversion, or fall back to task's due date only if new one is undefined
    // If due date is explicitly set to null (cleared), use null for conversion
    const dueDateForConversion = updateData.dueDate !== undefined 
      ? (updateData.dueDate || undefined) 
      : (task?.dueDate || undefined);
    
    const reminderData = convertRemindersToBackend(editReminders, dueDateForConversion);
    
    // Debug logging for save
    if (import.meta.env.DEV) {
      console.log('💾 Saving reminders:', {
        editReminders,
        reminderData,
        dueDateForConversion,
        updateDataReminderConfig: reminderData.reminderConfig,
      });
    }
    
    // Always include reminder data explicitly - these fields must be sent to save/clear reminders
    // convertRemindersToBackend always returns these fields (never undefined)
    updateData.reminderDaysBefore = reminderData.reminderDaysBefore || [];
    updateData.specificDayOfWeek = reminderData.specificDayOfWeek !== undefined 
      ? reminderData.specificDayOfWeek 
      : null;
    updateData.reminderConfig = reminderData.reminderConfig || null;

    // Close edit mode immediately, save in background
    setIsFullEditMode(false);
    
    updateTaskMutation.mutate(
      { id: task.id, data: updateData },
      {
        onSuccess: async (updatedTask) => {
          // Debug logging for save response
          if (import.meta.env.DEV) {
            console.log('✅ Task saved successfully:', {
              taskId: updatedTask.id,
              reminderDaysBefore: updatedTask.reminderDaysBefore,
              specificDayOfWeek: updatedTask.specificDayOfWeek,
              reminderConfig: updatedTask.reminderConfig,
              reminderConfigType: typeof updatedTask.reminderConfig,
              reminderConfigStringified: JSON.stringify(updatedTask.reminderConfig),
            });
          }
          
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
          {!isArchivedTask && (
            <button
              onClick={useCallback(async () => {
                // Refetch the task to ensure we have the latest data including reminderConfig
                if (numericTaskId) {
                  try {
                    const freshTask = await queryClient.fetchQuery<Task>({
                      queryKey: ['task', numericTaskId],
                      queryFn: () => tasksService.getTaskById(numericTaskId),
                    });
                    
                    setEditDescription(freshTask.description);
                    setEditDueDate(freshTask.dueDate ? freshTask.dueDate.split('T')[0] : '');
                    
                    // Log raw data for debugging
                    if (import.meta.env.DEV) {
                      console.log('🔍 Raw task data from server:', {
                        taskId: freshTask.id,
                        reminderDaysBefore: freshTask.reminderDaysBefore,
                        specificDayOfWeek: freshTask.specificDayOfWeek,
                        reminderConfig: freshTask.reminderConfig,
                        reminderConfigType: typeof freshTask.reminderConfig,
                        reminderConfigIsArray: Array.isArray(freshTask.reminderConfig),
                        reminderConfigRaw: freshTask.reminderConfig,
                      });
                    }
                    
                    const convertedReminders = convertBackendToReminders(
                      freshTask.reminderDaysBefore,
                      freshTask.specificDayOfWeek,
                      freshTask.dueDate || null,
                      freshTask.reminderConfig,
                    );
                    
                    // Log conversion result
                    if (import.meta.env.DEV) {
                      console.log('🔍 Converted reminders:', {
                        count: convertedReminders.length,
                        reminders: convertedReminders,
                      });
                    }
                    
                    setEditReminders(convertedReminders);
                  } catch (error) {
                    // Fallback to cached data on error
                    // Fallback to cached data
                    const latestTask = queryClient.getQueryData<Task>(['task', numericTaskId]) || task;
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
                } else {
                  // Fallback if no taskId
                  const latestTask = queryClient.getQueryData<Task>(['task', numericTaskId]) || task;
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
              }, [task, queryClient, numericTaskId])}
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
            {(() => {
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
            })()}
          </>
        )}

        {/* Full Edit Form */}
        {isFullEditMode && (
          <div className="premium-card p-6 mb-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('taskDetails.form.descriptionLabel')}
              </label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="premium-input w-full"
                placeholder={t('taskDetails.form.descriptionPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('taskDetails.dueDate', { defaultValue: 'Due Date' })}
              </label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="premium-input w-full"
              />
            </div>

            <ReminderConfigComponent
              reminders={editReminders}
              onRemindersChange={handleRemindersChange}
            />

            <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleCancelEdit}
                className="flex-1 glass-button"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveTask}
                disabled={updateTaskMutation.isPending || !editDescription.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateTaskMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center justify-between gap-3 mb-3`}>
            <h2 className="premium-header-section text-lg">
              {t('taskDetails.stepsTitle', { defaultValue: 'Steps' })}
            </h2>
            {!showAddStep && (
              <button
                type="button"
                onClick={() => setShowAddStep(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg hover:from-primary-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                {t('taskDetails.addStep', { defaultValue: 'Add Step' })}
              </button>
            )}
          </div>

          {showAddStep && (
            <form
              className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#2a2a2a] p-4 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newStepDescription.trim()) return;
                createStepMutation.mutate({
                  task,
                  data: { description: newStepDescription.trim() },
                });
              }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-10">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('taskDetails.form.descriptionLabel')}
                  </label>
                  <input
                    ref={stepInputRef}
                    value={newStepDescription}
                    onChange={(e) => setNewStepDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t('taskDetails.form.descriptionPlaceholder')}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={createStepMutation.isPending || !newStepDescription.trim()}
                    className="inline-flex flex-1 justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createStepMutation.isPending
                      ? t('common.loading')
                      : t('common.create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStep(false);
                      setNewStepDescription('');
                    }}
                    className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-[#2a2a2a] px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#333333]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {!showAddStep && task.steps && task.steps.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">{t('taskDetails.noSteps', { defaultValue: 'No steps yet' })}</p>
            </div>
          )}

          {task.steps && task.steps.length > 0 && (
            <ul className="space-y-2">
              {task.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={() => {
                        updateStepMutation.mutate({
                          task,
                          stepId: step.id,
                          data: { completed: !step.completed },
                        });
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    {editingStepId === step.id ? (
                      <input
                        value={stepDescriptionDraft}
                        onChange={(e) => setStepDescriptionDraft(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <span
                        className={
                          step.completed
                            ? 'line-through text-gray-500 dark:text-gray-400 truncate'
                            : 'text-gray-900 dark:text-white truncate'
                        }
                        title={t('taskDetails.clickToEdit')}
                        onClick={() => {
                          setEditingStepId(step.id);
                          setStepDescriptionDraft(step.description);
                        }}
                      >
                        {step.description}
                      </span>
                    )}
                  </div>

                  {editingStepId === step.id ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!stepDescriptionDraft.trim()}
                        onClick={() => {
                          updateStepMutation.mutate(
                            {
                              task,
                              stepId: step.id,
                              data: { description: stepDescriptionDraft.trim() },
                            },
                            {
                              onSuccess: () => {
                                toast.success(t('taskDetails.stepUpdated'));
                                setEditingStepId(null);
                                setStepDescriptionDraft('');
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
                          setEditingStepId(null);
                          setStepDescriptionDraft('');
                        }}
                        className="inline-flex justify-center rounded-md bg-gray-200 dark:bg-[#2a2a2a] px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-[#333333]"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={false}
                      onClick={() => {
                        const ok = window.confirm(
                          t('taskDetails.deleteStepConfirm', { description: step.description }),
                        );
                        if (!ok) return;
                        deleteStepMutation.mutate({ task, id: step.id });
                      }}
                      className="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <FloatingActionButton
        ariaLabel={t('taskDetails.addStepFab')}
        onClick={() => setShowAddStep(true)}
      />
    </div>
  );
}
