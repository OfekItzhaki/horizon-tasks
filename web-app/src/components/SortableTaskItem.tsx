import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';

interface SortableTaskItemProps {
  task: Task;
  isBulkMode: boolean;
  isSelected: boolean;
  isFinishedList: boolean;
  isRtl: boolean;
  onToggleSelect: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onClick: () => void;
}

export function SortableTaskItem({
  task,
  isBulkMode,
  isSelected,
  isFinishedList,
  isRtl,
  onToggleSelect,
  onToggleComplete,
  onDelete,
  onRestore,
  onPermanentDelete,
  onClick,
}: SortableTaskItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isBulkMode || isFinishedList });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCompletedRow = task.completed;
  const isDeleted = !!task.deletedAt;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group premium-card p-4 flex items-center gap-4 transition-all duration-300 ${isRtl ? 'flex-row-reverse' : ''} ${isBulkMode
        ? isSelected
          ? 'ring-2 ring-primary-500 shadow-glow bg-primary-50/50 dark:bg-primary-900/20'
          : 'hover:shadow-premium cursor-pointer'
        : isDragging
          ? 'cursor-grabbing opacity-60 scale-95 shadow-2xl z-50'
          : 'hover:shadow-premium cursor-pointer'
        }`}
      onClick={(e) => { e.stopPropagation(); isBulkMode ? onToggleSelect() : onClick(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          isBulkMode ? onToggleSelect() : onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${isBulkMode ? (isSelected ? 'Deselect' : 'Select') : ''} ${task.description}`}
    >
      {/* Selection Checkbox (Bulk Mode) */}
      {isBulkMode && (
        <div
          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary-500 border-primary-500 shadow-glow scale-110' : 'border-gray-300 dark:border-gray-600'}`}
        >
          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
        </div>
      )}

      {/* Completion Checkbox (Standard Mode) */}
      {!isBulkMode && !isFinishedList && !isDeleted && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isCompletedRow ? 'bg-green-500 border-green-500 shadow-glow-green' : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'}`}
        >
          {isCompletedRow && <span className="text-white text-xs font-bold">✓</span>}
        </button>
      )}

      {/* Drag Handle (Standard Mode) */}
      {!isBulkMode && !isFinishedList && !isDeleted && (
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded opacity-40 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            <circle cx="2" cy="9" r="1.5" fill="currentColor" />
            <circle cx="2" cy="16" r="1.5" fill="currentColor" />
            <circle cx="10" cy="2" r="1.5" fill="currentColor" />
            <circle cx="10" cy="9" r="1.5" fill="currentColor" />
            <circle cx="10" cy="16" r="1.5" fill="currentColor" />
          </svg>
        </div>
      )}

      {/* Task Content */}
      <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
        <p className={`text-base font-medium truncate transition-all ${isCompletedRow ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
          {task.description}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {task.dueDate && (
            <span className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.steps && task.steps.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              📋 {task.steps.filter(s => s.completed).length}/{task.steps.length}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isBulkMode && (
        <div className={`flex items-center gap-2 transition-opacity ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
          {isDeleted ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onRestore(); }}
                className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                title={t('tasks.restore')}
              >
                🔄
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title={t('tasks.deleteForever')}
              >
                🗑️
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={t('tasks.delete')}
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
}
