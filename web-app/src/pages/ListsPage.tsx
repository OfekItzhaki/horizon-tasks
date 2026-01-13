import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listsService } from '../services/lists.service';
import { tasksService } from '../services/tasks.service';
import { ToDoList, ApiError, ListType } from '@tasks-management/frontend-services';
import { formatApiError } from '../utils/formatApiError';
import FloatingActionButton from '../components/FloatingActionButton';
import Skeleton from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';

export default function ListsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');

  const {
    data: lists = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ToDoList[], ApiError>({
    queryKey: ['lists'],
    queryFn: () => listsService.getAllLists(),
  });

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      handler: () => {
        if (!showCreate) {
          setShowCreate(true);
        }
      },
      description: 'Create new list',
    },
    {
      key: 'Escape',
      handler: () => {
        if (showCreate) {
          setShowCreate(false);
          setNewListName('');
        }
      },
      description: 'Cancel creating list',
    },
  ]);

  const createListMutation = useMutation<
    ToDoList,
    ApiError,
    { name: string },
    { previousLists?: ToDoList[] }
  >({
    mutationFn: (data) => listsService.createList(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] });

      const previousLists = queryClient.getQueryData<ToDoList[]>(['lists']);
      const now = new Date().toISOString();
      const tempId = -Date.now();

      const optimistic: ToDoList = {
        id: tempId,
        name: data.name,
        ownerId: 0,
        order: Date.now(),
        // User-created lists are always CUSTOM (type is an internal backend detail).
        type: ListType.CUSTOM,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        tasks: [],
      };

      queryClient.setQueryData<ToDoList[]>(['lists'], (old = []) => [
        optimistic,
        ...old,
      ]);

      return { previousLists };
    },
    onError: (err, _data, ctx) => {
      if (ctx?.previousLists) {
        queryClient.setQueryData(['lists'], ctx.previousLists);
      }
      toast.error(formatApiError(err, t('lists.createFailed')));
    },
    onSuccess: () => {
      setNewListName('');
      setShowCreate(false);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6 gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6 bg-white dark:bg-[#1f1f1f] rounded-lg shadow">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-3 h-4 w-24" />
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
          {formatApiError(error, t('lists.loadFailed'))}
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
      <div className="flex justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('lists.title')}</h1>
      </div>

      {showCreate && (
        <form
          className="bg-white dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-[#2a2a2a] p-4 mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newListName.trim()) return;
            createListMutation.mutate({
              name: newListName.trim(),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-10">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('lists.form.nameLabel')}
              </label>
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('lists.form.namePlaceholder')}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createListMutation.isPending || !newListName.trim()}
                className="inline-flex flex-1 justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createListMutation.isPending ? t('common.loading') : t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewListName('');
                }}
                className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-[#2a2a2a] px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#333333]"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('lists.form.tip')}
          </p>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={`/lists/${list.id}/tasks`}
            onMouseEnter={() => {
              // Prefetch tasks + list details for snappy navigation.
              void queryClient.prefetchQuery({
                queryKey: ['tasks', list.id],
                queryFn: () => tasksService.getTasksByList(list.id),
              });
              void queryClient.prefetchQuery({
                queryKey: ['list', list.id],
                queryFn: () => listsService.getListById(list.id),
              });
            }}
            onFocus={() => {
              // Keyboard navigation
              void queryClient.prefetchQuery({
                queryKey: ['tasks', list.id],
                queryFn: () => tasksService.getTasksByList(list.id),
              });
              void queryClient.prefetchQuery({
                queryKey: ['list', list.id],
                queryFn: () => listsService.getListById(list.id),
              });
            }}
            onPointerDown={() => {
              // Touch devices (no hover)
              void queryClient.prefetchQuery({
                queryKey: ['tasks', list.id],
                queryFn: () => tasksService.getTasksByList(list.id),
              });
              void queryClient.prefetchQuery({
                queryKey: ['list', list.id],
                queryFn: () => listsService.getListById(list.id),
              });
            }}
            className="block p-6 bg-white dark:bg-[#1f1f1f] rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{list.name}</h3>
          </Link>
        ))}
      </div>

      {lists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('lists.empty')}</p>
        </div>
      )}

      <FloatingActionButton
        ariaLabel={t('lists.createFab')}
        onClick={() => setShowCreate(true)}
      />
    </div>
  );
}
