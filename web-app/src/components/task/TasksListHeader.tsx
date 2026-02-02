import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListWithSystemFlag } from '../../hooks/useTasksData';

interface TasksListHeaderProps {
    isRtl: boolean;
    list: ListWithSystemFlag | undefined;
    isBulkMode: boolean;
    isPendingDelete: boolean;
    onDeleteList: (id: number) => void;
}

export default function TasksListHeader({
    isRtl,
    list,
    isBulkMode,
    isPendingDelete,
    onDeleteList,
}: TasksListHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} justify-between items-center mb-6`}>
            <Link
                to="/lists"
                className={`text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-semibold flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''} glass-card px-4 py-2 rounded-xl w-fit hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200`}
            >
                <span className={isRtl ? 'transform rotate-180' : ''}>←</span>
                <span>{t('tasks.backToLists').replace('← ', '')}</span>
            </Link>
            {list && !list.isSystem && !isBulkMode && (
                <button
                    type="button"
                    disabled={isPendingDelete}
                    onClick={() => {
                        const ok = window.confirm(
                            t('tasks.deleteListConfirm', { name: list.name }),
                        );
                        if (!ok) return;
                        onDeleteList(list.id);
                    }}
                    className="inline-flex justify-center rounded-xl glass-card px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {t('tasks.deleteList')}
                </button>
            )}
        </div>
    );
}
