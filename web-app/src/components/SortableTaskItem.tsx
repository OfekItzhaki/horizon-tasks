import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@tasks-management/frontend-services';

interface SortableTaskItemProps {
  task: Task;
  isBulkMode: boolean;
  isSelected: boolean;
  isFinishedList: boolean;
  onToggleSelect: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  children: React.ReactNode;
}

export function SortableTaskItem({
  task,
  isBulkMode,
  isSelected,
  isFinishedList,
  onToggleSelect,
  onToggleComplete,
  onDelete,
  onRestore,
  onPermanentDelete,
  onClick,
  onKeyDown,
  children,
}: SortableTaskItemProps) {
  void onToggleSelect;
  void onToggleComplete;
  void onDelete;
  void onRestore;
  void onPermanentDelete;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isBulkMode && !isFinishedList ? { ...attributes, ...listeners } : {})}
      className={`premium-card p-5 transition-all duration-200 ${
        isBulkMode
          ? isSelected
            ? 'ring-2 ring-primary-500 shadow-glow cursor-pointer bg-primary-50/50 dark:bg-primary-900/20'
            : 'hover:shadow-premium cursor-pointer'
          : isDragging
          ? 'cursor-grabbing opacity-60 scale-95'
          : 'hover:shadow-premium cursor-pointer cursor-grab'
      }`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={isBulkMode ? `Task: ${task.description}. ${isSelected ? 'Selected' : 'Not selected'}. Click to toggle selection.` : `Task: ${task.description}. ${task.completed ? 'Completed' : 'Pending'}. Click to view details.`}
    >
      {children}
    </div>
  );
}
