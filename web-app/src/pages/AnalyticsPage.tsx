import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { useTheme } from '../context/ThemeContext';
import { isRtlLanguage } from '@tasks-management/frontend-services';
import Skeleton from '../components/Skeleton';
import CalendarHeatmap from '../components/CalendarHeatmap';
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
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const isRtl = isRtlLanguage(i18n.language);

  const {
    lists,
    allTasks,
    isLoading,
    hasError,
    listsError,
    tasksError,
    listsErrorObj,
    tasksErrorObj,
    refetchLists,
    refetchTasks,
    stats,
    dailyCompletions,
    dailyTrends,
    currentStreak,
  } = useAnalysisData();

  if (hasError && !isLoading) {
    return (
      <div
        className={`space-y-6 ${isRtl ? 'rtl' : ''}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="mb-6">
          <Link
            to="/lists"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium"
          >
            {t('tasks.backToLists')}
          </Link>
        </div>
        <h1 className="premium-header-main">{t('analysis.title')}</h1>
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="text-sm text-red-800 dark:text-red-200 mb-3">
            {listsError
              ? t('analysis.loadListsFailed')
              : t('analysis.loadTasksFailed')}
            : {listsErrorObj?.message || tasksErrorObj?.message}
          </div>
          <div className="flex gap-3">
            {listsError && (
              <button
                onClick={() => refetchLists()}
                className="premium-button bg-red-600"
              >
                {t('analysis.retryLists')}
              </button>
            )}
            {tasksError && (
              <button
                onClick={() => refetchTasks()}
                className="premium-button bg-red-600"
              >
                {t('analysis.retryTasks')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Link to="/lists" className="text-indigo-600 text-sm font-medium">
            {t('tasks.backToLists')}
          </Link>
        </div>
        <Skeleton className="h-9 w-48 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-card p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full premium-card" />
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 animate-fade-in ${isRtl ? 'rtl' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mb-6">
        <Link
          to="/lists"
          className="text-secondary-600 dark:text-secondary-400 hover:underline"
        >
          {t('tasks.backToLists')}
        </Link>
      </div>
      <h1 className="premium-header-main">{t('analysis.title')}</h1>

      {/* Overview Cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up"
        style={{ animationDelay: '0.1s' }}
      >
        <StatCard
          title={t('analysis.totalLists')}
          value={lists.length}
          icon="📁"
        />
        <StatCard
          title={t('analysis.totalTasks')}
          value={allTasks.length}
          icon="📋"
        />
        <StatCard
          title={t('analysis.completed')}
          value={stats.completedTasks.length}
          colorClass="text-green-600 dark:text-green-400"
          icon="✅"
        />
        <StatCard
          title={t('analysis.completionRate')}
          value={`${stats.completionRate.toFixed(1)}%`}
          colorClass="text-primary-600 dark:text-primary-400"
          icon="📈"
        />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        {/* Pie Chart */}
        <div className="premium-card p-8">
          <h2 className="premium-header-section mb-6 flex items-center gap-2">
            <span>📊</span> {t('analysis.completionStatus')}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  {
                    name: t('analysis.completed'),
                    value: stats.completedTasks.length,
                    color: '#10b981',
                  },
                  {
                    name: t('analysis.pending'),
                    value: stats.pendingTasks.length,
                    color: '#ef4444',
                  },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                dataKey="value"
              >
                {[{ color: '#10b981' }, { color: '#ef4444' }].map(
                  (entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  )
                )}
              </Pie>
              <Tooltip />
              <text
                x="50%"
                y="42%"
                textAnchor="middle"
                fill={isDark ? '#fff' : '#374151'}
                fontSize={13}
                fontWeight="600"
              >
                {t('analysis.dailyStreak')}
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap */}
        <div className="premium-card p-8">
          <h2 className="premium-header-section mb-6">
            {t('analysis.dailyActivity')}
          </h2>
          <CalendarHeatmap data={dailyCompletions} days={90} />
        </div>
      </div>

      {/* Bar Chart */}
      <div className="premium-card p-8">
        <h2 className="premium-header-section mb-8">
          {t('analysis.tasksByListChart')}
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={stats.tasksByList}
            margin={{ top: 0, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="listName"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={10}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="completed"
              fill="#10b981"
              name={t('analysis.completed')}
            />
            <Bar
              dataKey="pending"
              fill="#ef4444"
              name={t('analysis.pending')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart */}
      <div className="premium-card p-8">
        <h2 className="premium-header-section mb-8">
          {t('analysis.completionTrends')}
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyTrends}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="label"
              fontSize={10}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="completions"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Due Date Stats */}
        <div className="premium-card p-8">
          <h2 className="premium-header-section mb-6">
            {t('analysis.dueDateOverview')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatRow
              label={t('analysis.overdue')}
              value={stats.overdueTasks.length}
              color="text-red-600"
            />
            <StatRow
              label={t('analysis.dueToday')}
              value={stats.dueTodayTasks.length}
              color="text-orange-600"
            />
            <StatRow
              label={t('analysis.dueThisWeek')}
              value={stats.dueThisWeekTasks.length}
              color="text-yellow-600"
            />
            <StatRow
              label={t('analysis.withDueDates')}
              value={stats.tasksWithDueDates.length}
            />
          </div>
        </div>

        {/* Steps Stats */}
        <div className="premium-card p-8">
          <h2 className="premium-header-section mb-6">
            {t('analysis.stepsProgress')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatRow
              label={t('analysis.tasksWithSteps')}
              value={stats.tasksWithSteps.length}
            />
            <StatRow
              label={t('analysis.stepsCompleted')}
              value={`${stats.completedSteps} / ${stats.totalSteps}`}
              color="text-green-600"
            />
            <StatRow
              label={t('analysis.stepsCompletion')}
              value={`${stats.stepsCompletionRate.toFixed(1)}%`}
              color="text-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  colorClass = 'text-gray-900 dark:text-white',
}: {
  title: string;
  value: string | number;
  icon: string;
  colorClass?: string;
}) {
  return (
    <div className="premium-card p-6 group hover:translate-y-[-4px] transition-all">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
          {title}
        </h3>
        <span className="text-xl group-hover:scale-110 transition-transform">
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-black ${colorClass}`}>{value}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
  color = '',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="glass-card p-4 rounded-xl">
      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
        {label}
      </h4>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}
