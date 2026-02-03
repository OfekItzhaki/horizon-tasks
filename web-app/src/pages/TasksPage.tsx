import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { tasksService } from '../services/tasks.service';
import { listsService } from '../services/lists.service';
import FloatingActionButton from '../components/FloatingActionButton';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
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
import { SortableTaskItem } from '../components/SortableTaskItem';
import BulkActionsBar from '../components/task/BulkActionsBar';
import { isRtlLanguage } from '@tasks-management/frontend-services';

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

  // Bulk Mode State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

  const numericListId = listId ? Number(listId) : null;

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
  } = useQuery<Task[], ApiError>({
    queryKey: ['tasks', numericListId],
    enabled: typeof numericListId === 'number' && !Number.isNaN(numericListId),
    placeholderData: keepPreviousData,
    queryFn: () => tasksService.getTasksByList(numericListId as number),
  });

  // Sort tasks by order for display
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [tasks]);

  useEffect(() => {
    if (list) setListNameDraft(list.name);
  }, [list]);

  const isFinishedList = list?.type === ListType.FINISHED;

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Mutations
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
        old ? { ...old, ...data, updatedAt: new Date().toISOString() } : old
      );
      queryClient.setQueryData<ListWithSystemFlag[]>(['lists'], (old = []) =>
        old.map((l) =>
          l.id === id
            ? { ...l, ...data, updatedAt: new Date().toISOString() }
            : l
        )
      );

      return { previousList, previousLists };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousList) {
        queryClient.setQueryData(
          ['list', ctx.previousList.id],
          ctx.previousList
        );
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
        old.filter((l) => l.id !== id)
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

  const createTaskMutation = useMutation<
    Task,
    ApiError,
    CreateTaskDto,
    { previousTasks?: Task[] }
  >({
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
        completedAt: null,
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
        await queryClient.invalidateQueries({
          queryKey: ['tasks', numericListId],
        });
      }
    },
  });

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

      if (typeof numericListId === 'number') {
        queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
          old.map((t) => (t.id === id ? { ...t, ...data, updatedAt: now } : t))
        );
      }

      if (previousTask) {
        queryClient.setQueryData<Task>(['task', id], {
          ...previousTask,
          ...data,
          updatedAt: now,
        });
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
        await queryClient.invalidateQueries({
          queryKey: ['tasks', numericListId],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
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
      const previousTasks = queryClient.getQueryData<Task[]>([
        'tasks',
        numericListId,
      ]);
      queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
        old.filter((t) => t.id !== id)
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
        await queryClient.invalidateQueries({
          queryKey: ['tasks', numericListId],
        });
      }
    },
  });

  // Reorder Mutation
  const reorderMutation = useMutation({
    mutationFn: (reorderedTasks: { id: number; order: number }[]) =>
      tasksService.reorderTasks(reorderedTasks),
    onSuccess: () => {
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  // Bulk Mutations
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }: { ids: number[]; data: UpdateTaskDto }) =>
      tasksService.bulkUpdate(ids, data),
    onSuccess: () => {
      toast.success(t('tasks.bulk.updated', { defaultValue: 'Tasks updated' }));
      setIsBulkMode(false);
      setSelectedTasks(new Set());
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => tasksService.bulkDelete(ids),
    onSuccess: () => {
      toast.success(t('tasks.bulk.deleted', { defaultValue: 'Tasks deleted' }));
      setIsBulkMode(false);
      setSelectedTasks(new Set());
      if (numericListId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
      }
    },
  });

  // Handlers
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedTasks.findIndex((t) => t.id === active.id);
      const newIndex = sortedTasks.findIndex((t) => t.id === over.id);

      const newTasks = arrayMove(sortedTasks, oldIndex, newIndex);

      // Optimistically update query data
      queryClient.setQueryData(['tasks', numericListId], newTasks);

      // Prepare updates for backend
      // We only strictly need to update the orders to reflect the new sequence.
      // For simplicity, we can just assign new orders based on index.
      const updates = newTasks.map((task, index) => ({
        id: task.id,
        order: index + 1,
      }));

      reorderMutation.mutate(updates);
    },
    [sortedTasks, numericListId, queryClient, reorderMutation]
  );

  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    setSelectedTasks(new Set());
  };

  const handleToggleSelect = (taskId: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-8">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full premium-card" />
          <Skeleton className="h-16 w-full premium-card" />
          <Skeleton className="h-16 w-full premium-card" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="premium-card bg-red-50 dark:bg-red-900/10 p-6 text-center animate-shake">
        <p className="text-red-800 dark:text-red-400 font-bold">
          {formatApiError(error, t('tasks.loadFailed'))}
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto pb-24 ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="mb-8 animate-slide-up">
        <Link
          to="/lists"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-black uppercase tracking-widest text-xs transition-transform hover:-translate-x-1"
        >
          {isRtl ? '→' : '←'} {t('tasks.backToLists')}
        </Link>
      </div>

      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 animate-slide-up"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="min-w-0 flex-1">
          {isEditingListName ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={listNameDraft}
                onChange={(e) => setListNameDraft(e.target.value)}
                autoFocus
                className="flex-1 text-2xl font-black bg-transparent border-b-2 border-primary-500 focus:outline-none dark:text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!list || !listNameDraft.trim()) return;
                    updateListMutation.mutate(
                      { id: list.id, data: { name: listNameDraft.trim() } },
                      { onSuccess: () => setIsEditingListName(false) }
                    );
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => setIsEditingListName(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <h1
              className="text-4xl font-black text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-3"
              onClick={() => !list?.isSystem && setIsEditingListName(true)}
            >
              {list?.name ?? t('tasks.defaultTitle')}
              {!list?.isSystem && (
                <svg
                  className="w-5 h-5 opacity-20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              )}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleBulkMode}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isBulkMode ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
          >
            {isBulkMode
              ? t('common.cancel')
              : t('tasks.bulk.mode', { defaultValue: 'Bulk Actions' })}
          </button>

          {list && !list.isSystem && !isBulkMode && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    t('tasks.deleteListConfirm', { name: list.name })
                  )
                ) {
                  deleteListMutation.mutate({ id: list.id });
                }
              }}
              className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              title={t('tasks.deleteList')}
            >
              <svg
                className="w-6 h-6"
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
          )}
        </div>
      </div>

      {isBulkMode && (
        <div className="animate-slide-down">
          <BulkActionsBar
            isRtl={isRtl}
            selectedCount={selectedTasks.size}
            allTasks={tasks}
            selectedTasks={selectedTasks}
            onToggleSelectAll={handleToggleSelectAll}
            onMarkComplete={() =>
              bulkUpdateMutation.mutate({
                ids: Array.from(selectedTasks),
                data: { completed: true },
              })
            }
            onMarkIncomplete={() =>
              bulkUpdateMutation.mutate({
                ids: Array.from(selectedTasks),
                data: { completed: false },
              })
            }
            onDeleteSelected={() =>
              bulkDeleteMutation.mutate(Array.from(selectedTasks))
            }
            isFinishedList={isFinishedList}
          />
        </div>
      )}

      {showCreate && !isBulkMode && (
        <div className="premium-card p-6 mb-8 animate-scale-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTaskDescription.trim() && numericListId) {
                createTaskMutation.mutate({
                  description: newTaskDescription.trim(),
                });
              }
            }}
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                autoFocus
                placeholder={t('tasks.form.descriptionPlaceholder')}
                className="flex-1 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    createTaskMutation.isPending || !newTaskDescription.trim()
                  }
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {t('common.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-3 bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div
          className="space-y-4 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <SortableContext
            items={sortedTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedTasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                isBulkMode={isBulkMode}
                isSelected={selectedTasks.has(task.id)}
                isFinishedList={isFinishedList}
                isRtl={isRtl}
                onToggleSelect={() => handleToggleSelect(task.id)}
                onToggleComplete={() =>
                  updateTaskMutation.mutate({
                    id: task.id,
                    data: { completed: !task.completed },
                  })
                }
                onDelete={() => deleteTaskMutation.mutate({ id: task.id })}
                onRestore={() => navigate(`/tasks/${task.id}`)} // Or implement quick restore
                onPermanentDelete={() => navigate(`/tasks/${task.id}`)}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {tasks.length === 0 && !isLoading && (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 bg-gray-50 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('tasks.empty')}
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('tasks.form.descriptionPlaceholder')}
          </p>
        </div>
      )}

      {!isBulkMode && (
        <FloatingActionButton
          ariaLabel={t('tasks.createFab')}
          disabled={!numericListId || isFinishedList}
          onClick={() => setShowCreate(true)}
        />
      )}
    </div>
  );
}
