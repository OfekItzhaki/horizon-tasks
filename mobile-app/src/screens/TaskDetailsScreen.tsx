import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import { Task, Step, UpdateTaskDto, ReminderConfig, ReminderTimeframe, ReminderSpecificDate } from '../types';
import ReminderConfigComponent from '../components/ReminderConfig';
import DatePicker from '../components/DatePicker';
import { scheduleTaskReminders, cancelAllTaskNotifications } from '../services/notifications.service';
import { EveryDayRemindersStorage, ReminderAlarmsStorage, ReminderTimesStorage } from '../utils/storage';
import { convertRemindersToBackend, formatDate, formatReminderDisplay } from '../utils/helpers';
import { handleApiError, isAuthError, showErrorAlert } from '../utils/errorHandler';
import { TaskHeader } from '../components/task/TaskHeader';
import { TaskInfoSection } from '../components/task/TaskInfoSection';
import { StepsList } from '../components/task/StepsList';
import { isRepeatingTask as checkIsRepeatingTask } from '../utils/taskHelpers';
import { styles } from './styles/TaskDetailsScreen.styles';

type TaskDetailsRouteProp = RouteProp<RootStackParamList, 'TaskDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TaskDetailsScreen() {
  const route = useRoute<TaskDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayEveryDayReminders, setDisplayEveryDayReminders] = useState<ReminderConfig[]>([]);
  const [reminderAlarmStates, setReminderAlarmStates] = useState<Record<string, boolean>>({});

  // Edit form state
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editReminders, setEditReminders] = useState<ReminderConfig[]>([]);

  // Step management
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [newStepDescription, setNewStepDescription] = useState('');
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingStepDescription, setEditingStepDescription] = useState('');

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  // Sync editReminders with alarm states when they change (for edit mode sync)
  useEffect(() => {
    if (Object.keys(reminderAlarmStates).length > 0) {
      setEditReminders(prev => 
        prev.map(r => ({
          ...r,
          hasAlarm: reminderAlarmStates[r.id] !== undefined ? reminderAlarmStates[r.id] : r.hasAlarm,
        }))
      );
    }
  }, [reminderAlarmStates]);

  // Convert backend format to ReminderConfig format
  const convertBackendToReminders = (
    reminderDaysBefore: number[] | undefined,
    specificDayOfWeek: number | null | undefined,
    dueDate: string | null | undefined,
  ): ReminderConfig[] => {
    const reminders: ReminderConfig[] = [];

    // Convert reminderDaysBefore array to ReminderConfig
    // Only show these if there's a due date, since they're relative to due date
    if (reminderDaysBefore && reminderDaysBefore.length > 0 && dueDate) {
      reminderDaysBefore.forEach((days) => {
        reminders.push({
          id: `days-before-${days}`,
          timeframe: ReminderTimeframe.SPECIFIC_DATE,
          time: '09:00', // Default time, user can edit
          daysBefore: days,
        });
      });
    }

    // Convert specificDayOfWeek to ReminderConfig
    // Note: Backend only supports 0-6 (weekly reminders), so "every day" reminders
    // are handled client-side only via notifications
    if (specificDayOfWeek !== null && specificDayOfWeek !== undefined && specificDayOfWeek >= 0 && specificDayOfWeek <= 6) {
      reminders.push({
        id: `day-of-week-${specificDayOfWeek}`,
        timeframe: ReminderTimeframe.EVERY_WEEK,
        time: '09:00', // Default time, user can edit
        dayOfWeek: specificDayOfWeek,
      });
    }
    
    // Note: EVERY_DAY reminders are stored client-side only (not in backend)
    // They're handled via the notification system but won't persist in task details

    return reminders;
  };

  const loadTaskData = async () => {
    try {
      const [taskData, stepsData] = await Promise.all([
        tasksService.getById(taskId),
        stepsService.getByTask(taskId),
      ]);

      setTask(taskData);
      setSteps(stepsData);

      // Initialize edit form
      setEditDescription(taskData.description);
      setEditDueDate(taskData.dueDate ? taskData.dueDate.split('T')[0] : '');
      // Convert reminderDaysBefore to ReminderConfig format
      let convertedReminders = convertBackendToReminders(
        taskData.reminderDaysBefore,
        taskData.specificDayOfWeek,
        taskData.dueDate || undefined,
      );
      
      // Load client-side stored "every day" reminders
      const everyDayReminders = await EveryDayRemindersStorage.getRemindersForTask(taskId);
      setDisplayEveryDayReminders(everyDayReminders || []);
      
      if (everyDayReminders && everyDayReminders.length > 0) {
        convertedReminders = [...convertedReminders, ...everyDayReminders];
      }
      
      // Load alarm states for all reminders
      const alarmStates = await ReminderAlarmsStorage.getAlarmsForTask(taskId);
      setReminderAlarmStates(alarmStates || {});
      
      // Load saved times for all reminders
      const savedTimes = await ReminderTimesStorage.getTimesForTask(taskId);
      
      // Apply alarm states and saved times to all reminders
      if (alarmStates || savedTimes) {
        convertedReminders = convertedReminders.map(r => ({
          ...r,
          hasAlarm: alarmStates?.[r.id] !== undefined ? alarmStates[r.id] : r.hasAlarm,
          // Use saved time if available, otherwise keep the default/current time
          time: savedTimes?.[r.id] || r.time || '09:00',
        }));
      }
      
      setEditReminders(convertedReminders);
    } catch (error: any) {
      // Silently ignore auth errors - the navigation will handle redirect to login
      if (!isAuthError(error)) {
        handleApiError(error, 'Unable to load task. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTaskData();
  };

  const handleSaveEdit = async () => {
    if (!editDescription.trim()) {
      showErrorAlert('Validation Error', null, 'Please enter a task description before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: UpdateTaskDto = {
        description: editDescription.trim(),
      };

      let dueDateStr: string | undefined;
      if (editDueDate.trim()) {
        const date = new Date(editDueDate);
        if (!isNaN(date.getTime())) {
          dueDateStr = date.toISOString();
          updateData.dueDate = dueDateStr;
        }
      } else {
        updateData.dueDate = null;
      }

      // Use existing task due date for reminder conversion if no new due date is being set
      // This ensures reminders that reference due date are properly converted
      const dueDateForConversion = dueDateStr || (task?.dueDate || undefined);
      
      // Convert reminders to backend format
      const reminderData = convertRemindersToBackend(editReminders, dueDateForConversion);
      
      // Always set reminderDaysBefore based on conversion result
      // convertRemindersToBackend returns empty array if no valid reminders or no due date
      updateData.reminderDaysBefore = reminderData.reminderDaysBefore || [];
      
      // Always set specificDayOfWeek (weekly reminders don't require due date)
      // Only set to null if we explicitly want to clear it (when undefined means "don't change")
      // But since we're always sending the full update, we should set it based on conversion result
      if (reminderData.specificDayOfWeek !== undefined) {
        updateData.specificDayOfWeek = reminderData.specificDayOfWeek;
      } else {
        // If no weekly reminder in conversion result, set to null to clear any existing one
        updateData.specificDayOfWeek = null;
      }

      const updatedTask = await tasksService.update(taskId, updateData);
      
      // Separate EVERY_DAY reminders (client-side storage) from others
      const everyDayReminders = editReminders.filter(r => r.timeframe === ReminderTimeframe.EVERY_DAY);
      const otherReminders = editReminders.filter(r => r.timeframe !== ReminderTimeframe.EVERY_DAY);
      
      // Store EVERY_DAY reminders client-side
      if (everyDayReminders.length > 0) {
        await EveryDayRemindersStorage.setRemindersForTask(taskId, everyDayReminders);
      } else {
        await EveryDayRemindersStorage.removeRemindersForTask(taskId);
      }
      
      // Store reminder times for all reminders (backend doesn't store times)
      // Use normalized IDs that will match after reload from backend
      const reminderTimes: Record<string, string> = {};
      editReminders.forEach(reminder => {
        if (reminder.time) {
          // Generate normalized ID based on reminder properties (same as convertBackendToReminders)
          let normalizedId = reminder.id;
          if (reminder.daysBefore !== undefined && reminder.daysBefore > 0) {
            normalizedId = `days-before-${reminder.daysBefore}`;
          } else if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
            normalizedId = `day-of-week-${reminder.dayOfWeek}`;
          } else if (reminder.timeframe === ReminderTimeframe.EVERY_DAY) {
            normalizedId = reminder.id; // Keep the original ID for EVERY_DAY reminders
          }
          // Store the time with normalized ID
          reminderTimes[normalizedId] = reminder.time;
        }
      });
      
      if (Object.keys(reminderTimes).length > 0) {
        await ReminderTimesStorage.setTimesForTask(taskId, reminderTimes);
      } else {
        await ReminderTimesStorage.removeTimesForTask(taskId);
      }
      
      setIsEditing(false);
      
      // Update scheduled notifications (include all reminders)
      if (editReminders.length > 0) {
        await scheduleTaskReminders(
          taskId,
          updatedTask.description,
          editReminders,
          dueDateStr || null,
        );
      } else {
        // Cancel all notifications if no reminders
        await cancelAllTaskNotifications(taskId);
      }
      
      loadTaskData();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      handleApiError(error, 'Unable to update task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (task) {
      setEditDescription(task.description);
      setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      // Reset reminders to original task reminders
      const convertedReminders = convertBackendToReminders(
        task.reminderDaysBefore,
        task.specificDayOfWeek,
        task.dueDate || undefined,
      );
      setEditReminders(convertedReminders);
    }
    setIsEditing(false);
  };

  const handleToggleTask = async () => {
    if (!task) return;

    const currentCompleted = Boolean(task.completed);
    const newCompleted = !currentCompleted;
    
    // Optimistic update - update UI immediately
    setTask(prev => prev ? { ...prev, completed: newCompleted } : prev);

    try {
      await tasksService.update(taskId, { completed: newCompleted });
      // No need to reload - optimistic update already applied
    } catch (error: any) {
      // Revert on error
      setTask(prev => prev ? { ...prev, completed: currentCompleted } : prev);
      handleApiError(error, 'Unable to toggle task completion. Please try again.');
    }
  };

  const handleAddStep = async () => {
    if (!newStepDescription.trim()) {
      showErrorAlert('Validation Error', null, 'Please enter a step description before adding.');
      return;
    }

    try {
      await stepsService.create(taskId, { description: newStepDescription.trim() });
      setNewStepDescription('');
      setShowAddStepModal(false);
      loadTaskData();
    } catch (error: any) {
      handleApiError(error, 'Unable to add step. Please try again.');
    }
  };

  const handleToggleStep = async (step: Step) => {
    const currentCompleted = Boolean(step.completed);
    const newCompleted = !currentCompleted;
    
    // Optimistic update - update UI immediately
    setSteps(prevSteps => 
      prevSteps.map(s => 
        s.id === step.id ? { ...s, completed: newCompleted } : s
      )
    );

    try {
      await stepsService.update(step.id, { completed: newCompleted });
      // No need to reload - optimistic update already applied
    } catch (error: any) {
      // Revert on error
      setSteps(prevSteps => 
        prevSteps.map(s => 
          s.id === step.id ? { ...s, completed: currentCompleted } : s
        )
      );
      handleApiError(error, 'Unable to update step. Please try again.');
    }
  };

  const handleDeleteStep = async (step: Step) => {
    try {
      await stepsService.delete(step.id);
      loadTaskData();
    } catch (error: any) {
      handleApiError(error, 'Unable to delete step. Please try again.');
    }
  };

  const handleToggleReminderAlarm = async (reminderId: string) => {
    if (!task) return;

    try {
      // Get current alarm state from storage
      const currentAlarmState = reminderAlarmStates[reminderId] !== undefined 
        ? reminderAlarmStates[reminderId] 
        : false;
      const newAlarmState = !currentAlarmState;

      // Save new alarm state to storage
      await ReminderAlarmsStorage.setAlarmForReminder(taskId, reminderId, newAlarmState);

      // Update local state immediately for instant visual feedback
      setReminderAlarmStates(prev => ({
        ...prev,
        [reminderId]: newAlarmState,
      }));

      // Get all reminders to update notifications
      const backendReminders = convertBackendToReminders(
        task.reminderDaysBefore,
        task.specificDayOfWeek,
        task.dueDate || undefined,
      );
      const everyDayReminders = await EveryDayRemindersStorage.getRemindersForTask(taskId) || [];
      const allReminders = [...backendReminders, ...everyDayReminders];

      // Apply updated alarm states to all reminders
      const updatedAlarmStates = { ...reminderAlarmStates, [reminderId]: newAlarmState };
      const updatedReminders = allReminders.map((r) => ({
        ...r,
        hasAlarm: updatedAlarmStates[r.id] !== undefined ? updatedAlarmStates[r.id] : false,
      }));

      // Reschedule notifications with updated alarm settings
      await scheduleTaskReminders(
        taskId,
        task.description,
        updatedReminders,
        task.dueDate || null,
      );
      
      // No need to reload - state is already updated for immediate visual feedback
    } catch (error: any) {
      handleApiError(error, 'Unable to update reminder alarm. Please try again.');
      // Reload to restore correct state on error
      loadTaskData();
    }
  };

  const handleEditStep = (step: Step) => {
    setEditingStepId(step.id);
    setEditingStepDescription(step.description);
  };

  const handleSaveStepEdit = async () => {
    if (!editingStepId || !editingStepDescription.trim()) {
      setEditingStepId(null);
      return;
    }

    try {
      await stepsService.update(editingStepId, { description: editingStepDescription.trim() });
      setEditingStepId(null);
      setEditingStepDescription('');
      loadTaskData();
    } catch (error: any) {
      handleApiError(error, 'Unable to update step. Please try again.');
    }
  };

  const handleCancelStepEdit = () => {
    setEditingStepId(null);
    setEditingStepDescription('');
  };


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
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

  const isCompleted = Boolean(task.completed);
  
  // Check if task has repeating reminders (based on task properties, not list type)
  // A task is repeating if it has weekly reminders (specificDayOfWeek) or daily reminders (client-side)
  const isRepeatingTask = checkIsRepeatingTask(task, displayEveryDayReminders);
  
  // Prepare display reminders
  const displayReminders = !isEditing ? (() => {
    const backendReminders = convertBackendToReminders(
      task.reminderDaysBefore,
      task.specificDayOfWeek,
      task.dueDate || undefined,
    );
    
    // Add client-side stored EVERY_DAY reminders for display
    let allDisplayReminders = [...backendReminders, ...displayEveryDayReminders];
    
    // Apply alarm states and saved times from state
    allDisplayReminders = allDisplayReminders.map(r => {
      // Find matching reminder in editReminders to get the correct time
      const matchingReminder = editReminders.find(er => er.id === r.id);
      return {
        ...r,
        hasAlarm: reminderAlarmStates[r.id] !== undefined ? reminderAlarmStates[r.id] : (r.hasAlarm || false),
        time: matchingReminder?.time || r.time || '09:00',
      };
    });
    
    return allDisplayReminders;
  })() : [];

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Task Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={true}
      >
        {/* Task Header */}
        {!isEditing ? (
          <TaskHeader
            task={task}
            isEditing={false}
            editDescription={editDescription}
            onEditDescriptionChange={setEditDescription}
            onToggleTask={handleToggleTask}
            onEditPress={() => setIsEditing(true)}
            completionCount={task.completionCount || 0}
            isRepeatingTask={isRepeatingTask}
          />
        ) : (
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
                onPress={handleToggleTask}
              >
                {isCompleted && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <View style={styles.headerText}>
                <TextInput
                  style={styles.editInput}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  autoFocus
                />
              </View>
            </View>
          </View>
        )}

        {/* Task Info */}
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
                <DatePicker
                  value={editDueDate}
                  onChange={setEditDueDate}
                  placeholder="No due date"
                />
              </View>
            </View>
          </View>
        )}

        {/* Reminders Section (when editing) */}
        {isEditing && (
          <View style={styles.section}>
            <ReminderConfigComponent
              reminders={editReminders}
              onRemindersChange={setEditReminders}
            />
          </View>
        )}

        {/* Steps Section */}
        <StepsList
          steps={steps}
          editingStepId={editingStepId}
          editingStepDescription={editingStepDescription}
          onEditingStepDescriptionChange={setEditingStepDescription}
          onToggleStep={handleToggleStep}
          onEditStep={handleEditStep}
          onSaveStepEdit={handleSaveStepEdit}
          onCancelStepEdit={handleCancelStepEdit}
          onDeleteStep={handleDeleteStep}
          onAddStepPress={() => setShowAddStepModal(true)}
        />

        {/* Edit Actions */}
        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Step Modal */}
      <Modal
        visible={showAddStepModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddStepModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Step</Text>
            <TextInput
              style={styles.input}
              placeholder="Step description"
              value={newStepDescription}
              onChangeText={setNewStepDescription}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddStepModal(false);
                  setNewStepDescription('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddStep}
              >
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
