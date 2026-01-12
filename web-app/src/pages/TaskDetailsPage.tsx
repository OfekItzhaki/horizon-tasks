import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import FloatingActionButton from '../components/FloatingActionButton';
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
} from '@tasks-management/frontend-services';
import { formatApiError } from '../utils/formatApiError';

export default function TaskDetailsPage() {
  const { t } = useTranslation();
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
  } = useQuery<Task, ApiError>({
    queryKey: ['task', numericTaskId],
    enabled: typeof numericTaskId === 'number' && !Number.isNaN(numericTaskId),
    initialData: () => getCachedTaskById(),
    queryFn: () => tasksService.getTaskById(numericTaskId as number),
  });

  useEffect(() => {
    if (task) setTaskDescriptionDraft(task.description);
  }, [task]);

  const invalidateTask = async (t: Task) => {
    await queryClient.invalidateQueries({ queryKey: ['task', t.id] });
    await queryClient.invalidateQueries({ queryKey: ['tasks', t.todoListId] });
  };

  const updateTaskMutation = useMutation<
    Task,
    ApiError,
    { id: number; data: UpdateTaskDto },
    { previousTask?: Task; previousTasks?: Task[]; todoListId?: number }
  >({
    mutationFn: ({ id, data }) =>
      tasksService.updateTask(id, data),
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
      toast.error(formatApiError(err, t('taskDetails.updateTaskFailed')));
    },
    onSettled: async (_data, _err, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
      const current = queryClient.getQueryData<Task>(['task', vars.id]);
      if (current?.todoListId) {
        await queryClient.invalidateQueries({ queryKey: ['tasks', current.todoListId] });
      }
    },
  });

  const updateStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; stepId: number; data: UpdateStepDto },
    { previousTask?: Task; previousTasks?: Task[] }
  >({
    mutationFn: ({ stepId, data }) => stepsService.updateStep(stepId, data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['task', vars.task.id] });

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
      toast.error(formatApiError(err, t('taskDetails.updateStepFailed')));
    },
    onSettled: async (_data, _err, vars) => {
      await invalidateTask(vars.task);
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
      await queryClient.cancelQueries({ queryKey: ['task', vars.task.id] });

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
      toast.error(formatApiError(err, t('taskDetails.addStepFailed')));
    },
    onSuccess: (_created, vars) => {
      setNewStepDescription('');
      setShowAddStep(false);
      toast.success(t('taskDetails.stepAdded'));
      // ensure list view reflects steps count if needed
      queryClient.invalidateQueries({ queryKey: ['tasks', vars.task.todoListId] });
    },
    onSettled: async (_data, _err, vars) => {
      await invalidateTask(vars.task);
    },
  });

  const deleteStepMutation = useMutation<
    Step,
    ApiError,
    { task: Task; id: number },
    { previousTask?: Task }
  >({
    mutationFn: ({ id }) => stepsService.deleteStep(id),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['task', vars.task.id] });
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
      toast.error(formatApiError(err, t('taskDetails.deleteStepFailed')));
    },
    onSuccess: () => {
      toast.success(t('taskDetails.stepDeleted'));
    },
    onSettled: async (_data, _err, vars) => {
      await invalidateTask(vars.task);
    },
  });

  const safeTaskId =
    typeof numericTaskId === 'number' && !Number.isNaN(numericTaskId)
      ? numericTaskId
      : null;

  const restoreTaskMutation = useMutation<Task, ApiError, { id: number }>({
    mutationFn: ({ id }) => tasksService.restoreTask(id),
    onError: (err) => {
      toast.error(formatApiError(err, t('tasks.restoreFailed')));
    },
    onSuccess: async (restored) => {
      toast.success(t('tasks.restored'));

      if (typeof safeTaskId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['task', safeTaskId] });
      }
      if (typeof restored.todoListId === 'number') {
        await queryClient.invalidateQueries({
          queryKey: ['tasks', restored.todoListId],
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }

      // Navigate to the list the task returned to.
      if (typeof restored.todoListId === 'number') {
        navigate(`/lists/${restored.todoListId}/tasks`);
      } else {
        navigate('/lists');
      }
    },
  });

  const permanentDeleteTaskMutation = useMutation<Task, ApiError, { id: number }>({
    mutationFn: ({ id }) => tasksService.permanentDeleteTask(id),
    onError: (err) => {
      toast.error(formatApiError(err, t('tasks.deleteForeverFailed')));
    },
    onSuccess: async () => {
      toast.success(t('tasks.deletedForever'));

      if (typeof safeTaskId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['task', safeTaskId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });

      navigate('/lists');
    },
  });

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
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
                <div key={i} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
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
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-800">
          {isError
            ? formatApiError(error, t('taskDetails.loadFailed'))
            : t('taskDetails.notFound')}
        </div>
        <Link
          to="/lists"
          className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          {t('tasks.backToLists')}
        </Link>
      </div>
    );
  }

  const isArchivedTask = task.todoList?.type === ListType.FINISHED;

  return (
    <div>
      <div className="mb-6">
        <Link
          to={task.todoListId ? `/lists/${task.todoListId}/tasks` : '/lists'}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          {t('taskDetails.backToTasks')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => {
              updateTaskMutation.mutate({
                id: task.id,
                data: { completed: !task.completed },
              });
            }}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
            {isEditingTask ? (
              <div className="flex flex-col gap-2">
                <input
                  value={taskDescriptionDraft}
                  onChange={(e) => setTaskDescriptionDraft(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={updateTaskMutation.isPending || !taskDescriptionDraft.trim()}
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
                    className="inline-flex justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold text-gray-900 cursor-text"
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
          {isArchivedTask && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={restoreTaskMutation.isPending}
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
                disabled={permanentDeleteTaskMutation.isPending}
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

        {task.dueDate && (
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-700">Due Date: </span>
            <span className="text-sm text-gray-500">
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('taskDetails.stepsTitle')}
            </h2>
          </div>

          {showAddStep && (
            <form
              className="bg-white rounded-lg border p-4 mb-4"
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
                  <label className="block text-sm font-medium text-gray-700">
                    {t('taskDetails.form.descriptionLabel')}
                  </label>
                  <input
                    value={newStepDescription}
                    onChange={(e) => setNewStepDescription(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="inline-flex justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {task.steps && task.steps.length > 0 ? (
            <ul className="space-y-2">
              {task.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded"
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
                        className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <span
                        className={
                          step.completed
                            ? 'line-through text-gray-500 truncate'
                            : 'text-gray-900 truncate'
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
                        disabled={updateStepMutation.isPending || !stepDescriptionDraft.trim()}
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
                        className="inline-flex justify-center rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={deleteStepMutation.isPending}
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
          ) : (
            <p className="text-sm text-gray-500">{t('taskDetails.noSteps')}</p>
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
