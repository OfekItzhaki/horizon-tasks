import { Task, ToDoList } from '@tasks-management/frontend-services';

export function calculateDailyCompletions(allTasks: Task[]) {
    const completionMap = new Map<string, number>();
    allTasks.forEach((task) => {
        if (task.completed && task.completedAt) {
            const completionDate = new Date(task.completedAt);
            const key = completionDate.toISOString().split('T')[0];
            completionMap.set(key, (completionMap.get(key) || 0) + 1);
        }
    });
    return Array.from(completionMap.entries()).map(([date, count]) => ({ date, count }));
}

export function calculateStreak(dailyTasks: Task[]) {
    if (dailyTasks.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const allDailyCompletedNow = dailyTasks.every(t => t.completed);

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);

        const tasksCompletedOnDate = dailyTasks.filter((task) => {
            if (!task.completed || !task.completedAt) return false;
            const completedDate = new Date(task.completedAt);
            completedDate.setHours(0, 0, 0, 0);
            return completedDate.getTime() === checkDate.getTime();
        });

        if (i === 0) {
            if (allDailyCompletedNow) streak++; else break;
        } else {
            if (tasksCompletedOnDate.length === dailyTasks.length && dailyTasks.length > 0) streak++; else break;
        }
    }
    return streak;
}

export function calculateTrendData(allTasks: Task[], language: string) {
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

        const label = date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
        trends.push({ date: dateKey, completions: completionsOnDate, label });
    }
    return trends;
}

export function calculateStats(allTasks: Task[], lists: ToDoList[]) {
    const completedTasks = allTasks.filter(t => t.completed);
    const pendingTasks = allTasks.filter(t => !t.completed);
    const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const tasksWithDueDates = allTasks.filter(t => t.dueDate);
    const overdueTasks = tasksWithDueDates.filter(t => {
        const dueDate = new Date(t.dueDate!);
        return dueDate < today && !t.completed;
    });

    const dueTodayTasks = tasksWithDueDates.filter(t => {
        const dueDate = new Date(t.dueDate!);
        return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000) && !t.completed;
    });

    const dueThisWeekTasks = tasksWithDueDates.filter(t => {
        const dueDate = new Date(t.dueDate!);
        return dueDate >= today && dueDate < weekFromNow && !t.completed;
    });

    const tasksWithSteps = allTasks.filter(t => t.steps && t.steps.length > 0);
    const totalSteps = tasksWithSteps.reduce((sum, t) => sum + (t.steps?.length || 0), 0);
    const completedSteps = tasksWithSteps.reduce((sum, t) => sum + (t.steps?.filter(s => s.completed).length || 0), 0);
    const stepsCompletionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    const tasksByList = lists.map(list => {
        const listTasks = allTasks.filter(t => t.todoListId === list.id);
        return {
            listName: list.name,
            total: listTasks.length,
            completed: listTasks.filter(t => t.completed).length,
            pending: listTasks.filter(t => !t.completed).length,
        };
    });

    return {
        completedTasks,
        pendingTasks,
        completionRate,
        overdueTasks,
        dueTodayTasks,
        dueThisWeekTasks,
        tasksWithDueDates,
        tasksWithSteps,
        totalSteps,
        completedSteps,
        stepsCompletionRate,
        tasksByList,
    };
}
