import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';

interface DatePickerProps {
  value?: string; // ISO date string or YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null,
  );

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    
    // Validate date
    if (minimumDate && date < minimumDate) {
      return;
    }
    if (maximumDate && date > maximumDate) {
      return;
    }

    setSelectedDate(date);
    onChange(formatDate(date));
    setShowPicker(false);
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendar = () => {
    const today = new Date();
    const currentYear = selectedDate?.getFullYear() ?? today.getFullYear();
    const currentMonth = selectedDate?.getMonth() ?? today.getMonth();
    const month = currentMonth + 1;

    const daysInMonth = getDaysInMonth(currentYear, month);
    const firstDay = getFirstDayOfMonth(currentYear, month);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const isSelected = (day: number | null): boolean => {
      if (!day || !selectedDate) return false;
      return (
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear
      );
    };

    const isToday = (day: number | null): boolean => {
      if (!day) return false;
      return (
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear()
      );
    };

    const isDisabled = (day: number | null): boolean => {
      if (!day) return false;
      const date = new Date(currentYear, currentMonth, day);
      if (minimumDate && date < minimumDate) return true;
      if (maximumDate && date > maximumDate) return true;
      return false;
    };

    const changeMonth = (delta: number) => {
      const targetMonth = currentMonth + delta;
      const firstDayOfTarget = new Date(currentYear, targetMonth, 1);
      const lastDayOfTarget = new Date(currentYear, targetMonth + 1, 0);

      // Block if target month has no valid dates
      // For minimumDate: last day of target month must be >= minimumDate
      // For maximumDate: first day of target month must be <= maximumDate
      if (minimumDate && lastDayOfTarget < minimumDate) return;
      if (maximumDate && firstDayOfTarget > maximumDate) return;

      // Update selectedDate to navigate to the new month
      setSelectedDate(firstDayOfTarget);
    };

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => changeMonth(-1)}
            disabled={
              minimumDate &&
              new Date(currentYear, currentMonth, 0) < minimumDate
            }
          >
            <Text style={styles.monthNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => changeMonth(1)}
            disabled={
              maximumDate &&
              new Date(currentYear, currentMonth + 1, 1) > maximumDate
            }
          >
            <Text style={styles.monthNavText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {weekDays.map((day) => (
            <View key={day} style={styles.weekDay}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected(day) && styles.dayCellSelected,
                isToday(day) && styles.dayCellToday,
                isDisabled(day) && styles.dayCellDisabled,
              ]}
              onPress={() => {
                if (day && !isDisabled(day)) {
                  handleDateSelect(currentYear, month, day);
                }
              }}
              disabled={!day || isDisabled(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected(day) && styles.dayTextSelected,
                  isToday(day) && !isSelected(day) && styles.dayTextToday,
                  isDisabled(day) && styles.dayTextDisabled,
                ]}
              >
                {day || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.calendarActions}>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => {
              const today = new Date();
              if (!minimumDate || today >= minimumDate) {
                if (!maximumDate || today <= maximumDate) {
                  handleDateSelect(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    today.getDate(),
                  );
                }
              }
            }}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedDate(null);
              onChange('');
              setShowPicker(false);
            }}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.inputText,
            !selectedDate && styles.inputTextPlaceholder,
          ]}
        >
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </Text>
        <Text style={styles.inputIcon}>📅</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {renderCalendar()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  inputTextPlaceholder: {
    color: '#999',
  },
  inputIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  calendar: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayCellSelected: {
    backgroundColor: '#007AFF',
  },
  dayCellToday: {
    backgroundColor: '#f0f0f0',
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: '#999',
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  todayButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});


