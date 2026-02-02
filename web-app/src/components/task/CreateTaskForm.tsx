import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateTaskDto } from '@tasks-management/frontend-services';

interface CreateTaskFormProps {
    isRtl: boolean;
    isPending: boolean;
    isFinishedList: boolean;
    onCreateTask: (data: CreateTaskDto) => void;
    onCancel: () => void;
}

export default function CreateTaskForm({
    isRtl,
    isPending,
    isFinishedList,
    onCreateTask,
    onCancel,
}: CreateTaskFormProps) {
    const { t } = useTranslation();
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || isFinishedList) return;
        onCreateTask({ description: description.trim() });
        setDescription('');
    };

    return (
        <form className="premium-card p-6 mb-8 animate-slide-down" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-10">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                        {t('tasks.form.descriptionLabel')}
                    </label>
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        aria-label={t('tasks.form.descriptionLabel')}
                        className="premium-input w-full text-gray-900 dark:text-white"
                        placeholder={t('tasks.form.descriptionPlaceholder')}
                        autoFocus
                    />
                </div>
                <div className={`sm:col-span-2 flex ${isRtl ? 'flex-row-reverse' : ''} gap-2`}>
                    <button
                        type="submit"
                        disabled={isPending || isFinishedList || !description.trim()}
                        className="inline-flex flex-1 justify-center rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200"
                    >
                        {isPending ? t('common.loading') : t('common.create')}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex justify-center rounded-xl glass-card px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </form>
    );
}
