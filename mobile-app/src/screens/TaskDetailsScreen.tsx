import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import {
  type ReminderConfig,
  convertBackendToReminders,
} from '@tasks-management/frontend-services';

import { useTaskDetails } from '../hooks/useTaskDetails';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../utils/useThemedStyles';
import { createTaskDetailsStyles } from './styles/TaskDetailsScreen.styles';

import ReminderConfigComponent from '../components/ReminderConfig';
import DatePicker from '../components/DatePicker';
import { TaskHeader } from '../components/task/TaskHeader';
import { TaskInfoSection } from '../components/task/TaskInfoSection';
import { StepsList } from '../components/task/StepsList';
import AddStepModal from '../components/task/AddStepModal';
import { isRepeatingTask as checkIsRepeatingTask } from '../utils/taskHelpers';

type TaskDetailsRouteProp = RouteProp<RootStackParamList, 'TaskDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TaskDetailsScreen() {
  const route = useRoute<TaskDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { taskId } = route.params;
  const { colors } = useTheme();
  const styles = useThemedStyles(createTaskDetailsStyles);

  const {
    task,
    steps,
    loading,
    refreshing,
    isEditing,
    isSubmitting,
    editDescription,
    editDueDate,
    editReminders,
    reminderAlarmStates,
    setEditDescription,
    setEditDueDate,
    setEditReminders,
    setIsEditing,
    onRefresh,
    handleToggleTask,
    handleSaveEdit,
    handleCancelEdit,
    handleToggleStep,
    handleAddStep,
    handleDeleteStep,
    updateStep,
    handleToggleReminderAlarm,
  } = useTaskDetails(taskId);

  // Local UI state
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingStepDescription, setEditingStepDescription] = useState('');

  // Computed values
  const displayReminders = useMemo(() => {
    if (!task || isEditing) return [];
    const raw = convertBackendToReminders(
      task.reminderDaysBefore,
      task.specificDayOfWeek,
      task.dueDate || undefined,
      task.reminderConfig
    ) as ReminderConfig[];

    return raw.map(r => ({
      ...r,
      hasAlarm: reminderAlarmStates[r.id] ?? r.hasAlarm ?? false,
      time: editReminders.find(er => er.id === r.id)?.time ?? r.time ?? '09:00',
    }));
  }, [task, isEditing, reminderAlarmStates, editReminders]);

  const isRepeating = useMemo(() => {
    if (!task) return false;
    // Check for every-day reminders in displayReminders
    const hasEveryDay = displayReminders.some(r => r.timeframe === 'EVERY_DAY');
    return checkIsRepeatingTask(task as any, hasEveryDay ? [{ timeframe: 'EVERY_DAY' }] : []);
  }, [task, displayReminders]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <LinearGradient
          colors={[colors.primary, colors.purple]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Task Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!isEditing ? (
          <TaskHeader
            task={task}
            isEditing={false}
            editDescription={editDescription}
            onEditDescriptionChange={setEditDescription}
            onToggleTask={handleToggleTask}
            onEditPress={() => setIsEditing(true)}
            completionCount={task.completionCount || 0}
            isRepeatingTask={isRepeating}
          />
        ) : (
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={[styles.checkbox, task.completed && styles.checkboxCompleted]}
                onPress={handleToggleTask}
              >
                {task.completed && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <TextInput
                style={styles.editInput}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                autoFocus
              />
            </View>
          </View>
        )}

        {!isEditing ? (
          <TaskInfoSection
            task={task}
            isEditing={false}
            editDueDate={editDueDate}
            onEditDueDateChange={setEditDueDate}
            displayReminders={displayReminders}
            reminderAlarmStates={reminderAlarmStates}
            onToggleReminderAlarm={handleToggleReminderAlarm}
          />
        ) : (
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date:</Text>
              <View style={styles.datePickerContainer}>
                <DatePicker value={editDueDate} onChange={setEditDueDate} placeholder="No due date" />
              </View>
            </View>
          </View>
        )}

        {isEditing && (
          <View style={styles.section}>
            <ReminderConfigComponent reminders={editReminders} onRemindersChange={setEditReminders} />
          </View>
        )}

        <StepsList
          steps={steps}
          editingStepId={editingStepId}
          editingStepDescription={editingStepDescription}
          onEditingStepDescriptionChange={setEditingStepDescription}
          onToggleStep={handleToggleStep}
          onEditStep={(step) => { setEditingStepId(step.id); setEditingStepDescription(step.description); }}
          onSaveStepEdit={async () => {
            if (editingStepId) {
              await updateStep(editingStepId, editingStepDescription);
              setEditingStepId(null);
            }
          }}
          onCancelStepEdit={() => setEditingStepId(null)}
          onDeleteStep={(step) => handleDeleteStep(step.id)}
          onAddStepPress={() => setShowAddStepModal(true)}
        />

        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AddStepModal
        visible={showAddStepModal}
        onClose={() => setShowAddStepModal(false)}
        onAdd={handleAddStep}
        styles={styles}
      />
    </View>
  );
}
