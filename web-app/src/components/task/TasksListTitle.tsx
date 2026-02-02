import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ListWithSystemFlag } from '../../hooks/useTasksData';
import { UpdateToDoListDto } from '@tasks-management/frontend-services';

interface TasksListTitleProps {
    list: ListWithSystemFlag | undefined;
    isRtl: boolean;
    onUpdateList: (id: number, data: UpdateToDoListDto) => void;
}

export default function TasksListTitle({
    list,
    isRtl,
    onUpdateList,
}: TasksListTitleProps) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState('');

    useEffect(() => {
        if (list) setNameDraft(list.name);
    }, [list]);

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2 items-center w-full">
                <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    aria-label="Edit list name"
                    autoFocus
                    className="w-full max-w-xl rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="flex gap-2 justify-center">
                    <button
                        type="button"
                        disabled={!list || !nameDraft.trim()}
                        onClick={() => {
                            if (!list) return;
                            onUpdateList(list.id, { name: nameDraft.trim() });
                            setIsEditing(false);
                            toast.success(t('tasks.listUpdated'));
                        }}
                        className="inline-flex justify-center rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200"
                    >
                        {t('common.save')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsEditing(false);
                            setNameDraft(list?.name ?? '');
                        }}
                        className="inline-flex justify-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <h1
            className="premium-header-main cursor-text hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
            title={t('tasks.renameTitle')}
            onClick={() => {
                if (!list || list.isSystem) return;
                setIsEditing(true);
            }}
            role="button"
            tabIndex={0}
            aria-label={`List name: ${list?.name ?? t('tasks.defaultTitle')}. Click to edit.`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!list || list.isSystem) return;
                    setIsEditing(true);
                }
            }}
        >
            {list?.name ?? t('tasks.defaultTitle')}
        </h1>
    );
}
