import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
} from '../types';
import DatePicker from './DatePicker';

interface ReminderEditorProps {
  reminder: ReminderConfig;
  onSave: (reminder: ReminderConfig) => void;
  onCancel: () => void;
  timeframes: Array<{ value: ReminderTimeframe; label: string }>;
  specificDates: Array<{ value: ReminderSpecificDate; label: string }>;
  dayNames: string[];
}

export default function ReminderEditor({
  reminder,
  onSave,
  onCancel,
  timeframes,
  specificDates,
  dayNames,
}: ReminderEditorProps) {
  // Initialize config with reminder, ensuring time is properly formatted
  const initialTime = reminder.time || '09:00';
  // Convert HH:MM to HHMM for easier editing (remove colon)
  const timeForInput = initialTime.replace(':', '');
  
  const [config, setConfig] = useState<ReminderConfig>({ 
    ...reminder,
    time: timeForInput, // Store as HHMM for easier editing
  });

  const handleTimeframeChange = (timeframe: ReminderTimeframe) => {
    setConfig({
      ...config,
      timeframe,
      specificDate:
        timeframe === ReminderTimeframe.SPECIFIC_DATE
          ? ReminderSpecificDate.CUSTOM_DATE
          : undefined,
    });
  };

  const handleTimeChange = (input: string) => {
    // Remove any non-numeric characters (in case user pastes something with colons)
    const numbersOnly = input.replace(/\D/g, '');
    
    // Limit to 4 digits (HHMM)
    const limited = numbersOnly.slice(0, 4);
    
    // Only auto-format when user has entered exactly 4 digits (complete time)
    // This allows easy editing without the colon interfering
    let formatted = limited;
    if (limited.length === 4) {
      // Auto-format to HH:MM only when complete
      formatted = limited.slice(0, 2) + ':' + limited.slice(2);
    } else if (limited.length > 0) {
      // While typing, keep as numbers only (no colon) for easier editing
      formatted = limited;
    }
    
    // Update the config with the formatted time
    setConfig({ ...config, time: formatted });
  };

  const handleSave = () => {
    // Ensure time is valid (default to 09:00 if not set)
    let timeToUse = config.time || '';
    
    // Remove any existing colons and get just the numbers
    const numbersOnly = timeToUse.replace(/\D/g, '');
    
    // Convert to HH:MM format
    if (numbersOnly.length === 0) {
      // No time entered, use default
      timeToUse = '09:00';
    } else if (numbersOnly.length === 1) {
      // Single digit - pad and format (e.g., "9" -> "09:00")
      timeToUse = '0' + numbersOnly + ':00';
    } else if (numbersOnly.length === 2) {
      // Two digits - assume hours, add minutes (e.g., "09" -> "09:00")
      timeToUse = numbersOnly + ':00';
    } else if (numbersOnly.length === 3) {
      // Three digits - pad first digit (e.g., "930" -> "09:30")
      timeToUse = '0' + numbersOnly.slice(0, 1) + ':' + numbersOnly.slice(1);
    } else if (numbersOnly.length === 4) {
      // Four digits - format as HH:MM (e.g., "0930" -> "09:30")
      timeToUse = numbersOnly.slice(0, 2) + ':' + numbersOnly.slice(2);
    }
    
    // Validate HH:MM format and fix invalid times
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeToUse)) {
      // If invalid, try to fix it
      const [hours, minutes] = timeToUse.split(':');
      const h = parseInt(hours || '9', 10);
      const m = parseInt(minutes || '0', 10);
      
      // Clamp hours to 0-23 and minutes to 0-59
      const validHours = Math.max(0, Math.min(23, h));
      const validMinutes = Math.max(0, Math.min(59, m));
      
      timeToUse = `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`;
    }
    
    // For SPECIFIC_DATE with CUSTOM_DATE, customDate is optional (user might use daysBefore instead)
    // For SPECIFIC_DATE with other options (START_OF_WEEK, etc.), no customDate needed
    
    // Save with the properly formatted time
    // Default dayOfWeek to Monday (1) for EVERY_WEEK reminders if not set
    const reminderToSave = {
      ...config,
      time: timeToUse,
      ...(config.timeframe === ReminderTimeframe.EVERY_WEEK && config.dayOfWeek === undefined
        ? { dayOfWeek: 1 }
        : {}),
    };
    
    console.log('Saving reminder with time:', {
      originalTime: config.time,
      formattedTime: timeToUse,
      fullReminder: reminderToSave,
    });
    
    onSave(reminderToSave);
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Configure Reminder</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.editorContent}
          contentContainerStyle={styles.editorContentContainer}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          bounces={false}
        >
          {/* Timeframe Selection */}
          <Text style={styles.label}>Timeframe:</Text>
          <View style={styles.optionsGrid}>
            {timeframes.map((tf) => (
              <TouchableOpacity
                key={tf.value}
                style={[
                  styles.optionButton,
                  config.timeframe === tf.value && styles.optionButtonSelected,
                ]}
                onPress={() => handleTimeframeChange(tf.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    config.timeframe === tf.value && styles.optionTextSelected,
                  ]}
                >
                  {tf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Specific Date Options (for SPECIFIC_DATE timeframe) */}
          {config.timeframe === ReminderTimeframe.SPECIFIC_DATE && (
            <>
              <Text style={styles.label}>Date Option:</Text>
              <View style={styles.optionsGrid}>
                {specificDates.map((sd) => (
                  <TouchableOpacity
                    key={sd.value}
                    style={[
                      styles.optionButton,
                      config.specificDate === sd.value && styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setConfig({ ...config, specificDate: sd.value })
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        config.specificDate === sd.value && styles.optionTextSelected,
                      ]}
                    >
                      {sd.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Date Input */}
              {config.specificDate === ReminderSpecificDate.CUSTOM_DATE && (
                <>
                  <Text style={styles.label}>Date:</Text>
                  <DatePicker
                    value={config.customDate?.split('T')[0] || ''}
                    onChange={(dateStr) => {
                      if (dateStr) {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                          setConfig({ ...config, customDate: date.toISOString() });
                        }
                      } else {
                        setConfig({ ...config, customDate: undefined });
                      }
                    }}
                    placeholder="Select a date"
                  />
                </>
              )}
            </>
          )}

          {/* Day of Week (for EVERY_WEEK) */}
          {config.timeframe === ReminderTimeframe.EVERY_WEEK && (
            <>
              <Text style={styles.label}>Day of Week:</Text>
              <View style={styles.optionsGrid}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      config.dayOfWeek === index && styles.optionButtonSelected,
                    ]}
                    onPress={() => setConfig({ ...config, dayOfWeek: index })}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        config.dayOfWeek === index && styles.optionTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Days Before (only show for reminders that can use due dates) */}
          {(config.timeframe === ReminderTimeframe.SPECIFIC_DATE || 
            config.timeframe === ReminderTimeframe.EVERY_DAY) && (
            <>
              <Text style={styles.label}>Days Before Due Date (optional):</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 7 for 7 days before due date"
                value={config.daysBefore?.toString() || ''}
                onChangeText={(text) => {
                  const days = parseInt(text, 10);
                  if (!isNaN(days) && days > 0) {
                    setConfig({ ...config, daysBefore: days });
                  } else if (text === '') {
                    setConfig({ ...config, daysBefore: undefined });
                  }
                }}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>
                {config.timeframe === ReminderTimeframe.EVERY_DAY 
                  ? 'Note: Daily reminders will repeat on the same day each week. Leave empty to remind on the due date itself.'
                  : 'Leave empty if this reminder is not relative to due date'}
              </Text>
            </>
          )}

          {/* Info for Every Day reminders */}
          {config.timeframe === ReminderTimeframe.EVERY_DAY && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Daily reminders will notify you on the same day each week. For true daily reminders, consider creating the task in a DAILY list.
              </Text>
            </View>
          )}

          {/* Time Input */}
          <Text style={styles.label}>Time (HHMM):</Text>
          <TextInput
            style={styles.input}
            placeholder="0900"
            value={config.time}
            onChangeText={handleTimeChange}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={styles.helperText}>
            Enter time as 4 digits (e.g., 0900 for 9:00 AM, 1430 for 2:30 PM). Colon will be added automatically.
          </Text>

          {/* Alarm Toggle */}
          <View style={styles.alarmOption}>
            <Text style={styles.label}>Sound & Vibration:</Text>
            <TouchableOpacity
              style={styles.alarmToggle}
              onPress={() => setConfig({ ...config, hasAlarm: !config.hasAlarm })}
              activeOpacity={0.7}
            >
              <View style={[
                styles.toggleSwitch,
                config.hasAlarm && styles.toggleSwitchActive,
                { justifyContent: config.hasAlarm ? 'flex-end' : 'flex-start' }
              ]}>
                <View style={styles.toggleThumb} />
              </View>
              <Text style={styles.alarmLabel}>
                {config.hasAlarm ? 'Alarm enabled' : 'Alarm disabled'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Play sound and vibration when reminder triggers
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.85,
    maxHeight: Dimensions.get('window').height * 0.9,
    padding: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    width: '100%',
    flexDirection: 'column',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  editorContent: {
    flex: 1,
  },
  editorContentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -8,
    marginBottom: 15,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginRight: 8,
    marginBottom: 8,
    minHeight: 44,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
  alarmOption: {
    marginTop: 15,
  },
  alarmToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 12,
  },
  toggleSwitchActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  alarmLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

