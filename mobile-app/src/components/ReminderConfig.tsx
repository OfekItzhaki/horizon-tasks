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
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
} from '../types';
import ReminderEditor from './ReminderEditor';

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

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function ReminderConfigComponent({
  reminders,
  onRemindersChange,
}: ReminderConfigProps) {
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
    console.log('saveReminder called with:', {
      reminder,
      reminderTime: reminder.time,
      editingReminderId: editingReminder?.id,
      currentReminders: reminders.map(r => ({ id: r.id, time: r.time })),
    });
    
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
            console.log('Updating reminder:', {
              old: { id: r.id, time: r.time },
              new: { id: updatedReminder.id, time: updatedReminder.time },
            });
            return updatedReminder;
          }
          return r;
        });
        console.log('Updated reminders list:', updated.map(r => ({ id: r.id, time: r.time, timeframe: r.timeframe })));
        onRemindersChange(updated);
      } else {
        // Add new (editingReminder was set but reminder doesn't exist in list yet)
        console.log('Adding new reminder (editingReminder exists but not in list)');
        onRemindersChange([...reminders, reminder]);
      }
    } else {
      // Add new
      console.log('Adding new reminder');
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

  const formatReminder = (reminder: ReminderConfig): string => {
    const timeStr = reminder.time || '09:00';
    let description = '';

    switch (reminder.timeframe) {
      case ReminderTimeframe.SPECIFIC_DATE:
        if (reminder.specificDate === ReminderSpecificDate.START_OF_WEEK) {
          description = `Every Monday at ${timeStr}`;
        } else if (reminder.specificDate === ReminderSpecificDate.START_OF_MONTH) {
          description = `1st of every month at ${timeStr}`;
        } else if (reminder.specificDate === ReminderSpecificDate.START_OF_YEAR) {
          description = `Jan 1st every year at ${timeStr}`;
        } else if (reminder.customDate) {
          const date = new Date(reminder.customDate);
          description = `${date.toLocaleDateString()} at ${timeStr}`;
        } else {
          description = `Specific date at ${timeStr}`;
        }
        break;
      case ReminderTimeframe.EVERY_DAY:
        description = `Every day at ${timeStr}`;
        break;
      case ReminderTimeframe.EVERY_WEEK:
        const dayName = reminder.dayOfWeek !== undefined ? DAY_NAMES[reminder.dayOfWeek] : 'Monday';
        description = `Every ${dayName} at ${timeStr}`;
        break;
      case ReminderTimeframe.EVERY_MONTH:
        description = `1st of every month at ${timeStr}`;
        break;
      case ReminderTimeframe.EVERY_YEAR:
        description = `Same date every year at ${timeStr}`;
        break;
    }

    if (reminder.daysBefore !== undefined) {
      description = `${reminder.daysBefore} day(s) before due date at ${timeStr}`;
    }

    return description;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reminders</Text>
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
                  <Text style={styles.reminderText}>{formatReminder(reminder)}</Text>
                  <Text style={styles.alarmIndicator}>
                    {reminder.hasAlarm ? '🔔' : '🔕'}
                  </Text>
                </View>
              </View>
              <View style={styles.reminderActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => editReminder(reminder)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeReminder(reminder.id)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
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

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  remindersList: {
    maxHeight: 200,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  alarmIndicator: {
    fontSize: 16,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
