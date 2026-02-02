import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types';
import { formatDate } from '../../utils/helpers';
import { isOverdue, isRepeatingTask as checkIsRepeatingTask } from '../../utils/taskHelpers';
import { createTasksStyles } from '../../screens/styles/TasksScreen.styles';
import { useThemedStyles } from '../../utils/useThemedStyles';
import { useTheme } from '../../context/ThemeContext';

interface TaskListItemProps {
  task: Task;
  onPress: () => void;
  onLongPress: () => void;
  onToggle: () => void;
}

export function TaskListItem({
  task,
  onPress,
  onLongPress,
  onToggle,
}: TaskListItemProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createTasksStyles);
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
      activeOpacity={0.7}
    >
      <View style={styles.taskContent}>
        <TouchableOpacity
          style={[styles.taskCheckbox, isCompleted && styles.taskCheckboxCompleted]}
          onPress={onToggle}
          activeOpacity={0.6}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          {isCompleted && <Ionicons name="checkmark" size={18} color="#fff" />}
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

          {(task.dueDate || (isRepeating && completionCount > 0)) && (
            <View style={styles.taskMetaRow}>
              {task.dueDate && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={isOverdueTask ? colors.error : colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.dueDate,
                      isOverdueTask && styles.dueDateOverdue,
                    ]}
                  >
                    {formatDate(task.dueDate)}
                  </Text>
                </View>
              )}

              {isRepeating && completionCount > 0 && (
                <View style={[styles.metaItem, { backgroundColor: colors.success + '15' }]}>
                  <Ionicons
                    name="repeat-outline"
                    size={12}
                    color={colors.success}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.completionCount}>
                    {completionCount}x
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.border} style={{ alignSelf: 'center' }} />
      </View>
    </TouchableOpacity>
  );
}
