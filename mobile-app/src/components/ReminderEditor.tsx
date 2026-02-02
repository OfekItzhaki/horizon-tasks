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
  type ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
} from '@tasks-management/frontend-services';
import DatePicker from './DatePicker';
import { createTaskDetailsStyles } from '../screens/styles/TaskDetailsScreen.styles';
import { useThemedStyles } from '../utils/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';

interface ReminderEditorProps {
  reminder: ReminderConfig;
  onSave: (reminder: ReminderConfig) => void;
  onCancel: () => void;
  timeframes: Array<{ value: ReminderTimeframe; label: string }>;
  specificDates: Array<{ value: ReminderSpecificDate; label: string }>;
  dayNames: string[];
}

function getInitialCustomDate(reminder: ReminderConfig): string | undefined {
  const raw = reminder.customDate;
  if (!raw) return undefined;
  const d = new Date(raw);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) {
    return today.toISOString();
  }
  return raw;
}

export default function ReminderEditor({
  reminder,
  onSave,
  onCancel,
  timeframes,
  specificDates,
  dayNames,
}: ReminderEditorProps) {
  const styles = useThemedStyles(createTaskDetailsStyles);
  // Initialize config with reminder, ensuring time is properly formatted
  const initialTime = reminder.time || '09:00';
  const initialCustomDate = getInitialCustomDate(reminder);

  const [config, setConfig] = useState<ReminderConfig>({
    ...reminder,
    time: initialTime, // Keep time in HH:MM format
    customDate: initialCustomDate,
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

    // Auto-format to HH:MM as user types
    let formatted = limited;
    if (limited.length >= 3) {
      // Format as HH:MM when we have at least 3 digits
      formatted = limited.slice(0, 2) + ':' + limited.slice(2);
    } else if (limited.length === 2) {
      // After 2 digits, add colon automatically
      formatted = limited + ':';
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
            <Ionicons name="close" size={24} color="#64748b" />
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
                  Leave empty if this reminder is not relative to due date
                </Text>
              </>
            )}



          {/* Time Input (24-hour format) */}
          <Text style={styles.label}>Time (24h, HH:mm):</Text>
          <TextInput
            style={styles.input}
            placeholder="09:00"
            value={config.time}
            onChangeText={handleTimeChange}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={styles.helperText}>
            Enter time in 24-hour format (e.g. 09:00, 14:30)
          </Text>

          {/* Alarm Toggle */}
          <View style={styles.alarmOption}>
            <View style={styles.alarmToggleOption}>
              <View>
                <Text style={styles.alarmLabel}>Sound & Vibration</Text>
                <Text style={styles.helperText}>Play sound when triggered</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  config.hasAlarm && styles.toggleSwitchActive,
                  { flexDirection: config.hasAlarm ? 'row-reverse' : 'row' }
                ]}
                onPress={() => setConfig({ ...config, hasAlarm: !config.hasAlarm })}
                activeOpacity={0.8}
              >
                <View style={styles.toggleThumb} />
              </TouchableOpacity>
            </View>
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

export { };

