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
      <div className="rounded-2xl bg-accent-danger/10 border border-accent-danger/20 p-10 text-center">
        <p className="text-accent-danger font-bold uppercase tracking-wide text-sm mb-6">
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
          className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-semibold text-sm transition-all"
        >
          {t('taskDetails.backToTasks')}
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
              className="mt-2 w-6 h-6 rounded-lg text-accent focus:ring-accent/20 border-border-subtle"
            />
            <div className="flex-1 min-w-0">
              {isEditingTask ? (
                <div className="space-y-3">
                  <input
                    value={taskDescriptionDraft}
                    onChange={(e) => setTaskDescriptionDraft(e.target.value)}
                    autoFocus
                    className="w-full text-3xl font-bold bg-transparent border-b-2 border-accent focus:outline-none text-primary"
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
                      className="premium-button"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      onClick={() => setIsEditingTask(false)}
                      className="px-4 py-2 bg-hover border border-border-subtle text-primary rounded-xl text-xs font-bold uppercase tracking-wide hover:scale-105 active:scale-95 transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 group">
                  <h1
                    className={`text-4xl font-bold truncate transition-all ${task.completed ? 'text-tertiary line-through' : 'text-primary'}`}
                  >
                    {task.description}
                  </h1>
                  {!isArchivedTask && (
                    <button
                      onClick={() => setIsEditingTask(true)}
                      className="p-2.5 text-secondary hover:text-accent bg-hover hover:bg-accent/10 rounded-xl transition-all border border-border-subtle hover:border-accent/30 shadow-sm"
                      title={t('common.edit')}
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isArchivedTask && (
              <>
                <button
                  onClick={() => navigate(`/lists/${task.todoListId}/tasks`)} // Simplified for now
                  className="premium-button"
                >
                  {t('tasks.restore')}
                </button>
                <button className="px-4 py-2 bg-accent-danger text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:scale-105">
                  {t('tasks.deleteForever')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reminders Section */}
        <section className="mt-8">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-primary uppercase tracking-wider flex items-center gap-3">
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
                {t('taskDetails.remindersTitle', { defaultValue: 'Reminders' })}
              </h2>
            </div>

            <div className="space-y-3">
              {/* Add Reminder Button - Always First */}
              <button
                onClick={() => {
                  setEditingReminder(null);
                  setShowReminderEditor(true);
                }}
                className="w-full p-4 rounded-xl border-2 border-dashed border-border-subtle hover:border-accent hover:bg-accent/5 flex items-center justify-center gap-3 transition-all duration-200 group"
              >
                <div className="w-8 h-8 rounded-full bg-hover group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-all">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider text-tertiary group-hover:text-accent transition-colors">
                  {t('reminders.add', { defaultValue: 'Add Reminder' })}
                </span>
              </button>

              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="group vibrant-hover-card p-4 flex items-center justify-between transition-all cursor-pointer"
                  onClick={() => {
                    setEditingReminder(reminder);
                    setShowReminderEditor(true);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-primary">
                        {formatReminderDisplay(reminder, t)}
                      </p>
                      {reminder.location && (
                        <p className="text-xs text-secondary flex items-center gap-1 mt-0.5">
                          <svg
                            className="w-3 h-3"
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
                          {reminder.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReminder(reminder.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-accent-danger hover:bg-accent-danger/10 rounded-lg transition-all"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="mt-8">
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-primary uppercase tracking-wider flex items-center gap-3">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                {t('taskDetails.stepsTitle')}
              </h2>
            </div>

            <div className="space-y-3">
              {/* Add Step Button - Always First */}
              {!showAddStep && (
                <button
                  onClick={() => setShowAddStep(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-border-subtle hover:border-accent hover:bg-accent/5 flex items-center justify-center gap-3 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full bg-hover group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-all">
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-tertiary group-hover:text-accent transition-colors">
                    {t('taskDetails.addStep', { defaultValue: 'Add Step' })}
                  </span>
                </button>
              )}

              {showAddStep && (
                <form
                  className="animate-fade-in mb-4 p-4 rounded-xl border border-accent/20 bg-accent/5"
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
                    className="premium-input w-full mb-3"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="submit" className="premium-button">
                      {t('common.create')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddStep(false)}
                      className="px-6 py-2 bg-hover border border-border-subtle text-primary rounded-xl text-xs font-bold uppercase tracking-wide"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              )}

              {task.steps
                ?.sort((a, b) => a.order - b.order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="group vibrant-hover-card p-4 flex items-center justify-between transition-all animate-fade-in"
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
                        className="w-5 h-5 rounded text-accent focus:ring-accent/20 border-border-subtle"
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
                          className="flex-1 bg-transparent border-b border-accent focus:outline-none text-primary"
                        />
                      ) : (
                        <span
                          className={`flex-1 truncate cursor-pointer ${step.completed ? 'text-tertiary line-through' : 'text-primary font-medium'}`}
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
                      className="opacity-0 group-hover:opacity-100 p-2 text-accent-danger hover:bg-accent-danger/10 rounded-lg transition-all"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}

              {task.steps?.length === 0 && !showAddStep && (
                <div className="text-center py-8 border-2 border-dashed border-border-subtle rounded-xl">
                  <p className="text-sm text-tertiary">
                    {t('taskDetails.noSteps', {
                      defaultValue: 'No steps added',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
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
