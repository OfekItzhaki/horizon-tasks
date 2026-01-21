import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Task } from '../../types';
import { styles } from '../../screens/styles/TaskDetailsScreen.styles';

interface TaskHeaderProps {
  task: Task;
  isEditing: boolean;
  editDescription: string;
  onEditDescriptionChange: (text: string) => void;
  onToggleTask: () => void;
  onEditPress: () => void;
  completionCount?: number;
  isRepeatingTask?: boolean;
}

export function TaskHeader({
  task,
  isEditing,
  editDescription,
  onEditDescriptionChange,
  onToggleTask,
  onEditPress,
  completionCount = 0,
  isRepeatingTask = false,
}: TaskHeaderProps) {
  const isCompleted = Boolean(task.completed);

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
          onPress={onToggleTask}
        >
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.headerText}>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editDescription}
              onChangeText={onEditDescriptionChange}
              multiline
              autoFocus
            />
          ) : (
            <>
              <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
                {task.description}
              </Text>
              {/* Show completion count for repeating tasks */}
              {isRepeatingTask && completionCount > 0 && (
                <Text style={styles.completionCountBadge}>
                  🔄 Completed {completionCount} time{completionCount !== 1 ? 's' : ''}
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      {!isEditing && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditPress}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
