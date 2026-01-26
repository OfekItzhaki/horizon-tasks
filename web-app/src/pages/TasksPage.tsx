import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueuedMutation } from '../hooks/useQueuedMutation';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasksService } from '../services/tasks.service';
import { listsService } from '../services/lists.service';
import FloatingActionButton from '../components/FloatingActionButton';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';
import { isRtlLanguage } from '@tasks-management/frontend-services';
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
import { handleApiError, extractErrorMessage } from '../utils/errorHandler';

type ListWithSystemFlag = ToDoList & { isSystem?: boolean };

export default function TasksPage() {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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
    // Reset to first page when tasks change
    setCurrentPage(1);
  }, [tasks]);

  // Calculate pagination
  const totalPages = Math.ceil(tasksOrder.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTasks = tasksOrder.slice(startIndex, endIndex);

  const isFinishedList = list?.type === ListType.FINISHED;

  const updateListMutation = useMutation<
    ListWithSystemFlag,
    ApiError,
    { id: number; data: UpdateToDoListDto },
    { previousList?: ListWithSystemFlag; previousLists?: ListWithSystemFlag[] }
  >({
    mutationFn: ({ id, data }) => listsService.updateList(id, data),
    onMutate: ({ id, data }) => {
      // Removed cancelQueries to allow parallel mutations

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
      handleApiError(err, t('tasks.listUpdateFailed', { defaultValue: 'Failed to update list. Please try again.' }));
    },
    onSettled: (_data, _err, vars) => {
      // Non-blocking invalidations - don't await
      queryClient.invalidateQueries({ queryKey: ['list', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const deleteListMutation = useMutation<
    ListWithSystemFlag,
    ApiError,
    { id: number },
    { previousLists?: ListWithSystemFlag[] }
  >({
    mutationFn: ({ id }) => listsService.deleteList(id),
    onMutate: ({ id }) => {
      // Removed cancelQueries to allow parallel mutations
      const previousLists = queryClient.getQueryData<ListWithSystemFlag[]>([
        'lists',
      ]);
      queryClient.setQueryData<ListWithSystemFlag[]>(['lists'], (old = []) =>
        old.filter((l) => l.id !== id),
      );
      return { previousLists };
    },
    onSuccess: () => {
      // Non-blocking invalidation - don't await
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success(t('tasks.listDeleted'));
      navigate('/lists');
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousLists) {
        queryClient.setQueryData(['lists'], ctx.previousLists);
      }
      handleApiError(err, t('tasks.listDeleteFailed', { defaultValue: 'Failed to delete list. Please try again.' }));
    },
  });

  const createTaskMutation = useMutation<Task, ApiError, CreateTaskDto, { previousTasks?: Task[] }>({
    mutationFn: (data) =>
      tasksService.createTask(numericListId as number, data),
    onMutate: (data) => {
      if (!numericListId) return { previousTasks: undefined };
      // Removed cancelQueries to allow parallel mutations

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
      handleApiError(err, t('tasks.createFailed', { defaultValue: 'Failed to create task. Please try again.' }));
    },
    onSuccess: () => {
      setNewTaskDescription('');
      setShowCreate(false);
    },
    onSettled: () => {
      // Non-blocking invalidation - don't await
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const deleteTaskMutation = useQueuedMutation<
    Task,
    ApiError,
    { id: number },
    { previousTasks?: Task[] }
  >({
    mutationFn: ({ id }) => tasksService.deleteTask(id),
    onMutate: ({ id }) => {
      if (!numericListId) return { previousTasks: undefined };
      // Removed cancelQueries to allow parallel mutations
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      // Optimistic update - remove task immediately
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previousTasks };
    },
    onError: (err, _vars, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      handleApiError(err, t('tasks.deleteFailed', { defaultValue: 'Failed to delete task. Please try again.' }));
    },
    onSuccess: () => {
      toast.success(t('tasks.taskDeleted'));
    },
    onSettled: () => {
      // Non-blocking invalidation - don't await
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const restoreTaskMutation = useQueuedMutation<
    Task,
    ApiError,
    { id: number },
    { previousTasks?: Task[] }
  >({
    mutationFn: ({ id }) => tasksService.restoreTask(id),
    onMutate: ({ id }) => {
      if (!numericListId) return { previousTasks: undefined };
      // Removed cancelQueries to allow parallel mutations
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      // Optimistic update - remove task immediately
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previousTasks };
    },
    onError: (err, _vars, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      handleApiError(err, t('tasks.restoreFailed', { defaultValue: 'Failed to restore task. Please try again.' }));
    },
    onSuccess: (restored) => {
      toast.success(t('tasks.restored'));
      // Task moved to original list; refresh that list if we know it (non-blocking).
      if (typeof restored.todoListId === 'number') {
        queryClient.invalidateQueries({ queryKey: ['tasks', restored.todoListId] });
      }
    },
    onSettled: () => {
      // Non-blocking invalidation - don't await
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const permanentDeleteTaskMutation = useQueuedMutation<
    Task,
    ApiError,
    { id: number },
    { previousTasks?: Task[] }
  >({
    mutationFn: ({ id }) => tasksService.permanentDeleteTask(id),
    onMutate: ({ id }) => {
      if (!numericListId) return { previousTasks: undefined };
      // Removed cancelQueries to allow parallel mutations
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      // Optimistic update - remove task immediately
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id),
      );
      return { previousTasks };
    },
    onError: (err, _vars, ctx) => {
      if (numericListId && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      handleApiError(err, t('tasks.deleteForeverFailed', { defaultValue: 'Failed to permanently delete task. Please try again.' }));
    },
    onSuccess: () => {
      toast.success(t('tasks.deletedForever'));
    },
    onSettled: () => {
      // Non-blocking invalidation - don't await
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
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
    onSuccess: () => {
      toast.success(t('tasks.reordered') || 'Tasks reordered');
      // Non-blocking invalidation - don't await
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
    onError: (err) => {
      handleApiError(err, t('tasks.reorderFailed', { defaultValue: 'Failed to reorder tasks. Please try again.' }));
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

  const updateTaskMutation = useQueuedMutation<
    Task,
    ApiError,
    { id: number; data: UpdateTaskDto },
    { previousTasks?: Task[]; previousTask?: Task }
  >({
    mutationFn: ({ id, data }) => tasksService.updateTask(id, data),
    onMutate: ({ id, data }) => {
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

      // Removed cancelQueries to allow parallel mutations

      return { previousTasks, previousTask };
    },
    onError: (err, vars, ctx) => {
      if (typeof numericListId === 'number' && ctx?.previousTasks) {
        queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
      }
      if (ctx?.previousTask) {
        queryClient.setQueryData(['task', vars.id], ctx.previousTask);
      }
      handleApiError(err, t('taskDetails.updateTaskFailed', { defaultValue: 'Failed to update task. Please try again.' }));
    },
    onSettled: (_data, _err, vars) => {
      // Non-blocking invalidations - don't await
      if (typeof numericListId === 'number') {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
      queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
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
          {extractErrorMessage(error, t('tasks.loadFailed', { defaultValue: 'Failed to load tasks. Please try again.' }))}
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200"
        >
          {t('common.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} justify-between items-center mb-6`}>
        <Link
          to="/lists"
          className={`text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-semibold flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''} glass-card px-4 py-2 rounded-xl w-fit hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200`}
        >
          <span className={isRtl ? 'transform rotate-180' : ''}>←</span>
          <span>{t('tasks.backToLists').replace('← ', '')}</span>
        </Link>
        {list && !list.isSystem && !isBulkMode && (
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
            className="inline-flex justify-center rounded-xl glass-card px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {t('tasks.deleteList')}
          </button>
        )}
      </div>

      <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} flex-col items-center justify-center mb-8 gap-3`}>
        <div className="min-w-0 flex-1 w-full flex justify-center">
          {isBulkMode && (
            <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center gap-3 mb-4 p-4 premium-card bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20`}>
              <span className="text-sm font-semibold text-primary-900 dark:text-primary-200">
                {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
              </span>
              <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
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
                  className="px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 glass-card rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
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
                  disabled={selectedTasks.size === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 rounded-lg shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 transition-all duration-200"
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
                  disabled={selectedTasks.size === 0}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 disabled:opacity-50 rounded-lg shadow-md shadow-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/40 transition-all duration-200"
                >
                  Mark Incomplete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      t('tasks.deleteSelectedConfirm', {
                        count: selectedTasks.size,
                        plural: selectedTasks.size !== 1 ? 's' : '',
                      }),
                    );
                    if (!ok) return;
                    selectedTasks.forEach((taskId) => {
                      deleteTaskMutation.mutate({ id: taskId });
                    });
                    setSelectedTasks(new Set());
                  }}
                  disabled={selectedTasks.size === 0 || isFinishedList}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 rounded-lg shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 transition-all duration-200"
                >
                  {t('tasks.deleteSelected')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMode(false);
                    setSelectedTasks(new Set());
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
          {isEditingListName ? (
            <div className="flex flex-col gap-2 items-center">
              <input
                value={listNameDraft}
                onChange={(e) => setListNameDraft(e.target.value)}
                aria-label="Edit list name"
                className="w-full max-w-xl rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  disabled={
                    !list || !listNameDraft.trim()
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
                  className="inline-flex justify-center rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200"
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
              className="text-4xl font-bold gradient-text text-center cursor-text hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
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
      </div>

      {showCreate && (
        <form
          className="premium-card p-6 mb-8 animate-slide-down"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskDescription.trim() || !numericListId || isFinishedList) return;
            createTaskMutation.mutate({ description: newTaskDescription.trim() });
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-10">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('tasks.form.descriptionLabel')}
              </label>
              <input
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                aria-label={t('tasks.form.descriptionLabel')}
                className="premium-input w-full text-gray-900 dark:text-white"
                placeholder={t('tasks.form.descriptionPlaceholder')}
                autoFocus
              />
            </div>
            <div className={`sm:col-span-2 flex ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
              <button
                type="submit"
                disabled={
                  createTaskMutation.isPending ||
                  !numericListId ||
                  isFinishedList ||
                  !newTaskDescription.trim()
                }
                className="inline-flex flex-1 justify-center rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200"
              >
                {createTaskMutation.isPending ? t('common.loading') : t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewTaskDescription('');
                }}
                className="inline-flex justify-center rounded-xl glass-card px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
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
          <div className="space-y-4 relative">
            {/* Floating Edit Button - positioned above first task */}
            {!isBulkMode && paginatedTasks.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkMode(true)}
                aria-label={t('tasks.selectMultiple')}
                className={`group absolute ${isRtl ? 'right-0' : 'left-0'} -top-12 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-glow hover:shadow-glow-lg hover:from-primary-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 hover:scale-110 active:scale-95`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {/* Hover tooltip */}
                <span className={`absolute ${isRtl ? 'left-full ml-2' : 'right-full mr-2'} top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-20`}>
                  {t('tasks.selectMultiple')}
                  <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-full' : 'left-full'} border-4 border-transparent ${isRtl ? 'border-l-gray-900 dark:border-l-gray-800' : 'border-r-gray-900 dark:border-r-gray-800'}`} />
                </span>
              </button>
            )}
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
                  // Apply optimistic update immediately, then show confirmation
                  // This ensures UI updates even if user cancels
                  const shouldDelete = window.confirm(
                    t('tasks.deleteTaskConfirm', { description: task.description }),
                  );
                  if (!shouldDelete) return;
                  
                  // Queue the mutation asynchronously - UI already updated optimistically
                  // Use setTimeout(0) to yield to event loop immediately
                  setTimeout(() => {
                    deleteTaskMutation.mutate({ id: task.id });
                  }, 0);
                }}
                onRestore={() => {
                  const shouldRestore = window.confirm(
                    t('tasks.restoreConfirm', { description: task.description }),
                  );
                  if (!shouldRestore) return;
                  setTimeout(() => {
                    restoreTaskMutation.mutate({ id: task.id });
                  }, 0);
                }}
                onPermanentDelete={() => {
                  const shouldDelete = window.confirm(
                    t('tasks.deleteForeverConfirm', { description: task.description }),
                  );
                  if (!shouldDelete) return;
                  setTimeout(() => {
                    permanentDeleteTaskMutation.mutate({ id: task.id });
                  }, 0);
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
                  <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center justify-between gap-3`}>
                    <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-3' : 'space-x-3'} min-w-0 flex-1`}>
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
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            // Allow rapid toggling - optimistic updates handle UI immediately
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
                    <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center gap-3`}>
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
                              const shouldRestore = window.confirm(
                                t('tasks.restoreConfirm', { description: task.description }),
                              );
                              if (!shouldRestore) return;
                              setTimeout(() => {
                                restoreTaskMutation.mutate({ id: task.id });
                              }, 0);
                            }}
                            disabled={false}
                            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200"
                          >
                            {t('tasks.restore')}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const shouldDelete = window.confirm(
                                t('tasks.deleteForeverConfirm', { description: task.description }),
                              );
                              if (!shouldDelete) return;
                              setTimeout(() => {
                                permanentDeleteTaskMutation.mutate({ id: task.id });
                              }, 0);
                            }}
                            disabled={false}
                            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200"
                          >
                            {t('tasks.deleteForever')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const shouldDelete = window.confirm(
                              t('tasks.deleteTaskConfirm', { description: task.description }),
                            );
                            if (!shouldDelete) return;
                            
                            // Queue asynchronously to prevent blocking
                            setTimeout(() => {
                              deleteTaskMutation.mutate({ id: task.id });
                            }, 0);
                          }}
                          disabled={false}
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
        <div className="text-center py-16">
          <div className="premium-card p-12 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">{t('tasks.empty')}</p>
          </div>
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
