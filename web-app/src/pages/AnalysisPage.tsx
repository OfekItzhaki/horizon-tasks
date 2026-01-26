import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listsService } from '../services/lists.service';
import { tasksService } from '../services/tasks.service';
import { ToDoList, Task } from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';
import Skeleton from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { isRtlLanguage } from '@tasks-management/frontend-services';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import CalendarHeatmap from '../components/CalendarHeatmap';

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
      <div className={`space-y-6 ${isRtl ? 'rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <h1 className={`text-3xl font-bold text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'}`}>
          {t('analysis.title', { defaultValue: 'Task Analysis' })}
        </h1>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className={`text-sm text-red-800 dark:text-red-200 mb-3 ${isRtl ? 'text-right' : 'text-left'}`}>
            {listsError
              ? `${t('analysis.loadListsFailed', { defaultValue: 'Failed to load lists' })}: ${listsErrorObj?.message || t('common.unknownError', { defaultValue: 'Unknown error' })}`
              : tasksError
              ? `${t('analysis.loadTasksFailed', { defaultValue: 'Failed to load tasks' })}: ${tasksErrorObj?.message || t('common.unknownError', { defaultValue: 'Unknown error' })}`
              : t('common.errorOccurred', { defaultValue: 'An error occurred' })}
          </div>
          <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {listsError && (
              <button
                onClick={() => refetchLists()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                {t('analysis.retryLists', { defaultValue: 'Retry Lists' })}
              </button>
            )}
            {tasksError && (
              <button
                onClick={() => refetchTasks()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                {t('analysis.retryTasks', { defaultValue: 'Retry Tasks' })}
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

  // Calculate daily task completion data
  const dailyList = lists.find((list) => list.type === 'DAILY');
  const dailyTasks = dailyList ? allTasks.filter((task) => task.todoListId === dailyList.id) : [];
  const allDailyCompleted = dailyTasks.length > 0 && dailyTasks.every((task) => task.completed);
  
  // Calculate daily completions for calendar heatmap
  const dailyCompletions = useMemo(() => {
    const completionMap = new Map<string, number>();
    
    // Process all tasks (not just daily) to show overall activity
    allTasks.forEach((task) => {
      if (task.completed && task.completedAt) {
        const completionDate = new Date(task.completedAt);
        const dateKey = completionDate.toISOString().split('T')[0]; // YYYY-MM-DD
        completionMap.set(dateKey, (completionMap.get(dateKey) || 0) + 1);
      }
    });
    
    return Array.from(completionMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }, [allTasks]);

  // Calculate daily streak based on daily tasks completion
  const calculateDailyStreak = () => {
    if (dailyTasks.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    
    // Check backwards from today
    for (let i = 0; i < 365; i++) { // Check up to a year back
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = checkDate.toISOString().split('T')[0];
      
      // Check if all daily tasks were completed on this date
      const tasksCompletedOnDate = dailyTasks.filter((task) => {
        if (!task.completed || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === checkDate.getTime();
      });
      
      // For today, check if all tasks are currently completed
      if (i === 0) {
        if (allDailyCompleted) {
          streak++;
        } else {
          break; // Streak broken today
        }
      } else {
        // For past days, check if all tasks were completed on that day
        // This is an approximation - we check if at least one task was completed on that day
        // and assume if tasks exist, they should all be completed for the streak
        if (tasksCompletedOnDate.length === dailyTasks.length && dailyTasks.length > 0) {
          streak++;
        } else {
          break; // Streak broken
        }
      }
    }
    
    return streak;
  };
  
  const currentStreak = calculateDailyStreak();

  // Calculate completion trends for the last 30 days
  const completionTrends = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trends: Array<{ date: string; completions: number; label: string }> = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const completionsOnDate = allTasks.filter((task) => {
        if (!task.completed || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === date.getTime();
      }).length;
      
      const label = date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
      trends.push({ date: dateKey, completions: completionsOnDate, label });
    }
    
    return trends;
  }, [allTasks]);


  if (isLoading) {
    return (
      <div className={`space-y-6 ${isRtl ? 'rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <Skeleton className="h-9 w-48 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-card p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="premium-card p-6">
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
    <div className={`space-y-6 animate-fade-in ${isRtl ? 'rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-4xl font-bold gradient-text text-center">{t('analysis.title', { defaultValue: 'Task Analysis' })}</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="premium-card p-6">
          <h3 className={`text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.totalLists', { defaultValue: 'Total Lists' })}
          </h3>
          <p className={`text-4xl font-bold text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'}`}>{lists.length}</p>
        </div>
        <div className="premium-card p-6">
          <h3 className={`text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.totalTasks', { defaultValue: 'Total Tasks' })}
          </h3>
          <p className={`text-4xl font-bold text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'}`}>{allTasks.length}</p>
        </div>
        <div className="premium-card p-6">
          <h3 className={`text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.completed', { defaultValue: 'Completed' })}
          </h3>
          <p className={`text-4xl font-bold text-green-600 dark:text-green-400 ${isRtl ? 'text-right' : 'text-left'}`}>
            {completedTasks.length}
          </p>
        </div>
        <div className="premium-card p-6">
          <h3 className={`text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.completionRate', { defaultValue: 'Completion Rate' })}
          </h3>
          <p className={`text-4xl font-bold text-primary-600 dark:text-primary-400 ${isRtl ? 'text-right' : 'text-left'}`}>
            {completionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        {/* Completion Status Pie Chart with Streak */}
        {allTasks.length > 0 && (
          <div className="premium-card p-8">
            <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
              {t('analysis.completionStatus', { defaultValue: 'Completion Status' })}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: t('analysis.completed', { defaultValue: 'Completed' }), value: completedTasks.length, color: '#10b981' },
                    { name: t('analysis.pending', { defaultValue: 'Pending' }), value: pendingTasks.length, color: '#ef4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={90}
                  innerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: t('analysis.completed', { defaultValue: 'Completed' }), value: completedTasks.length, color: '#10b981' },
                    { name: t('analysis.pending', { defaultValue: 'Pending' }), value: pendingTasks.length, color: '#ef4444' },
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
                {/* Center text showing streak - cleaner layout */}
                <text
                  x="50%"
                  y="42%"
                  textAnchor="middle"
                  fill={isDark ? '#ffffff' : '#374151'}
                  fontSize={13}
                  fontWeight="600"
                >
                  {t('analysis.dailyStreak', { defaultValue: 'Daily Streak' })}
                </text>
                <text
                  x="50%"
                  y="52%"
                  textAnchor="middle"
                  fill={isDark ? '#10b981' : '#059669'}
                  fontSize={28}
                  fontWeight="bold"
                >
                  {currentStreak}
                </text>
                <text
                  x="50%"
                  y="60%"
                  textAnchor="middle"
                  fill={isDark ? '#9ca3af' : '#6b7280'}
                  fontSize={11}
                >
                  {currentStreak === 1 
                    ? t('analysis.day', { defaultValue: 'day' })
                    : t('analysis.days', { defaultValue: 'days' })}
                </text>
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend with better spacing */}
            <div className={`flex items-center justify-center gap-6 mt-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('analysis.pending', { defaultValue: 'Pending' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('analysis.completed', { defaultValue: 'Completed' })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Daily Completion Activity Calendar Heatmap */}
        <div className="premium-card p-8">
          <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.dailyActivity', { defaultValue: 'Daily Completion Activity' })}
          </h2>
          <CalendarHeatmap data={dailyCompletions} days={90} />
        </div>
      </div>

      {/* Tasks by List Bar Chart */}
      {tasksByList.length > 0 && (
        <div className="premium-card p-8">
          <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.tasksByListChart', { defaultValue: 'Tasks by List (Chart)' })}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={tasksByList.map((item) => ({
                name: item.listName.length > 10 ? item.listName.substring(0, 10) + '...' : item.listName,
                fullName: item.listName,
                completed: item.completed,
                pending: item.pending,
                total: item.total,
              }))}
              margin={{ top: 0, right: isRtl ? 50 : 30, left: isRtl ? 5 : 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4b5563' : '#374151'} opacity={0.1} />
              <XAxis
                dataKey="name"
                angle={isRtl ? 45 : -45}
                textAnchor={isRtl ? 'start' : 'end'}
                height={100}
                interval={0}
                stroke={isDark ? '#9ca3af' : '#6b7280'}
                tick={{ 
                  fill: isDark ? '#9ca3af' : '#6b7280',
                  fontSize: 10,
                  dy: 8,
                  dx: isRtl ? -5 : 5
                }}
                tickMargin={8}
              />
              <YAxis 
                stroke={isDark ? '#9ca3af' : '#6b7280'} 
                style={{ fontSize: '12px' }}
                width={isRtl ? 50 : undefined}
                orientation={isRtl ? 'right' : 'left'}
                allowDecimals={false}
                tick={{ 
                  fill: isDark ? '#9ca3af' : '#6b7280',
                  fontSize: 12,
                  dx: isRtl ? 10 : 0
                }}
                tickMargin={isRtl ? 5 : 5}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                  border: isDark ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDark ? '#ffffff' : '#1f2937',
                }}
                formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name ?? '']}
                labelFormatter={(label) => `${t('analysis.list', { defaultValue: 'List' })}: ${label}`}
              />
              <Bar dataKey="completed" fill="#10b981" name={t('analysis.completed', { defaultValue: 'Completed' })} />
              <Bar dataKey="pending" fill="#ef4444" name={t('analysis.pending', { defaultValue: 'Pending' })} />
            </BarChart>
          </ResponsiveContainer>
          {/* Custom Legend with better spacing */}
          <div className={`flex items-center justify-center gap-6 -mt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('analysis.pending', { defaultValue: 'Pending' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('analysis.completed', { defaultValue: 'Completed' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Trends Line Chart */}
      {completionTrends.length > 0 && (
        <div className="premium-card p-8">
          <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.completionTrends', { defaultValue: 'Completion Trends (Last 30 Days)' })}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={completionTrends}
              margin={{ top: 0, right: isRtl ? 50 : 30, left: isRtl ? 5 : 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4b5563' : '#374151'} opacity={0.1} />
              <XAxis
                dataKey="label"
                stroke={isDark ? '#9ca3af' : '#6b7280'}
                angle={isRtl ? 45 : -45}
                textAnchor={isRtl ? 'start' : 'end'}
                height={80}
                interval={completionTrends.length > 10 ? Math.floor(completionTrends.length / 7) : 0}
                tick={{ 
                  fill: isDark ? '#9ca3af' : '#6b7280',
                  fontSize: 10,
                  dy: 8,
                  dx: isRtl ? -5 : 5
                }}
                tickMargin={8}
              />
              <YAxis 
                stroke={isDark ? '#9ca3af' : '#6b7280'} 
                style={{ fontSize: '12px' }}
                width={isRtl ? 50 : undefined}
                orientation={isRtl ? 'right' : 'left'}
                allowDecimals={false}
                tick={{ 
                  fill: isDark ? '#9ca3af' : '#6b7280',
                  fontSize: 12,
                  dx: isRtl ? 10 : 0
                }}
                tickMargin={isRtl ? 5 : 5}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                  border: isDark ? '1px solid #2a2a2a' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: isDark ? '#ffffff' : '#1f2937',
                }}
                formatter={(value: number | undefined) => [`${value ?? 0} ${t('analysis.tasks', { defaultValue: 'tasks' })}`, t('analysis.completions', { defaultValue: 'Completions' })]}
              />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name={t('analysis.tasksCompleted', { defaultValue: 'Tasks Completed' })}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* Custom Legend with better spacing */}
          <div className={`flex items-center justify-center -mt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: '#10b981' }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('analysis.tasksCompleted', { defaultValue: 'Tasks Completed' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Due Date Statistics */}
      {tasksWithDueDates.length > 0 && (
        <div className="premium-card p-8">
          <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.dueDateOverview', { defaultValue: 'Due Date Overview' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.overdue', { defaultValue: 'Overdue' })}
              </h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {overdueTasks.length}
              </p>
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.dueToday', { defaultValue: 'Due Today' })}
              </h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {dueTodayTasks.length}
              </p>
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.dueThisWeek', { defaultValue: 'Due This Week' })}
              </h3>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {dueThisWeekTasks.length}
              </p>
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.withDueDates', { defaultValue: 'With Due Dates' })}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {tasksWithDueDates.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Steps Statistics */}
      {tasksWithSteps.length > 0 && (
        <div className="premium-card p-8">
          <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('analysis.stepsProgress', { defaultValue: 'Steps Progress' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.tasksWithSteps', { defaultValue: 'Tasks with Steps' })}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {tasksWithSteps.length}
              </p>
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.stepsCompleted', { defaultValue: 'Steps Completed' })}
              </h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {completedSteps} / {totalSteps}
              </p>
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analysis.stepsCompletion', { defaultValue: 'Steps Completion' })}
              </h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stepsCompletionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks by List */}
      <div className="premium-card p-8">
        <h2 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
          {t('analysis.tasksByList', { defaultValue: 'Tasks by List' })}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="glass-card">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('analysis.listName', { defaultValue: 'List Name' })}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('analysis.total', { defaultValue: 'Total' })}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('analysis.completed', { defaultValue: 'Completed' })}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('analysis.pending', { defaultValue: 'Pending' })}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t('analysis.progress', { defaultValue: 'Progress' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {tasksByList.map((item, index) => {
                const progress = item.total > 0 ? (item.completed / item.total) * 100 : 0;
                return (
                  <tr key={index}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'}`}>
                      {item.listName}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {item.total}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {item.completed}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 ${isRtl ? 'text-right' : 'text-left'}`}>
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
