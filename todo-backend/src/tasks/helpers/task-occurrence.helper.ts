import { ListType, Task, ToDoList } from '@prisma/client';

export class TaskOccurrenceHelper {
    static shouldAppearOnDate(task: Task & { todoList: ToDoList }, targetDate: Date): boolean {
        const normalizedTarget = new Date(targetDate);
        normalizedTarget.setHours(0, 0, 0, 0);

        // Specific due date takes precedence
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === normalizedTarget.getTime();
        }

        // Specific day of week check
        if (task.specificDayOfWeek !== null) {
            return normalizedTarget.getDay() === task.specificDayOfWeek;
        }

        const list = task.todoList;
        const dayOfWeek = normalizedTarget.getDay();

        switch (list.type) {
            case ListType.DAILY:
                return true;

            case ListType.WEEKLY:
                // Default Sunday if no day specified
                return dayOfWeek === 0;

            case ListType.MONTHLY:
                // Default 1st of month
                return normalizedTarget.getDate() === 1;

            case ListType.YEARLY:
                // Default Jan 1st
                return normalizedTarget.getMonth() === 0 && normalizedTarget.getDate() === 1;

            default:
                return false;
        }
    }

    static calculateNextDueDate(task: Task & { todoList: ToDoList }, fromDate: Date): Date | null {
        const target = new Date(fromDate);
        target.setHours(0, 0, 0, 0);

        if (task.dueDate) {
            const d = new Date(task.dueDate);
            d.setHours(0, 0, 0, 0);
            return d;
        }

        if (task.specificDayOfWeek !== null) {
            const daysUntil = (task.specificDayOfWeek - target.getDay() + 7) % 7;
            const next = new Date(target);
            next.setDate(next.getDate() + (daysUntil || 7));
            next.setHours(0, 0, 0, 0);
            return next;
        }

        const list = task.todoList;
        switch (list.type) {
            case ListType.WEEKLY: {
                const untilSunday = (7 - target.getDay()) % 7 || 7;
                const next = new Date(target);
                next.setDate(next.getDate() + untilSunday);
                next.setHours(0, 0, 0, 0);
                return next;
            }
            case ListType.MONTHLY: {
                const next = new Date(target.getFullYear(), target.getMonth() + 1, 1);
                next.setHours(0, 0, 0, 0);
                return next;
            }
            case ListType.YEARLY: {
                const next = new Date(target.getFullYear() + 1, 0, 1);
                next.setHours(0, 0, 0, 0);
                return next;
            }
            default:
                return null;
        }
    }

    static shouldRemindOnDate(task: Task & { todoList: ToDoList }, targetDate: Date): boolean {
        const dueDate = this.calculateNextDueDate(task, targetDate);
        if (!dueDate) return false;

        const reminderDaysArray = Array.isArray(task.reminderDaysBefore)
            ? task.reminderDaysBefore
            : task.reminderDaysBefore ? [task.reminderDaysBefore] : [1];

        const targetTime = new Date(targetDate);
        targetTime.setHours(0, 0, 0, 0);

        return (reminderDaysArray as number[]).some((days) => {
            const trigger = new Date(dueDate);
            trigger.setDate(trigger.getDate() - days);
            trigger.setHours(0, 0, 0, 0);
            return trigger.getTime() === targetTime.getTime();
        });
    }
}
