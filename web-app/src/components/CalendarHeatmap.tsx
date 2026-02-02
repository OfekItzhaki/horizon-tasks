import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface CalendarHeatmapProps {
  data: Array<{ date: string; count: number }>;
  days?: number; // Number of days to show (default: 90)
}

export default function CalendarHeatmap({ data, days = 90 }: CalendarHeatmapProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // Create a map for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      const dateKey = item.date.split('T')[0]; // Get YYYY-MM-DD
      map.set(dateKey, item.count);
    });
    return map;
  }, [data]);

  // Generate calendar data for the last N days
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dates: Array<{ date: Date; count: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const count = dataMap.get(dateKey) || 0;
      dates.push({ date, count });
    }
    
    return dates;
  }, [days, dataMap]);

  // Get intensity color based on count
  const getColor = (count: number): string => {
    if (count === 0) return isDark ? '#1f2937' : '#e5e7eb';
    if (count === 1) return '#10b981';
    if (count === 2) return '#059669';
    if (count >= 3) return '#047857';
    return isDark ? '#1f2937' : '#e5e7eb';
  };

  // Group by weeks (starting from the first day of the first week)
  const weeks = useMemo(() => {
    if (calendarData.length === 0) return [];
    
    const weekGroups: Array<Array<{ date: Date; count: number }>> = [];
    const firstDate = calendarData[0].date;
    const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Add empty days at the start to align with Sunday
    const alignedData: Array<{ date: Date; count: number }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDate = new Date(firstDate);
      emptyDate.setDate(emptyDate.getDate() - (firstDayOfWeek - i));
      alignedData.push({ date: emptyDate, count: 0 });
    }
    alignedData.push(...calendarData);
    
    // Group into weeks of 7 days
    for (let i = 0; i < alignedData.length; i += 7) {
      weekGroups.push(alignedData.slice(i, i + 7));
    }
    
    return weekGroups;
  }, [calendarData]);

  // Calculate total days with completions
  const totalDaysWithCompletions = useMemo(() => {
    return calendarData.filter((item) => item.count > 0).length;
  }, [calendarData]);

  // Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateKey = checkDate.toISOString().split('T')[0];
      const count = dataMap.get(dateKey) || 0;
      
      if (count > 0) {
        streak++;
      } else if (i === 0) {
        // Today has no completions, streak is 0
        break;
      } else {
        // Found a day with no completions, streak ends
        break;
      }
    }
    
    return streak;
  }, [days, dataMap]);

  // Calculate longest streak
  const longestStreak = useMemo(() => {
    let maxStreak = 0;
    let currentStreakCount = 0;
    
    calendarData.forEach((item) => {
      if (item.count > 0) {
        currentStreakCount++;
        maxStreak = Math.max(maxStreak, currentStreakCount);
      } else {
        currentStreakCount = 0;
      }
    });
    
    return maxStreak;
  }, [calendarData]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">{currentStreak}</div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('analysis.currentStreak', { defaultValue: 'Current Streak' })}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">{longestStreak}</div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('analysis.longestStreak', { defaultValue: 'Longest Streak' })}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">{totalDaysWithCompletions}</div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('analysis.totalDays', { defaultValue: 'Total Days' })}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1.5">
              {week.map((day, dayIndex) => {
                const dateKey = day.date.toISOString().split('T')[0];
                const count = dataMap.get(dateKey) || 0;
                const color = getColor(count);
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="w-4 h-4 rounded transition-all hover:scale-125 hover:ring-2 hover:ring-primary-500/50 cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={`${dateKey}: ${count} ${count === 1 ? 'completion' : 'completions'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('analysis.less', { defaultValue: 'Less' })}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }} />
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#059669' }} />
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#047857' }} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('analysis.more', { defaultValue: 'More' })}
        </span>
      </div>
    </div>
  );
}
