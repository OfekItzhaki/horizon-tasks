import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import {
  type ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  formatReminderDisplay,
  DAY_NAMES,
} from '@tasks-management/frontend-services';
import ReminderEditor from './ReminderEditor';
import { createTaskDetailsStyles } from '../screens/styles/TaskDetailsScreen.styles';
import { useThemedStyles } from '../utils/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';

interface ReminderConfigProps {
  reminders: ReminderConfig[];
  onRemindersChange: (reminders: ReminderConfig[]) => void;
}

// Constants for reminder configuration
const TIMEFRAMES = [
  { value: ReminderTimeframe.SPECIFIC_DATE, label: 'Specific Date' },
  { value: ReminderTimeframe.EVERY_DAY, label: 'Every Day' },
  { value: ReminderTimeframe.EVERY_WEEK, label: 'Every Week' },
  { value: ReminderTimeframe.EVERY_MONTH, label: 'Every Month' },
  { value: ReminderTimeframe.EVERY_YEAR, label: 'Every Year' },
];

const SPECIFIC_DATES = [
  { value: ReminderSpecificDate.START_OF_WEEK, label: 'Start of Week (Monday)' },
  { value: ReminderSpecificDate.START_OF_MONTH, label: 'Start of Month (1st)' },
  { value: ReminderSpecificDate.START_OF_YEAR, label: 'Start of Year (Jan 1st)' },
  { value: ReminderSpecificDate.CUSTOM_DATE, label: 'Custom Date' },
];


export default function ReminderConfigComponent({
  reminders,
  onRemindersChange,
}: ReminderConfigProps) {
  const styles = useThemedStyles(createTaskDetailsStyles);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);
  const [showTimeframePicker, setShowTimeframePicker] = useState(false);

  const addReminder = () => {
    const newReminder: ReminderConfig = {
      id: Date.now().toString(),
      timeframe: ReminderTimeframe.SPECIFIC_DATE,
      time: '09:00',
      specificDate: ReminderSpecificDate.CUSTOM_DATE,
    };
    setEditingReminder(newReminder);
    setShowTimeframePicker(true);
  };

  const saveReminder = (reminder: ReminderConfig) => {
    if (editingReminder) {
      // Check if this reminder already exists in the list
      const existingIndex = reminders.findIndex((r) => r.id === editingReminder.id);
      if (existingIndex >= 0) {
        // Update existing - ensure we preserve all properties including time
        const updated = reminders.map((r) => {
          if (r.id === editingReminder.id) {
            // Create a new reminder object with all properties from the saved reminder
            const updatedReminder: ReminderConfig = {
              id: reminder.id,
              timeframe: reminder.timeframe,
              time: reminder.time || '09:00',
              specificDate: reminder.specificDate,
              customDate: reminder.customDate,
              dayOfWeek: reminder.dayOfWeek,
              daysBefore: reminder.daysBefore,
              hasAlarm: reminder.hasAlarm,
            };
            return updatedReminder;
          }
          return r;
        });
        onRemindersChange(updated);
      } else {
        // Add new (editingReminder was set but reminder doesn't exist in list yet)
        onRemindersChange([...reminders, reminder]);
      }
    } else {
      // Add new
      onRemindersChange([...reminders, reminder]);
    }
    setEditingReminder(null);
    setShowTimeframePicker(false);
  };

  const removeReminder = (id: string) => {
    onRemindersChange(reminders.filter((r) => r.id !== id));
  };

  const editReminder = (reminder: ReminderConfig) => {
    setEditingReminder(reminder);
    setShowTimeframePicker(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 }]}>
        <View style={[styles.sectionIconRow, { marginBottom: 0 }]}>
          <View style={[styles.iconContainer, { width: 36, height: 36, marginRight: 12 }]}>
            <Ionicons name="notifications-outline" size={20} color="#a855f7" />
          </View>
          <Text style={styles.sectionTitle}>Reminders</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={addReminder}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {reminders.length === 0 ? (
        <Text style={styles.emptyText}>No reminders set</Text>
      ) : (
        <ScrollView style={styles.remindersList}>
          {reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderItem}>
              <View style={styles.reminderContent}>
                <View style={styles.reminderTextRow}>
                  <Text style={styles.reminderText}>{formatReminderDisplay(reminder)}</Text>
                  <TouchableOpacity
                    style={[
                      styles.alarmToggle,
                      reminder.hasAlarm && styles.alarmToggleActive
                    ]}
                    onPress={() => {
                      const updated = reminders.map(r =>
                        r.id === reminder.id ? { ...r, hasAlarm: !r.hasAlarm } : r
                      );
                      onRemindersChange(updated);
                    }}
                  >
                    <Ionicons
                      name={reminder.hasAlarm ? "notifications" : "notifications-off"}
                      size={18}
                      color={reminder.hasAlarm ? "#6366f1" : "#64748b"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.reminderActions}>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: 'transparent' }]}
                  onPress={() => editReminder(reminder)}
                >
                  <Ionicons name="create-outline" size={22} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeReminder(reminder.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Reminder Configuration Modal */}
      <Modal
        visible={showTimeframePicker && editingReminder !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setEditingReminder(null);
          setShowTimeframePicker(false);
        }}
      >
        {editingReminder && (
          <ReminderEditor
            reminder={editingReminder}
            onSave={saveReminder}
            onCancel={() => {
              setEditingReminder(null);
              setShowTimeframePicker(false);
            }}
            timeframes={TIMEFRAMES}
            specificDates={SPECIFIC_DATES}
            dayNames={DAY_NAMES}
          />
        )}
      </Modal>
    </View>
  );
}
