import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
    Task,
    ApiError,
    CreateTaskDto,
    ToDoList,
    UpdateToDoListDto,
    UpdateTaskDto
} from '@tasks-management/frontend-services';
import { tasksService } from '../services/tasks.service';
import { listsService } from '../services/lists.service';
import { useQueuedMutation } from './useQueuedMutation';
import { handleApiError } from '../utils/errorHandler';
import { cancelAllTaskNotifications } from '../services/notifications.service';

export type ListWithSystemFlag = ToDoList & { isSystem?: boolean };

export function useTasksData(numericListId: number | null) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Queries
    const listQuery = useQuery<ListWithSystemFlag, ApiError>({
        queryKey: ['list', numericListId],
        enabled: typeof numericListId === 'number' && !Number.isNaN(numericListId),
        initialData: () => {
            if (typeof numericListId !== 'number' || Number.isNaN(numericListId)) {
                return undefined;
            }
            const cachedLists = queryClient.getQueryData<ListWithSystemFlag[]>(['lists']);
            return cachedLists?.find((l) => l.id === numericListId);
        },
        queryFn: () => listsService.getListById(numericListId as number),
    });

    const tasksQuery = useQuery<Task[], ApiError>({
        queryKey: ['tasks', numericListId],
        enabled: typeof numericListId === 'number' && !Number.isNaN(numericListId),
        placeholderData: keepPreviousData,
        queryFn: () => tasksService.getTasksByList(numericListId as number),
    });

    // Mutations
    const updateListMutation = useMutation<
        ListWithSystemFlag,
        ApiError,
        { id: number; data: UpdateToDoListDto },
        { previousList?: ListWithSystemFlag; previousLists?: ListWithSystemFlag[] }
    >({
        mutationFn: ({ id, data }) => listsService.updateList(id, data),
        onMutate: ({ id, data }) => {
            const previousList = queryClient.getQueryData<ListWithSystemFlag>(['list', id]);
            const previousLists = queryClient.getQueryData<ListWithSystemFlag[]>(['lists']);

            queryClient.setQueryData<ListWithSystemFlag>(['list', id], (old) =>
                old ? { ...old, ...data, updatedAt: new Date().toISOString() } : old,
            );
            queryClient.setQueryData<ListWithSystemFlag[]>(['lists'], (old = []) =>
                old.map((l) => (l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l)),
            );

            return { previousList, previousLists };
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.previousList) queryClient.setQueryData(['list', ctx.previousList.id], ctx.previousList);
            if (ctx?.previousLists) queryClient.setQueryData(['lists'], ctx.previousLists);
            handleApiError(err, t('tasks.listUpdateFailed'));
        },
        onSettled: (_data, _err, vars) => {
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
            const previousLists = queryClient.getQueryData<ListWithSystemFlag[]>(['lists']);
            queryClient.setQueryData<ListWithSystemFlag[]>(['lists'], (old = []) =>
                old.filter((l) => l.id !== id),
            );
            return { previousLists };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lists'] });
            toast.success(t('tasks.listDeleted'));
            navigate('/lists');
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.previousLists) queryClient.setQueryData(['lists'], ctx.previousLists);
            handleApiError(err, t('tasks.listDeleteFailed'));
        },
    });

    const createTaskMutation = useMutation<Task, ApiError, CreateTaskDto, { previousTasks?: Task[] }>({
        mutationFn: (data) => tasksService.createTask(numericListId as number, data),
        onMutate: (data) => {
            if (!numericListId) return { previousTasks: undefined };
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks', numericListId]);
            const now = new Date().toISOString();
            const optimistic: Task = {
                id: -Date.now(),
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
            queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) => [optimistic, ...old]);
            return { previousTasks };
        },
        onError: (err, _data, ctx) => {
            if (numericListId && ctx?.previousTasks) queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
            handleApiError(err, t('tasks.createFailed'));
        },
        onSettled: () => {
            if (numericListId) queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
        },
    });

    const deleteTaskMutation = useQueuedMutation<Task, ApiError, { id: number }, { previousTasks?: Task[] }>({
        mutationFn: ({ id }) => tasksService.deleteTask(id),
        onMutate: ({ id }) => {
            if (!numericListId) return { previousTasks: undefined };
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks', numericListId]);
            queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) => old.filter((t) => t.id !== id));
            return { previousTasks };
        },
        onError: (err, _vars, ctx) => {
            if (numericListId && ctx?.previousTasks) queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
            handleApiError(err, t('tasks.deleteFailed'));
        },
        onSuccess: (_data, vars) => {
            cancelAllTaskNotifications(vars.id);
            toast.success(t('tasks.taskDeleted'));
        },
        onSettled: () => {
            if (numericListId) queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
        },
    });

    const updateTaskMutation = useQueuedMutation<
        Task,
        ApiError,
        { id: number; data: UpdateTaskDto },
        { previousTasks?: Task[]; previousTask?: Task }
    >({
        mutationFn: ({ id, data }) => tasksService.updateTask(id, data),
        onMutate: ({ id, data }) => {
            const previousTasks = numericListId ? queryClient.getQueryData<Task[]>(['tasks', numericListId]) : undefined;
            const previousTask = queryClient.getQueryData<Task>(['task', id]);
            const now = new Date().toISOString();

            if (numericListId) {
                queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) =>
                    old.map((t) => (t.id === id ? { ...t, ...data, updatedAt: now } : t)),
                );
            }
            if (previousTask) {
                queryClient.setQueryData<Task>(['task', id], { ...previousTask, ...data, updatedAt: now });
            }
            return { previousTasks, previousTask };
        },
        onError: (err, vars, ctx) => {
            if (numericListId && ctx?.previousTasks) queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
            if (ctx?.previousTask) queryClient.setQueryData(['task', vars.id], ctx.previousTask);
            handleApiError(err, t('taskDetails.updateTaskFailed'));
        },
        onSettled: (_data, _err, vars) => {
            if (numericListId) queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
            queryClient.invalidateQueries({ queryKey: ['task', vars.id] });
        },
    });

    const reorderTasksMutation = useMutation<void, ApiError, { taskIds: number[] }>({
        mutationFn: async ({ taskIds }) => {
            const updatePromises = taskIds.map((taskId, index) =>
                tasksService.updateTask(taskId, { order: index + 1 }),
            );
            await Promise.all(updatePromises);
        },
        onSuccess: () => {
            toast.success(t('tasks.reordered') || 'Tasks reordered');
            if (numericListId) queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
        },
        onError: (err) => {
            handleApiError(err, t('tasks.reorderFailed'));
        },
    });

    const restoreTaskMutation = useQueuedMutation<Task, ApiError, { id: number }, { previousTasks?: Task[] }>({
        mutationFn: ({ id }) => tasksService.restoreTask(id),
        onMutate: ({ id }) => {
            if (!numericListId) return { previousTasks: undefined };
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks', numericListId]);
            queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) => old.filter((t) => t.id !== id));
            return { previousTasks };
        },
        onError: (err, _vars, ctx) => {
            if (numericListId && ctx?.previousTasks) queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
            handleApiError(err, t('tasks.restoreFailed'));
        },
        onSuccess: (restored) => {
            toast.success(t('tasks.restored'));
            if (typeof restored.todoListId === 'number') {
                queryClient.invalidateQueries({ queryKey: ['tasks', restored.todoListId] });
            }
        },
        onSettled: () => {
            if (numericListId) queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
        },
    });

    const permanentDeleteTaskMutation = useQueuedMutation<Task, ApiError, { id: number }, { previousTasks?: Task[] }>({
        mutationFn: ({ id }) => tasksService.permanentDeleteTask(id),
        onMutate: ({ id }) => {
            if (!numericListId) return { previousTasks: undefined };
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks', numericListId]);
            queryClient.setQueryData<Task[]>(['tasks', numericListId], (old = []) => old.filter((t) => t.id !== id));
            return { previousTasks };
        },
        onError: (err, _vars, ctx) => {
            if (numericListId && ctx?.previousTasks) queryClient.setQueryData(['tasks', numericListId], ctx.previousTasks);
            handleApiError(err, t('tasks.deleteForeverFailed'));
        },
        onSuccess: (_data, vars) => {
            cancelAllTaskNotifications(vars.id);
            toast.success(t('tasks.deletedForever'));
        },
        onSettled: () => {
            if (numericListId) queryClient.invalidateQueries({ queryKey: ['tasks', numericListId] });
        },
    });

    return {
        list: listQuery.data,
        tasks: tasksQuery.data,
        isLoading: listQuery.isLoading || tasksQuery.isLoading,
        isError: listQuery.isError || tasksQuery.isError,
        error: listQuery.error || tasksQuery.error,
        refetchTasks: tasksQuery.refetch,
        updateList: updateListMutation.mutate,
        deleteList: deleteListMutation.mutate,
        createTask: createTaskMutation.mutate,
        deleteTask: deleteTaskMutation.mutate,
        restoreTask: restoreTaskMutation.mutate,
        permanentDeleteTask: permanentDeleteTaskMutation.mutate,
        updateTask: updateTaskMutation.mutate,
        reorderTasks: reorderTasksMutation.mutate,
        isMutating:
            updateListMutation.isPending ||
            deleteListMutation.isPending ||
            createTaskMutation.isPending ||
            deleteTaskMutation.isPending ||
            restoreTaskMutation.isPending ||
            permanentDeleteTaskMutation.isPending ||
            updateTaskMutation.isPending,
    };
}
