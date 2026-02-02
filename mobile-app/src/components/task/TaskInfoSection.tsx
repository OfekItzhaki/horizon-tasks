import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Task } from '../../types';
import type { ReminderConfig } from '@tasks-management/frontend-services';
import { formatReminderDisplay } from '@tasks-management/frontend-services';
import DatePicker from '../DatePicker';
import { formatDate } from '../../utils/helpers';
import { createTaskDetailsStyles } from '../../screens/styles/TaskDetailsScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../utils/useThemedStyles';

interface TaskInfoSectionProps {
  task: Task;
  isEditing: boolean;
  editDueDate: string;
  onEditDueDateChange: (date: string) => void;
  displayReminders: ReminderConfig[];
  reminderAlarmStates: Record<string, boolean>;
  onToggleReminderAlarm: (reminderId: string) => void;
}

export function TaskInfoSection({
  task,
  isEditing,
  editDueDate,
  onEditDueDateChange,
  displayReminders,
  reminderAlarmStates,
  onToggleReminderAlarm,
}: TaskInfoSectionProps) {
  const styles = useThemedStyles(createTaskDetailsStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionIconRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={24} color="#6366f1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>Due Date</Text>
          {isEditing ? (
            <View style={styles.datePickerContainer}>
              <DatePicker
                value={editDueDate}
                onChange={onEditDueDateChange}
                placeholder="No due date"
              />
            </View>
          ) : (
            <Text style={styles.infoValue}>
              {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
            </Text>
          )}
        </View>
      </View>

      {/* Display Reminders - only show when NOT editing */}
      {!isEditing && displayReminders.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionIconRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={24} color="#a855f7" />
            </View>
            <Text style={styles.infoLabel}>Reminders</Text>
          </View>
          <View style={styles.remindersList}>
            {displayReminders.map((reminder) => (
              <View key={reminder.id} style={styles.reminderDisplayItem}>
                <Text style={styles.reminderDisplayText}>
                  {formatReminderDisplay(reminder)}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.alarmToggleButton,
                    reminderAlarmStates[reminder.id] && styles.alarmToggleButtonActive
                  ]}
                  onPress={() => onToggleReminderAlarm(reminder.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={reminderAlarmStates[reminder.id] ? "notifications" : "notifications-off"}
                    size={18}
                    color={reminderAlarmStates[reminder.id] ? "#6366f1" : "#64748b"}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[
                    styles.alarmToggleText,
                    reminderAlarmStates[reminder.id] && styles.alarmToggleTextActive
                  ]}>
                    {reminderAlarmStates[reminder.id] ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
