import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createTaskDetailsStyles } from '../screens/styles/TaskDetailsScreen.styles';
import { useThemedStyles } from '../utils/useThemedStyles';

interface DatePickerProps {
  value?: string; // ISO date string or YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
}: DatePickerProps) {
  const styles = useThemedStyles(createTaskDetailsStyles);
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

  const handleDateSelect = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);

    // Validate date
    if (minDate && date < minDate) {
      return;
    }
    if (maxDate && date > maxDate) {
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
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
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
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };

    const changeMonth = (delta: number) => {
      const targetMonth = currentMonth + delta;
      const firstDayOfTarget = new Date(currentYear, targetMonth, 1);
      const lastDayOfTarget = new Date(currentYear, targetMonth + 1, 0);

      if (minDate && lastDayOfTarget < minDate) return;
      if (maxDate && firstDayOfTarget > maxDate) return;

      setSelectedDate(firstDayOfTarget);
    };

    return (
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => changeMonth(-1)}
            disabled={minDate && new Date(currentYear, currentMonth, 0) < minDate}
          >
            <Ionicons name="chevron-back" size={24} color="#6366f1" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b' }}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => changeMonth(1)}
            disabled={maxDate && new Date(currentYear, currentMonth + 1, 1) > maxDate}
          >
            <Ionicons name="chevron-forward" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          {weekDays.map((day) => (
            <View key={day} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginVertical: 2 },
                isSelected(day) && { backgroundColor: '#6366f1' },
                isToday(day) && !isSelected(day) && { backgroundColor: '#f1f5f9' },
                isDisabled(day) && { opacity: 0.3 },
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
                  { fontSize: 16, color: '#1e293b', fontWeight: '600' },
                  isSelected(day) && { color: '#fff', fontWeight: '800' },
                  isToday(day) && !isSelected(day) && { color: '#6366f1' },
                  isDisabled(day) && { color: '#94a3b8' },
                ]}
              >
                {day || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#f1f5f9' }]}
            onPress={() => {
              const today = new Date();
              if ((!minDate || today >= minDate) && (!maxDate || today <= maxDate)) {
                handleDateSelect(today.getFullYear(), today.getMonth() + 1, today.getDate());
              }
            }}
          >
            <Text style={{ color: '#1e293b', fontWeight: '700' }}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#fee2e2' }]}
            onPress={() => {
              setSelectedDate(null);
              onChange('');
              setShowPicker(false);
            }}
          >
            <Text style={{ color: '#ef4444', fontWeight: '700' }}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderWidth: 2,
          borderColor: '#e2e8f0',
          borderRadius: 12,
          backgroundColor: '#f8fafc',
        }}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color="#6366f1" style={{ marginRight: 10 }} />
        <Text style={{ color: value ? '#1e293b' : '#94a3b8', fontSize: 16, fontWeight: '600' }}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', maxHeight: '90%' }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPicker(false)}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView>{renderCalendar()}</ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
