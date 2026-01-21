import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Task } from '../../types';
import { formatDate } from '../../utils/helpers';
import { isOverdue, isRepeatingTask as checkIsRepeatingTask } from '../../utils/taskHelpers';
import { styles } from '../../screens/styles/TasksScreen.styles';

interface TaskListItemProps {
  task: Task;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: (e: any) => void;
}

export function TaskListItem({
  task,
  onPress,
  onLongPress,
  onToggle,
}: TaskListItemProps) {
  const isCompleted = Boolean(task.completed);
  const isOverdueTask = isOverdue(task);
  const isRepeating = checkIsRepeatingTask(task);
  const completionCount = task.completionCount || 0;

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        isCompleted && styles.taskItemCompleted,
        isOverdueTask && styles.taskItemOverdue,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.taskContent}>
        <TouchableOpacity
          style={[styles.taskCheckbox, isCompleted && styles.taskCheckboxCompleted]}
          onPress={onToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.taskTextContainer}>
          <Text
            style={[
              styles.taskText,
              isCompleted && styles.taskTextCompleted,
            ]}
          >
            {task.description}
          </Text>
          <View style={styles.taskMetaRow}>
            {task.dueDate && (
              <Text
                style={[
                  styles.dueDate,
                  isOverdueTask && styles.dueDateOverdue,
                ]}
              >
                Due: {formatDate(task.dueDate)}
              </Text>
            )}
            {isRepeating && completionCount > 0 && (
              <Text style={styles.completionCount}>
                🔄 {completionCount}x completed
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
