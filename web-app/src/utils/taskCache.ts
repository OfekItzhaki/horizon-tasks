import type { QueryClient } from '@tanstack/react-query';
import type { Task } from '@tasks-management/frontend-services';

/**
 * Get a task from cache by ID (from task query or from any tasks list query).
 */
export function getCachedTaskById(
  queryClient: QueryClient,
  taskId: number | null,
): Task | undefined {
  if (typeof taskId !== 'number' || Number.isNaN(taskId)) {
    return undefined;
  }

  const direct = queryClient.getQueryData<Task>(['task', taskId]);
  if (direct) return direct;

  const candidates = queryClient.getQueriesData<Task[]>({
    queryKey: ['tasks'],
  });
  for (const [, tasks] of candidates) {
    const found = tasks?.find((t) => t.id === taskId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Invalidate task and tasks list queries for a given task.
 */
export function invalidateTaskQueries(
  queryClient: QueryClient,
  task: Task,
): void {
  queryClient.invalidateQueries({ queryKey: ['task', task.id] });
  if (task.todoListId) {
    queryClient.invalidateQueries({ queryKey: ['tasks', task.todoListId] });
  }
}
