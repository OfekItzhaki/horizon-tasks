import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasks.service';
import { listsService } from '../services/lists.service';
import FloatingActionButton from '../components/FloatingActionButton';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTaskItem } from '../components/SortableTaskItem';
import Pagination from '../components/Pagination';
import {
  Task,
  ApiError,
  CreateTaskDto,
  ToDoList,
  ListType,
  UpdateToDoListDto,
  UpdateTaskDto,
} from '@tasks-management/frontend-services';
import { formatApiError } from '../utils/formatApiError';

type ListWithSystemFlag = ToDoList & { isSystem?: boolean };

export default function TasksPage() {
  const { t } = useTranslation();
  const { listId } = useParams<{ listId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [isEditingListName, setIsEditingListName] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [tasksOrder, setTasksOrder] = useState<Task[]>([]);

  const numericListId = listId ? Number(listId) : null;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      handler: () => {
        if (!showCreate && !isFinishedList && numericListId) {
          setShowCreate(true);
        }
      },
      description: 'Create new task',
    },
    {
      key: 'Escape',
      handler: () => {
        if (showCreate) {
          setShowCreate(false);
          setNewTaskDescription('');
        } else if (isEditingListName) {
          setIsEditingListName(false);
          setListNameDraft(list?.name ?? '');
        } else if (isBulkMode) {
          setIsBulkMode(false);
          setSelectedTasks(new Set());
        }
      },
      description: 'Cancel current action',
    },
    {
      key: 'b',
      handler: () => {
        if (!isFinishedList) {
          setIsBulkMode(!isBulkMode);
          if (isBulkMode) {
            setSelectedTasks(new Set());
          }
        }
      },
      description: 'Toggle bulk mode',
    },
  ]);

  const { data: list } = useQuery<ListWithSystemFlag, ApiError>({
    queryKey: ['list', numericListId],
    enabled: typeof numericListId === 'number' && !Number.isNaN(numericListId),
    initialData: () => {
      if (typeof numericListId !== 'number' || Number.isNaN(numericListId)) {
        return undefined;
      }
      const cachedLists = queryClient.getQueryData<ListWithSystemFlag[]>([
        'lists',
      ]);
      return cachedLists?.find((l) => l.id === numericListId);
    },
    queryFn: () => listsService.getListById(numericListId as number),
  });

  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Task[], ApiError>({
    queryKey: ['tasks', numericListId],
    enabled: typeof numericListId === 'number' && !Number.isNaN(numericListId),
    placeholderData: keepPreviousData,
    queryFn: () => tasksService.getTasksByList(numericListId as number),
  });

  useEffect(() => {
    if (list) setListNameDraft(list.name);
  }, [list]);

  // Update local order when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      // Sort by order field to maintain backend order
      const sorted = [...tasks].sort((a, b) => a.order - b.order);
      setTasksOrder(sorted);
    } else {
      setTasksOrder([]);
    }
  }, [tasks]);

  const isFinishedList = list?.type === ListType.FINISHED;

  const updateListMutation = useMutation<
    ListWithSystemFlag,
    ApiError,
    { id: number; data: UpdateToDoListDto },
    { previousList?: ListWithSystemFlag; previousLists?: ListWithSystemFlag[] }
  >({
    mutationFn: ({ id, data }) => listsService.updateList(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['list', id] });
      await queryClient.cancelQueries({ queryKey: ['lists'] });

      const previousList = queryClient.getQueryData<ListWithSystemFlag>([
        'list',
        id,
      ]);
      const previousLists = queryClient.getQueryData<ListWithSystemFlag[]>([
        'lists',
      ]);

      queryClient.setQueryData<ListWithSystemFlag>(['list', id], (old) =>
        old ? { ...old, ...data, updatedAt: new Date().toISOString() } : old,
      );
      queryClient.setQueryData<ListWithSystemFlag[]>(['lists'], (old = []) =>
        old.map((l) =>
          l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l,
        ),
      );

      return { previousList, previousLists };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousList) {
        queryClient.setQueryData(['list', ctx.previousList.id], ctx.previousList);
      }
      if (ctx?.previousLists) {
        queryClient.setQueryData(['lists'], ctx.previousLists);
      }
      toast.error(formatApiError(err, t('tasks.listUpdateFailed')));
    },
    onSettled: async (_data, _err, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['list', vars.id] });
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const deleteListMutation = useMutation<
    ListWithSystemFlag,
    ApiError,
    { id: number },
    { previousLists?: ListWithSystemFlag[] }
  >({
    mutationFn: ({ id }) => listsService.deleteList(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] });
      const previousLists = queryClient.getQueryData<ListWithSystemFlag[]>([
        'lists',
      ]);
      queryClient.setQueryData<ListWithSystemFlag[]>(['lists'], (old = []) =>
        old.filter((l) => l.id !== id),
      );
      return { previousLists };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success(t('tasks.listDeleted'));
      navigate('/lists');
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousLists) {
        queryClient.setQueryData(['lists'], ctx.previousLists);
      }
      toast.error(formatApiError(err, t('tasks.listDeleteFailed')));
    },
  });

  const createTaskMutation = useMutation<Task, ApiError, CreateTaskDto, { previousTasks?: Task[] }>({
    mutationFn: (data) =>
      tasksService.createTask(numericListId as number, data),
    onMutate: async (data) => {
      if (!numericListId) return { previousTasks: undefined };
      await queryClient.cancelQueries({ queryKey: ['tasks', numericListId] });

      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);

      const now = new Date().toISOString();
      const tempId = -Date.now();
      const optimistic: Task = {
        id: tempId,
        description: data.description,
        completed: false,
        todoListId: numericListId,
        order: Date.now(),
        dueDate: null,
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        steps: [],
      };

      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) => [
        optimistic,
        ...old,
      ]);

      return { previousTasks };
    },
    onError: (err, _data, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      toast.error(formatApiError(err, t('tasks.createFailed')));
    },
    onSuccess: () => {
      setNewTaskDescription('');
      setShowCreate(false);
    },
    onSettled: async () => {
      if (numericListId) {
        await queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const deleteTaskMutation = useMutation<
    Task,
    ApiError,
    { id: number },
    { previousTasks?: Task[] }
  >({
    mutationFn: ({ id }) => tasksService.deleteTask(id),
    onMutate: async ({ id }) => {
      if (!numericListId) return { previousTasks: undefined };
      await queryClient.cancelQueries({ queryKey: ['tasks', numericListId] });
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previousTasks };
    },
    onError: (err, _vars, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      toast.error(formatApiError(err, t('tasks.deleteFailed')));
    },
    onSuccess: () => {
      toast.success(t('tasks.taskDeleted'));
    },
    onSettled: async () => {
      if (numericListId) {
        await queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const restoreTaskMutation = useMutation<
    Task,
    ApiError,
    { id: number },
    { previousTasks?: Task[] }
  >({
    mutationFn: ({ id }) => tasksService.restoreTask(id),
    onMutate: async ({ id }) => {
      if (!numericListId) return { previousTasks: undefined };
      await queryClient.cancelQueries({ queryKey: ['tasks', numericListId] });
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previousTasks };
    },
    onError: (err, _vars, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      toast.error(formatApiError(err, t('tasks.restoreFailed')));
    },
    onSuccess: async (restored) => {
      toast.success(t('tasks.restored'));
      // Task moved to original list; refresh that list if we know it.
      if (typeof restored.todoListId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['tasks', restored.todoListId] });
      }
    },
    onSettled: async () => {
      if (numericListId) {
        await queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const permanentDeleteTaskMutation = useMutation<
    Task,
    ApiError,
    { id: number },
    { previousTasks?: Task[] }
  >({
    mutationFn: ({ id }) => tasksService.permanentDeleteTask(id),
    onMutate: async ({ id }) => {
      if (!numericListId) return { previousTasks: undefined };
      await queryClient.cancelQueries({ queryKey: ['tasks', numericListId] });
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previousTasks };
    },
    onError: (err, _vars, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      toast.error(formatApiError(err, t('tasks.deleteForeverFailed')));
    },
    onSuccess: () => {
      toast.success(t('tasks.deletedForever'));
    },
    onSettled: async () => {
      if (numericListId) {
        await queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const reorderTasksMutation = useMutation<
    void,
    ApiError,
    { taskIds: number[] }
  >({
    mutationFn: async ({ taskIds }) => {
      // Update each task's order based on new position
      const updatePromises = taskIds.map((taskId, index) =>
        tasksService.updateTask(taskId, { order: index + 1 }),
      );
      await Promise.all(updatePromises);
    },
    onSuccess: async () => {
      toast.success(t('tasks.reordered') || 'Tasks reordered');
      // Invalidate queries to refresh the list
      if (numericListId) {
        await queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
    onError: (err) => {
      toast.error(formatApiError(err, t('tasks.reorderFailed') || 'Failed to reorder tasks'));
      // Revert to original order on error
      if (tasks.length > 0) {
        const sorted = [...tasks].sort((a, b) => a.order - b.order);
        setTasksOrder(sorted);
      }
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || isBulkMode || isFinishedList) {
      return;
    }

    const oldIndex = tasksOrder.findIndex((task) => task.id === active.id);
    const newIndex = tasksOrder.findIndex((task) => task.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(tasksOrder, oldIndex, newIndex);
      setTasksOrder(newOrder);

      // Update backend with new order
      const taskIds = newOrder.map((task) => task.id);
      reorderTasksMutation.mutate({ taskIds });
    }
  };

  const updateTaskMutation = useMutation<
    Task,
    ApiError,
    { id: number; data: UpdateTaskDto },
    { previousTasks?: Task[]; previousTask?: Task }
  >({
    mutationFn: ({ id, data }) => tasksService.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      const previousTasks =
        typeof numericListId === 'number'
          ? queryClient.getQueryData<Task[]>(['tasks', numericListId])
          : undefined;
      const previousTask = queryClient.getQueryData<Task>(['task', id]);

      const now = new Date().toISOString();

      // Apply optimistic update immediately for snappy checkbox UX.
      // (We still cancel in-flight queries afterwards to avoid stale overwrites.)
      if (typeof numericListId === 'number') {
        queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
          old.map((t) => (t.id === id ? { ...t, ...data, updatedAt: now } : t)),
        );
      }

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', id], {
          ...previousTask,
          ...data,
          updatedAt: now,
        });
      }

      if (typeof numericListId === 'number') {
        await queryClient.cancelQueries({ queryKey: ['tasks', numericListId] });
      }

      if (previousTask) {
        await queryClient.cancelQueries({ queryKey: ['task', id] });
      }

      return { previousTasks, previousTask };
    },
    onError: (err, vars, ctx) => {
      if (typeof numericListId === 'number' && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.id], ctx.previousTask);
      }
      toast.error(formatApiError(err, t('taskDetails.updateTaskFailed')));
    },
    onSettled: async (_data, _err, vars) => {
      if (typeof numericListId === 'number') {
        await queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
    },
  });

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center justify-between mb-6 gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-white dark:bg-[#1f1f1f] rounded-lg shadow">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div className="text-sm text-red-800 dark:text-red-200 mb-3">
          {formatApiError(error, t('tasks.loadFailed'))}
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
        >
          {t('common.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/lists"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium"
        >
          {t('tasks.backToLists')}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0 flex-1">
          {isBulkMode && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = tasks.every((t) => selectedTasks.has(t.id));
                    if (allSelected) {
                      setSelectedTasks(new Set());
                    } else {
                      setSelectedTasks(new Set(tasks.map((t) => t.id)));
                    }
                  }}
                  className="px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded"
                >
                  {tasks.every((t) => selectedTasks.has(t.id)) ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectedTasks.forEach((taskId) => {
                      const task = tasks.find((t) => t.id === taskId);
                      if (task && !task.completed) {
                        updateTaskMutation.mutate({
                          id: taskId,
                          data: { completed: true },
                        });
                      }
                    });
                    setSelectedTasks(new Set());
                  }}
                  disabled={selectedTasks.size === 0 || updateTaskMutation.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded"
                >
                  Mark Complete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectedTasks.forEach((taskId) => {
                      const task = tasks.find((t) => t.id === taskId);
                      if (task && task.completed) {
                        updateTaskMutation.mutate({
                          id: taskId,
                          data: { completed: false },
                        });
                      }
                    });
                    setSelectedTasks(new Set());
                  }}
                  disabled={selectedTasks.size === 0 || updateTaskMutation.isPending}
                  className="px-3 py-1 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded"
                >
                  Mark Incomplete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      `Delete ${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''}?`,
                    );
                    if (!ok) return;
                    selectedTasks.forEach((taskId) => {
                      deleteTaskMutation.mutate({ id: taskId });
                    });
                    setSelectedTasks(new Set());
                  }}
                  disabled={selectedTasks.size === 0 || deleteTaskMutation.isPending || isFinishedList}
                  className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMode(false);
                    setSelectedTasks(new Set());
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {isEditingListName ? (
            <div className="flex flex-col gap-2">
              <input
                value={listNameDraft}
                onChange={(e) => setListNameDraft(e.target.value)}
                aria-label="Edit list name"
                className="w-full max-w-xl rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    updateListMutation.isPending || !list || !listNameDraft.trim()
                  }
                  onClick={() => {
                    if (!list) return;
                    updateListMutation.mutate(
                      { id: list.id, data: { name: listNameDraft.trim() } },
                      {
                        onSuccess: () => {
                          toast.success(t('tasks.listUpdated'));
                          setIsEditingListName(false);
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
                    setIsEditingListName(false);
                    setListNameDraft(list?.name ?? '');
                  }}
                  className="inline-flex justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold text-gray-900 dark:text-white truncate cursor-text"
              title={t('tasks.renameTitle')}
              onClick={() => {
                if (!list) return;
                if (list.isSystem) return;
                setIsEditingListName(true);
                setListNameDraft(list.name);
              }}
              role="button"
              tabIndex={0}
              aria-label={`List name: ${list?.name ?? t('tasks.defaultTitle')}. Click to edit.`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!list || list.isSystem) return;
                  setIsEditingListName(true);
                  setListNameDraft(list.name);
                }
              }}
            >
              {list?.name ?? t('tasks.defaultTitle')}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isBulkMode && (
            <button
              type="button"
              onClick={() => setIsBulkMode(true)}
              aria-label="Select multiple tasks for bulk operations"
              className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Select Multiple
            </button>
          )}
          {list && !list.isSystem && (
            <button
              type="button"
              disabled={deleteListMutation.isPending}
              onClick={() => {
                const ok = window.confirm(
                  t('tasks.deleteListConfirm', { name: list.name }),
                );
                if (!ok) return;
                deleteListMutation.mutate({ id: list.id });
              }}
              className="inline-flex justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('tasks.deleteList')}
            </button>
          )}
        </div>
      </div>

      {showCreate && (
        <form
          className="bg-white dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-[#2a2a2a] p-4 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskDescription.trim() || !numericListId || isFinishedList) return;
            createTaskMutation.mutate({ description: newTaskDescription.trim() });
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-10">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.form.descriptionLabel')}
              </label>
              <input
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                aria-label={t('tasks.form.descriptionLabel')}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('tasks.form.descriptionPlaceholder')}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={
                  createTaskMutation.isPending ||
                  !numericListId ||
                  isFinishedList ||
                  !newTaskDescription.trim()
                }
                className="inline-flex flex-1 justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTaskMutation.isPending ? t('common.loading') : t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewTaskDescription('');
                }}
                className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-[#2a2a2a] px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#333333]"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </form>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={paginatedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {paginatedTasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                isBulkMode={isBulkMode}
                isSelected={selectedTasks.has(task.id)}
                isFinishedList={isFinishedList}
                onToggleSelect={() => {
                  const newSelected = new Set(selectedTasks);
                  if (newSelected.has(task.id)) {
                    newSelected.delete(task.id);
                  } else {
                    newSelected.add(task.id);
                  }
                  setSelectedTasks(newSelected);
                }}
                onToggleComplete={() => {
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { completed: !task.completed },
                  });
                }}
                onDelete={() => {
                  const ok = window.confirm(
                    t('tasks.deleteTaskConfirm', { description: task.description }),
                  );
                  if (!ok) return;
                  deleteTaskMutation.mutate({ id: task.id });
                }}
                onRestore={() => {
                  const ok = window.confirm(
                    t('tasks.restoreConfirm', { description: task.description }),
                  );
                  if (!ok) return;
                  restoreTaskMutation.mutate({ id: task.id });
                }}
                onPermanentDelete={() => {
                  const ok = window.confirm(
                    t('tasks.deleteForeverConfirm', { description: task.description }),
                  );
                  if (!ok) return;
                  permanentDeleteTaskMutation.mutate({ id: task.id });
                }}
                onClick={() => {
                  if (isBulkMode) {
                    const newSelected = new Set(selectedTasks);
                    if (newSelected.has(task.id)) {
                      newSelected.delete(task.id);
                    } else {
                      newSelected.add(task.id);
                    }
                    setSelectedTasks(newSelected);
                  } else {
                    navigate(`/tasks/${task.id}`);
                  }
                }}
                onKeyDown={(e) => {
                  if (isBulkMode) {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const newSelected = new Set(selectedTasks);
                      if (newSelected.has(task.id)) {
                        newSelected.delete(task.id);
                      } else {
                        newSelected.add(task.id);
                      }
                      setSelectedTasks(newSelected);
                    }
                  } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/tasks/${task.id}`);
                  }
                }}
              >
                <div
                  onMouseEnter={() => {
                    void queryClient.prefetchQuery({
                      queryKey: ['task', task.id],
                      queryFn: () => tasksService.getTaskById(task.id),
                    });
                  }}
                  onFocus={() => {
                    void queryClient.prefetchQuery({
                      queryKey: ['task', task.id],
                      queryFn: () => tasksService.getTaskById(task.id),
                    });
                  }}
                  onPointerDown={() => {
                    void queryClient.prefetchQuery({
                      queryKey: ['task', task.id],
                      queryFn: () => tasksService.getTaskById(task.id),
                    });
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {isBulkMode ? (
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedTasks);
                            if (newSelected.has(task.id)) {
                              newSelected.delete(task.id);
                            } else {
                              newSelected.add(task.id);
                            }
                            setSelectedTasks(newSelected);
                          }}
                          aria-label={`Select task: ${task.description}`}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={task.completed}
                          disabled={
                            updateTaskMutation.isPending &&
                            updateTaskMutation.variables?.id === task.id
                          }
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateTaskMutation.mutate({
                              id: task.id,
                              data: { completed: !task.completed },
                            });
                          }}
                          aria-label={`Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${task.description}`}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      )}
                      <span
                        className={
                          task.completed
                            ? 'line-through text-gray-500 dark:text-gray-400 truncate'
                            : 'text-gray-900 dark:text-white truncate'
                        }
                      >
                        {task.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {task.dueDate && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {!isBulkMode && (isFinishedList ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const ok = window.confirm(
                                t('tasks.restoreConfirm', { description: task.description }),
                              );
                              if (!ok) return;
                              restoreTaskMutation.mutate({ id: task.id });
                            }}
                            disabled={restoreTaskMutation.isPending}
                            className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('tasks.restore')}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const ok = window.confirm(
                                t('tasks.deleteForeverConfirm', { description: task.description }),
                              );
                              if (!ok) return;
                              permanentDeleteTaskMutation.mutate({ id: task.id });
                            }}
                            disabled={permanentDeleteTaskMutation.isPending}
                            className="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('tasks.deleteForever')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ok = window.confirm(
                              t('tasks.deleteTaskConfirm', { description: task.description }),
                            );
                            if (!ok) return;
                            deleteTaskMutation.mutate({ id: task.id });
                          }}
                          disabled={deleteTaskMutation.isPending}
                          className="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('common.delete')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SortableTaskItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {tasksOrder.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={tasksOrder.length}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('tasks.empty')}</p>
        </div>
      )}

      <FloatingActionButton
        ariaLabel={t('tasks.createFab')}
        disabled={!numericListId || isFinishedList}
        onClick={() => setShowCreate(true)}
      />
    </div>
  );
}
