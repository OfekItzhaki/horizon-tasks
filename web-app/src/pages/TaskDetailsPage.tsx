import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
import {
  Task,
  ApiError,
  Step,
  CreateStepDto,
  UpdateTaskDto,
  UpdateStepDto,
  ListType,
  ReminderConfig,
  ReminderTimeframe,
  convertBackendToReminders,
  convertRemindersToBackend,
  formatReminderDisplay,
  isRtlLanguage,
} from '@tasks-management/frontend-services';
import { formatApiError } from '../utils/formatApiError';
import ReminderEditor from '../components/ReminderEditor';

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

  // Reminder State
  const [showReminderEditor, setShowReminderEditor] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(
    null
  );

  const getCachedTaskById = (): Task | undefined => {
    if (typeof numericTaskId !== 'number' || Number.isNaN(numericTaskId))
      return undefined;
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
  } = useQuery<Task, ApiError>({
    queryKey: ['task', numericTaskId],
    enabled: typeof numericTaskId === 'number' && !Number.isNaN(numericTaskId),
    initialData: () => getCachedTaskById(),
    queryFn: () => tasksService.getTaskById(numericTaskId as number),
  });

  useEffect(() => {
    if (task) setTaskDescriptionDraft(task.description);
  }, [task]);

  const reminders = useMemo(() => {
    if (!task) return [];
    return convertBackendToReminders(
      task.reminderDaysBefore,
      task.specificDayOfWeek,
      task.dueDate,
      task.reminderConfig
    );
  }, [task]);

  const updateTaskMutation = useMutation<
    Task,
    ApiError,
    { id: number; data: UpdateTaskDto },
    { previousTask?: Task; previousTasks?: Task[]; todoListId?: number }
  >({
    mutationFn: ({ id, data }) => tasksService.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['task', id] });
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
      return { previousTask, previousTasks, todoListId };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask)
        queryClient.setQueryData(['task', vars.id], ctx.previousTask);
      toast.error(formatApiError(err, t('taskDetails.updateTaskFailed')));
    },
    onSettled: async (_data, _err, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
      const current = queryClient.getQueryData<Task>(['task', vars.id]);
      if (current?.todoListId) {
        await queryClient.invalidateQueries({
          queryKey: ['tasks', current.todoListId],
        });
      }
    },
  });

  const handleSaveReminder = (reminder: ReminderConfig) => {
    if (!task) return;
    const existing = reminders.filter((r) => r.id !== reminder.id);
    const newReminders = [...existing, reminder];
    const backendData = convertRemindersToBackend(
      newReminders,
      task.dueDate || undefined
    );

    updateTaskMutation.mutate({
      id: task.id,
      data: backendData,
    });

    setShowReminderEditor(false);
    setEditingReminder(null);
  };

  const handleDeleteReminder = (reminderId: string) => {
    if (!task) return;
    const newReminders = reminders.filter((r) => r.id !== reminderId);
    const backendData = convertRemindersToBackend(
      newReminders,
      task.dueDate || undefined
    );

    updateTaskMutation.mutate({
      id: task.id,
      data: backendData,
    });
  };

  const updateStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; stepId: number; data: UpdateStepDto },
    { previousTask?: Task }
  >({
    mutationFn: ({ stepId, data }) => stepsService.updateStep(stepId, data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['task', vars.task.id] });
      const previousTask = queryClient.getQueryData<Task>([
        'task',
        vars.task.id,
      ]);
      if (previousTask) {
        queryClient.setQueryData<Task>(['task', vars.task.id], {
          ...previousTask,
          steps: (previousTask.steps ?? []).map((s) =>
            s.id === vars.stepId ? { ...s, ...vars.data } : s
          ),
        });
      }
      return { previousTask };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previousTask)
        queryClient.setQueryData(['task', vars.task.id], ctx.previousTask);
      toast.error(formatApiError(err, t('taskDetails.updateStepFailed')));
    },
    onSettled: async (_data, _err, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['task', vars.task.id] });
    },
  });

  const createStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; data: CreateStepDto }
  >({
    mutationFn: ({ task, data }) => stepsService.createStep(task.id, data),
    onSuccess: (_created, vars) => {
      setNewStepDescription('');
      setShowAddStep(false);
      toast.success(t('taskDetails.stepAdded'));
      queryClient.invalidateQueries({ queryKey: ['task', vars.task.id] });
    },
  });

  const deleteStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; id: number }
  >({
    mutationFn: ({ id }) => stepsService.deleteStep(id),
    onSuccess: (_data, vars) => {
      toast.success(t('taskDetails.stepDeleted'));
      queryClient.invalidateQueries({ queryKey: ['task', vars.task.id] });
    },
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-8">
        <Skeleton className="h-6 w-32" />
        <div className="premium-card p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-10 w-80" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full glass-card" />
            <Skeleton className="h-12 w-full glass-card" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="premium-card bg-red-50 dark:bg-red-900/10 p-10 text-center animate-shake">
        <p className="text-red-800 dark:text-red-400 font-black uppercase tracking-widest text-sm mb-6">
          {isError
            ? formatApiError(error, t('taskDetails.loadFailed'))
            : t('taskDetails.notFound')}
        </p>
        <Link to="/lists" className="premium-button inline-block">
          {t('tasks.backToLists')}
        </Link>
      </div>
    );
  }

  const isArchivedTask = task.todoList?.type === ListType.FINISHED;

  return (
    <div className={`max-w-4xl mx-auto pb-24 ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="mb-8 animate-slide-up">
        <Link
          to={task.todoListId ? `/lists/${task.todoListId}/tasks` : '/lists'}
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-black uppercase tracking-widest text-xs transition-transform hover:-translate-x-1"
        >
          {isRtl ? '→' : '←'} {t('taskDetails.backToTasks')}
        </Link>
      </div>

      <div
        className="premium-card p-8 animate-slide-up"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-10">
          <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() =>
                updateTaskMutation.mutate({
                  id: task.id,
                  data: { completed: !task.completed },
                })
              }
              className="mt-2 w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
            />
            <div className="flex-1 min-w-0">
              {isEditingTask ? (
                <div className="space-y-3">
                  <input
                    value={taskDescriptionDraft}
                    onChange={(e) => setTaskDescriptionDraft(e.target.value)}
                    autoFocus
                    className="w-full text-3xl font-black bg-transparent border-b-2 border-primary-500 focus:outline-none dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateTaskMutation.mutate(
                          {
                            id: task.id,
                            data: { description: taskDescriptionDraft.trim() },
                          },
                          { onSuccess: () => setIsEditingTask(false) }
                        );
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      onClick={() => setIsEditingTask(false)}
                      className="px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <h1
                  className={`text-4xl font-black truncate transition-all cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}
                  onClick={() => !isArchivedTask && setIsEditingTask(true)}
                >
                  {task.description}
                </h1>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isArchivedTask && (
              <>
                <button
                  onClick={() => navigate(`/lists/${task.todoListId}/tasks`)} // Simplified for now
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105"
                >
                  {t('tasks.restore')}
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105">
                  {t('tasks.deleteForever')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reminders Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
              <span className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg">
                🔔
              </span>
              {t('taskDetails.remindersTitle', { defaultValue: 'Reminders' })}
            </h2>
            <button
              onClick={() => {
                setEditingReminder(null);
                setShowReminderEditor(true);
              }}
              className="text-primary-600 hover:text-primary-700 font-black uppercase tracking-widest text-xs"
            >
              + {t('reminders.add', { defaultValue: 'Add Reminder' })}
            </button>
          </div>

          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="group glass-card p-4 flex items-center justify-between hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all cursor-pointer"
                onClick={() => {
                  setEditingReminder(reminder);
                  setShowReminderEditor(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⏰</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatReminderDisplay(reminder, t)}
                    </p>
                    {reminder.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        📍 {reminder.location}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReminder(reminder.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  🗑️
                </button>
              </div>
            ))}
            {reminders.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                {t('reminders.noReminders', {
                  defaultValue: 'No reminders set for this task',
                })}
              </p>
            )}
          </div>
        </section>

        {/* Steps Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
              <span className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                📋
              </span>
              {t('taskDetails.stepsTitle')}
            </h2>
            <button
              onClick={() => setShowAddStep(true)}
              className="text-purple-600 hover:text-purple-700 font-black uppercase tracking-widest text-xs"
            >
              + {t('taskDetails.addStep', { defaultValue: 'Add Step' })}
            </button>
          </div>

          <div className="space-y-3">
            {task.steps
              ?.sort((a, b) => a.order - b.order)
              .map((step) => (
                <div
                  key={step.id}
                  className="group glass-card p-4 flex items-center justify-between animate-fade-in"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={() =>
                        updateStepMutation.mutate({
                          task,
                          stepId: step.id,
                          data: { completed: !step.completed },
                        })
                      }
                      className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    {editingStepId === step.id ? (
                      <input
                        value={stepDescriptionDraft}
                        onChange={(e) =>
                          setStepDescriptionDraft(e.target.value)
                        }
                        autoFocus
                        onBlur={() => {
                          if (
                            stepDescriptionDraft.trim() &&
                            stepDescriptionDraft !== step.description
                          ) {
                            updateStepMutation.mutate({
                              task,
                              stepId: step.id,
                              data: {
                                description: stepDescriptionDraft.trim(),
                              },
                            });
                          }
                          setEditingStepId(null);
                        }}
                        className="flex-1 bg-transparent border-b border-purple-500 focus:outline-none text-gray-900 dark:text-white"
                      />
                    ) : (
                      <span
                        className={`flex-1 truncate cursor-pointer ${step.completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white font-medium'}`}
                        onClick={() => {
                          setEditingStepId(step.id);
                          setStepDescriptionDraft(step.description);
                        }}
                      >
                        {step.description}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      deleteStepMutation.mutate({ task, id: step.id })
                    }
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    🗑️
                  </button>
                </div>
              ))}
          </div>

          {showAddStep && (
            <form
              className="mt-4 animate-slide-up"
              onSubmit={(e) => {
                e.preventDefault();
                if (newStepDescription.trim())
                  createStepMutation.mutate({
                    task,
                    data: { description: newStepDescription.trim() },
                  });
              }}
            >
              <input
                value={newStepDescription}
                onChange={(e) => setNewStepDescription(e.target.value)}
                autoFocus
                placeholder={t('taskDetails.form.descriptionPlaceholder')}
                className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  {t('common.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStep(false)}
                  className="px-6 py-2 bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {showReminderEditor && (
        <ReminderEditor
          reminder={
            editingReminder || {
              id: `new-${Date.now()}`,
              timeframe: ReminderTimeframe.EVERY_DAY,
            }
          }
          taskDueDate={task.dueDate}
          onSave={handleSaveReminder}
          onCancel={() => {
            setShowReminderEditor(false);
            setEditingReminder(null);
          }}
        />
      )}
    </div>
  );
}
