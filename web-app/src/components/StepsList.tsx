import { Task, Step } from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';
import { isRtlLanguage } from '@tasks-management/frontend-services';

interface StepsListProps {
  task: Task;
  showAddStep: boolean;
  newStepDescription: string;
  onNewStepDescriptionChange: (value: string) => void;
  editingStepId: number | null;
  stepDescriptionDraft: string;
  onStepDescriptionDraftChange: (value: string) => void;
  onCreateStep: () => void;
  onToggleStep: (step: Step) => void;
  onEditStep: (step: Step) => void;
  onSaveStep: () => void;
  onCancelEdit: () => void;
  onDeleteStep: (step: Step) => void;
  onCreateStepClick: () => void;
  onCancelAddStep: () => void;
  createStepMutation: { isPending: boolean };
  stepInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function StepsList({
  task,
  showAddStep,
  newStepDescription,
  onNewStepDescriptionChange,
  editingStepId,
  stepDescriptionDraft,
  onStepDescriptionDraftChange,
  onCreateStep,
  onToggleStep,
  onEditStep,
  onSaveStep,
  onCancelEdit,
  onDeleteStep,
  onCreateStepClick,
  onCancelAddStep,
  createStepMutation,
  stepInputRef,
}: StepsListProps) {
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);

  return (
    <div className="mt-6">
      <div className={`flex ${isRtl ? 'flex-row-reverse' : ''} items-center justify-between gap-3 mb-3`}>
        <h2 className="premium-header-section text-lg">
          {t('taskDetails.stepsTitle', { defaultValue: 'Steps' })}
        </h2>
        {!showAddStep && (
          <button
            type="button"
            onClick={onCreateStepClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg hover:from-primary-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {t('taskDetails.addStep', { defaultValue: 'Add Step' })}
          </button>
        )}
      </div>

      {showAddStep && (
        <form
          className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#2a2a2a] p-4 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            onCreateStep();
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-10">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('taskDetails.form.descriptionLabel')}
              </label>
              <input
                ref={stepInputRef}
                value={newStepDescription}
                onChange={(e) => onNewStepDescriptionChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('taskDetails.form.descriptionPlaceholder')}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={createStepMutation.isPending || !newStepDescription.trim()}
                className="inline-flex flex-1 justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStepMutation.isPending
                  ? t('common.loading')
                  : t('common.create')}
              </button>
              <button
                type="button"
                onClick={onCancelAddStep}
                className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-[#2a2a2a] px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#333333]"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </form>
      )}

      {!showAddStep && task.steps && task.steps.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">{t('taskDetails.noSteps', { defaultValue: 'No steps yet' })}</p>
        </div>
      )}

      {task.steps && task.steps.length > 0 && (
        <ul className="space-y-2">
          {task.steps.map((step) => (
            <li
              key={step.id}
              className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={step.completed}
                  onChange={() => onToggleStep(step)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                {editingStepId === step.id ? (
                  <input
                    value={stepDescriptionDraft}
                    onChange={(e) => onStepDescriptionDraftChange(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <span
                    className={
                      step.completed
                        ? 'line-through text-gray-500 dark:text-gray-400 truncate'
                        : 'text-gray-900 dark:text-white truncate'
                    }
                    title={t('taskDetails.clickToEdit')}
                    onClick={() => onEditStep(step)}
                  >
                    {step.description}
                  </span>
                )}
              </div>

              {editingStepId === step.id ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!stepDescriptionDraft.trim()}
                    onClick={onSaveStep}
                    className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="inline-flex justify-center rounded-md bg-gray-200 dark:bg-[#2a2a2a] px-3 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-[#333333]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeleteStep(step)}
                  className="inline-flex justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.delete')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
