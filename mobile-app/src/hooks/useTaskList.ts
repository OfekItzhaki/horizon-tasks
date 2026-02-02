import { useState, useEffect } from 'react';
import { tasksService } from '../services/tasks.service';
import { Task } from '../types';
import { handleApiError, isAuthError } from '../utils/errorHandler';
import { normalizeTasks, filterTasksByQuery, sortTasks } from '../utils/taskHelpers';
import type { SortOption } from '../utils/taskHelpers';

export function useTaskList(listId: number) {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTasks = async () => {
    try {
      const data = await tasksService.getAll(listId);
      const normalizedTasks = normalizeTasks(data);
      setAllTasks(normalizedTasks);
    } catch (error: any) {
      // Silently ignore auth errors - the navigation will handle redirect to login
      if (!isAuthError(error)) {
        handleApiError(error, 'Unable to load tasks. Please try again later.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [listId]);

  // Apply filtering and sorting whenever dependencies change
  useEffect(() => {
    const filtered = filterTasksByQuery(allTasks, searchQuery);
    const sorted = sortTasks(filtered, sortBy);
    setTasks(sorted);
  }, [searchQuery, sortBy, allTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  return {
    tasks,
    allTasks,
    loading,
    refreshing,
    sortBy,
    searchQuery,
    setAllTasks,
    setSortBy,
    setSearchQuery,
    onRefresh,
    reload: loadTasks,
  };
}
