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
      className={`p-4 bg-white dark:bg-[#1f1f1f] rounded-lg shadow transition-shadow ${
        isBulkMode
          ? isSelected
            ? 'ring-2 ring-indigo-500 cursor-pointer'
            : 'hover:shadow-md cursor-pointer'
          : isDragging
          ? 'cursor-grabbing'
          : 'hover:shadow-md cursor-pointer cursor-grab'
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
