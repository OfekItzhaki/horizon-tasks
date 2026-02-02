import { useState, useEffect } from 'react';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import { Task, Step } from '../types';
import { handleApiError, isAuthError, extractErrorMessage } from '../utils/errorHandler';
import { normalizeTask } from '../utils/taskHelpers';

export function useTaskData(taskId: number) {
  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTaskData = async () => {
    try {
      const [taskData, stepsData] = await Promise.all([
        tasksService.getById(taskId),
        stepsService.getByTask(taskId),
      ]);

      setTask(normalizeTask(taskData));
      setSteps(stepsData);
    } catch (error: any) {
      // Silently ignore auth errors - the navigation will handle redirect to login
      if (!isAuthError(error)) {
        handleApiError(error, 'Unable to load task. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTaskData();
  };

  return {
    task,
    steps,
    loading,
    refreshing,
    onRefresh,
    reload: loadTaskData,
    setTask,
    setSteps,
  };
}
