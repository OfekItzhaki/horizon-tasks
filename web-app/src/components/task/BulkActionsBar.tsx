import { useTranslation } from 'react-i18next';
import { Task } from '@tasks-management/frontend-services';

interface BulkActionsBarProps {
    isRtl: boolean;
    selectedCount: number;
    allTasks: Task[];
    selectedTasks: Set<number>;
    onToggleSelectAll: () => void;
    onMarkComplete: () => void;
    onMarkIncomplete: () => void;
    onDeleteSelected: () => void;
    isFinishedList: boolean;
}

export default function BulkActionsBar({
    isRtl,
    selectedCount,
    allTasks,
    selectedTasks,
    onToggleSelectAll,
    onMarkComplete,
    onMarkIncomplete,
    onDeleteSelected,
    isFinishedList,
}: BulkActionsBarProps) {
    const { t } = useTranslation();
    const allSelected = allTasks.length > 0 && allTasks.every((t) => selectedTasks.has(t.id));

    return (
        <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center gap-3 mb-4 p-4 premium-card bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20`}>
            <span className="text-sm font-semibold text-primary-900 dark:text-primary-200">
                {selectedCount} task{selectedCount !== 1 ? 's' : ''} {t('tasks.bulk.selected', { defaultValue: 'selected' })}
            </span>
            <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
                <button
                    type="button"
                    onClick={onToggleSelectAll}
                    className="px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 glass-card rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
                >
                    {allSelected ? t('tasks.bulk.deselectAll', { defaultValue: 'Deselect All' }) : t('tasks.bulk.selectAll', { defaultValue: 'Select All' })}
                </button>
                <button
                    type="button"
                    onClick={onMarkComplete}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 rounded-lg shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40 transition-all duration-200"
                >
                    {t('tasks.bulk.markComplete', { defaultValue: 'Mark Complete' })}
                </button>
                <button
                    type="button"
                    onClick={onMarkIncomplete}
                    disabled={selectedCount === 0}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 disabled:opacity-50 rounded-lg shadow-md shadow-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/40 transition-all duration-200"
                >
                    {t('tasks.bulk.markIncomplete', { defaultValue: 'Mark Incomplete' })}
                </button>
                <button
                    type="button"
                    onClick={onDeleteSelected}
                    disabled={selectedCount === 0 || isFinishedList}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 rounded-lg shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/40 transition-all duration-200"
                >
                    {t('tasks.deleteSelected')}
                </button>
            </div>
        </div>
    );
}
