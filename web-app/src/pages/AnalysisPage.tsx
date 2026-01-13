import { useQuery } from '@tanstack/react-query';
import { listsService } from '../services/lists.service';
import { tasksService } from '../services/tasks.service';
import { ToDoList, Task } from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';
import Skeleton from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { isRtlLanguage } from '@tasks-management/frontend-services/i18n';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AnalysisPage() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRtl = isRtlLanguage(i18n.language);

  const { data: lists = [], isLoading: listsLoading, isError: listsError, error: listsErrorObj, refetch: refetchLists } = useQuery<ToDoList[]>({
    queryKey: ['lists'],
    queryFn: () => listsService.getAllLists(),
  });

  const { data: allTasks = [], isLoading: tasksLoading, isError: tasksError, error: tasksErrorObj, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const tasksPromises = lists.map((list) => tasksService.getTasksByList(list.id));
      const tasksArrays = await Promise.all(tasksPromises);
      return tasksArrays.flat();
    },
    enabled: lists.length > 0,
  });

  const isLoading = listsLoading || tasksLoading;
  const hasError = listsError || tasksError;

  if (hasError && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Analysis</h1>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="text-sm text-red-800 dark:text-red-200 mb-3">
            {listsError
              ? `Failed to load lists: ${listsErrorObj?.message || 'Unknown error'}`
              : tasksError
              ? `Failed to load tasks: ${tasksErrorObj?.message || 'Unknown error'}`
              : 'An error occurred'}
          </div>
          <div className="flex gap-3">
            {listsError && (
              <button
                onClick={() => refetchLists()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Retry Lists
              </button>
            )}
            {tasksError && (
              <button
                onClick={() => refetchTasks()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Retry Tasks
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const completedTasks = allTasks.filter((task) => task.completed);
  const pendingTasks = allTasks.filter((task) => !task.completed);
  const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

  // Tasks with due dates
  const tasksWithDueDates = allTasks.filter((task) => task.dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const overdueTasks = tasksWithDueDates.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < today && !task.completed;
  });

  const dueTodayTasks = tasksWithDueDates.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000) && !task.completed;
  });

  const dueThisWeekTasks = tasksWithDueDates.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate < weekFromNow && !task.completed;
  });

  // Tasks with steps
  const tasksWithSteps = allTasks.filter((task) => task.steps && task.steps.length > 0);
  const totalSteps = tasksWithSteps.reduce((sum, task) => sum + (task.steps?.length || 0), 0);
  const completedSteps = tasksWithSteps.reduce(
    (sum, task) => sum + (task.steps?.filter((s) => s.completed).length || 0),
    0,
  );
  const stepsCompletionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const tasksByList = lists.map((list) => {
    const listTasks = allTasks.filter((task) => task.todoListId === list.id);
    return {
      listName: list.name,
      total: listTasks.length,
      completed: listTasks.filter((t) => t.completed).length,
      pending: listTasks.filter((t) => !t.completed).length,
    };
  });

  // Calculate daily task completion streak
  const dailyList = lists.find((list) => list.type === 'DAILY');
  const dailyTasks = dailyList ? allTasks.filter((task) => task.todoListId === dailyList.id) : [];
  const allDailyCompleted = dailyTasks.length > 0 && dailyTasks.every((task) => task.completed);
  
  // Simple streak calculation: if all daily tasks are completed today, check if they were completed yesterday, etc.
  // For now, we'll show a streak based on current completion status
  // A more accurate streak would require tracking completion history
  const calculateStreak = () => {
    if (dailyTasks.length === 0) return 0;
    if (!allDailyCompleted) return 0;
    
    // Check if all tasks were completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // For a simple implementation, if all daily tasks are completed, assume streak of 1
    // In a real implementation, you'd check completion history
    const completedToday = dailyTasks.every((task) => {
      // If task has no completedAt, it's not part of the streak
      // This is a simplified version - real streak tracking would need history
      return task.completed;
    });
    
    return completedToday ? 1 : 0; // Simplified: returns 1 if all completed, 0 otherwise
  };
  
  const currentStreak = calculateStreak();


  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Analysis</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Lists</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{lists.length}</p>
        </div>
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{allTasks.length}</p>
        </div>
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {completedTasks.length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {completionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Status Pie Chart with Streak */}
        {allTasks.length > 0 && (
          <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Completion Status
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: completedTasks.length, color: '#10b981' },
                    { name: 'Pending', value: pendingTasks.length, color: '#ef4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Completed', value: completedTasks.length, color: '#10b981' },
                    { name: 'Pending', value: pendingTasks.length, color: '#ef4444' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                    border: isDark ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#1f2937',
                  }}
                />
                <Legend wrapperStyle={{ color: isDark ? '#ffffff' : '#1f2937' }} />
                {/* Center text showing streak */}
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  fill={isDark ? '#ffffff' : '#374151'}
                  fontSize={14}
                  fontWeight="bold"
                >
                  Daily Streak
                </text>
                <text
                  x="50%"
                  y="55%"
                  textAnchor="middle"
                  fill={isDark ? '#10b981' : '#059669'}
                  fontSize={24}
                  fontWeight="bold"
                >
                  {currentStreak}
                </text>
                <text
                  x="50%"
                  y="65%"
                  textAnchor="middle"
                  fill={isDark ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                >
                  {currentStreak === 1 ? 'day' : 'days'}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tasks by List Bar Chart */}
      {tasksByList.length > 0 && (
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Tasks by List (Chart)
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={tasksByList.map((item) => ({
                name: item.listName.length > 15 ? item.listName.substring(0, 15) + '...' : item.listName,
                fullName: item.listName,
                completed: item.completed,
                pending: item.pending,
                total: item.total,
              }))}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4b5563' : '#374151'} opacity={0.1} />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                stroke={isDark ? '#9ca3af' : '#6b7280'}
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1f1f1f' : 'rgba(255, 255, 255, 0.95)',
                  border: isDark ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDark ? '#ffffff' : '#000000',
                }}
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label) => `List: ${label}`}
              />
              <Legend wrapperStyle={{ color: isDark ? '#ffffff' : '#000000' }} />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="pending" fill="#ef4444" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Due Date Statistics */}
      {tasksWithDueDates.length > 0 && (
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Due Date Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {overdueTasks.length}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Today</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {dueTodayTasks.length}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Due This Week</h3>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {dueThisWeekTasks.length}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">With Due Dates</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {tasksWithDueDates.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Steps Statistics */}
      {tasksWithSteps.length > 0 && (
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Steps Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tasks with Steps</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {tasksWithSteps.length}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Steps Completed</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {completedSteps} / {totalSteps}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Steps Completion</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stepsCompletionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks by List */}
      <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tasks by List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-[#1a1a1a]">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  List Name
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  Total
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  Completed
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  Pending
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#1f1f1f] divide-y divide-gray-200 dark:divide-[#2a2a2a]">
              {tasksByList.map((item, index) => {
                const progress = item.total > 0 ? (item.completed / item.total) * 100 : 0;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.listName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      {item.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                      {item.pending}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 dark:bg-[#2a2a2a] rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
