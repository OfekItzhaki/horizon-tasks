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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { tasksService } from '../services/tasks.service';
import { stepsService } from '../services/steps.service';
import { Task, Step, UpdateTaskDto } from '../types';
import {
  type ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  convertBackendToReminders,
  convertRemindersToBackend,
  formatReminderDisplay,
} from '@tasks-management/frontend-services';
import ReminderConfigComponent from '../components/ReminderConfig';
import DatePicker from '../components/DatePicker';
import { scheduleTaskReminders, cancelAllTaskNotifications } from '../services/notifications.service';
import { ReminderAlarmsStorage, ReminderTimesStorage } from '../utils/storage';
import { formatDate } from '../utils/helpers';
import { handleApiError, isAuthError, showErrorAlert } from '../utils/errorHandler';
import { TaskHeader } from '../components/task/TaskHeader';
import { TaskInfoSection } from '../components/task/TaskInfoSection';
import { StepsList } from '../components/task/StepsList';
import { isRepeatingTask as checkIsRepeatingTask } from '../utils/taskHelpers';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../utils/useThemedStyles';

type TaskDetailsRouteProp = RouteProp<RootStackParamList, 'TaskDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TaskDetailsScreen() {
  const route = useRoute<TaskDetailsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { taskId } = route.params;
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    screenHeader: {
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 45,
      paddingBottom: 24,
      borderBottomWidth: 0,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      position: 'relative',
      overflow: 'hidden',
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
      opacity: 0.08,
    },
    backButton: {
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.primary + '15',
    },
    backButtonText: {
      fontSize: 17,
      color: colors.primary,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    screenTitle: {
      fontSize: 32,
      fontWeight: '900',
      color: colors.primary,
      letterSpacing: -1,
      textShadowColor: colors.primary + '33',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      textAlign: 'center',
      flex: 1,
    },
    headerSpacer: {
      width: 60,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 50 : 40,
    },
    header: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2.5,
      borderColor: colors.primary,
      marginRight: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxCompleted: {
      backgroundColor: colors.primary,
    },
    checkmark: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    completionCountBadge: {
      fontSize: 13,
      color: colors.success,
      fontWeight: '600',
      backgroundColor: colors.success + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    editButton: {
      marginTop: 18,
      paddingVertical: 14,
      paddingHorizontal: 24,
      backgroundColor: colors.primary,
      borderRadius: 16,
      alignSelf: 'flex-start',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    editButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    editInput: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      borderBottomWidth: 2.5,
      borderBottomColor: colors.primary,
      paddingBottom: 10,
      paddingTop: 6,
      letterSpacing: -0.3,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    progressText: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    progressBar: {
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 5,
      marginBottom: 18,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 5,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: 12,
      minWidth: 100,
    },
    infoValue: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
      fontWeight: '500',
    },
    datePickerContainer: {
      flex: 1,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stepItemCompleted: {
      opacity: 0.6,
    },
    stepCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2.5,
      borderColor: colors.primary,
      marginRight: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepContent: {
      flex: 1,
    },
    stepText: {
      fontSize: 17,
      color: colors.text,
      fontWeight: '500',
    },
    stepTextCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    stepActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      gap: 8,
    },
    stepEditButton: {
      padding: 8,
    },
    stepEditButtonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
    stepDeleteButton: {
      padding: 8,
    },
    stepDeleteButtonText: {
      fontSize: 16,
      color: colors.error,
      fontWeight: '600',
    },
    stepEditContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    stepEditInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 10,
      padding: 10,
      marginRight: 10,
      backgroundColor: colors.surface,
    },
    stepEditSaveButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    stepEditSaveText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    stepEditCancelButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    stepEditCancelText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 24,
    },
    emptyStepsContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyStepsIcon: {
      fontSize: 52,
      marginBottom: 16,
      opacity: 0.3,
      color: colors.textSecondary,
    },
    emptyStepsText: {
      fontSize: 17,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: 6,
    },
    emptyStepsSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
    },
    addStepButton: {
      marginTop: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    addStepButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    editActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    saveButton: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 0,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      maxHeight: '80%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 25,
      overflow: 'hidden',
    },
    modalTitle: {
      fontSize: 32,
      fontWeight: '900',
      marginBottom: 0,
      padding: 28,
      paddingBottom: 20,
      color: colors.text,
      letterSpacing: -0.5,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 18,
      fontSize: 17,
      marginHorizontal: 24,
      marginTop: 24,
      marginBottom: 20,
      backgroundColor: colors.surface,
      minHeight: 56,
      color: colors.text,
      fontWeight: '500',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 0,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    submitButton: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    errorText: {
      fontSize: 17,
      color: colors.error,
      fontWeight: '600',
    },
    remindersList: {
      flex: 1,
      marginTop: 6,
    },
    reminderDisplayItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      paddingVertical: 8,
    },
    reminderDisplayText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      flex: 1,
      fontWeight: '500',
    },
    alarmToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      paddingHorizontal: 14,
      marginLeft: 8,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      minWidth: 80,
      justifyContent: 'center',
    },
    alarmToggleButtonActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
      borderWidth: 2,
    },
    alarmToggleIcon: {
      fontSize: 20,
      marginRight: 6,
      color: colors.textSecondary,
    },
    alarmToggleIconActive: {
      fontSize: 20,
      color: colors.primary,
    },
    alarmToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    alarmToggleTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
  }));

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
      let convertedReminders = convertBackendToReminders(
        taskData.reminderDaysBefore,
        taskData.specificDayOfWeek,
        taskData.dueDate || undefined,
        taskData.reminderConfig,
      );

      const everyDayReminders = convertedReminders.filter(r => r.timeframe === ReminderTimeframe.EVERY_DAY);
      setDisplayEveryDayReminders(everyDayReminders);

      setEditReminders(convertedReminders);

      // Update local alarm states for UI toggling consistency
      const alarmStates: Record<string, boolean> = {};
      convertedReminders.forEach(r => {
        alarmStates[r.id] = r.hasAlarm || false;
      });
      setReminderAlarmStates(alarmStates);
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
        updateData.specificDayOfWeek = null;
      }

      // Always set reminderConfig to preserve alarm states, locations, etc.
      updateData.reminderConfig = reminderData.reminderConfig || null;

      const updatedTask = await tasksService.update(taskId, updateData);

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

      // Update local state immediately for instant visual feedback
      setReminderAlarmStates(prev => ({
        ...prev,
        [reminderId]: newAlarmState,
      }));

      // Update the editReminders list as well, so if user clicks "Save" it persists
      setEditReminders(prev => prev.map(r =>
        r.id === reminderId ? { ...r, hasAlarm: newAlarmState } : r
      ));

      // Get all reminders to update notifications
      const backendReminders = convertBackendToReminders(
        task.reminderDaysBefore,
        task.specificDayOfWeek,
        task.dueDate || undefined,
      );
      const allReminders = convertBackendToReminders(
        task.reminderDaysBefore,
        task.specificDayOfWeek,
        task.dueDate || undefined,
        task.reminderConfig,
      );

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

      // PERSIST TO BACKEND
      const reminderData = convertRemindersToBackend(updatedReminders, task.dueDate || undefined);
      await tasksService.update(taskId, {
        reminderConfig: reminderData.reminderConfig || null,
        reminderDaysBefore: reminderData.reminderDaysBefore || [],
        specificDayOfWeek: reminderData.specificDayOfWeek !== undefined ? reminderData.specificDayOfWeek : null,
      });

      // Update the main task state to keep everything in sync
      setTask(prev => prev ? {
        ...prev,
        reminderConfig: reminderData.reminderConfig || null,
        reminderDaysBefore: reminderData.reminderDaysBefore || [],
        specificDayOfWeek: reminderData.specificDayOfWeek !== undefined ? reminderData.specificDayOfWeek : null
      } : prev);

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

  const isCompleted = Boolean(task.completed);

  // Check if task has repeating reminders (based on task properties, not list type)
  // A task is repeating if it has weekly reminders (specificDayOfWeek) or daily reminders (client-side)
  const isRepeatingTask = checkIsRepeatingTask(task, displayEveryDayReminders);

  // Prepare display reminders
  const displayReminders = !isEditing ? (() => {
    const raw = convertBackendToReminders(
      task.reminderDaysBefore,
      task.specificDayOfWeek,
      task.dueDate || undefined,
      task.reminderConfig,
    );
    return raw.map(r => {
      const matchingReminder = editReminders.find(er => er.id === r.id);
      return {
        ...r,
        hasAlarm: reminderAlarmStates[r.id] !== undefined ? reminderAlarmStates[r.id] : (r.hasAlarm ?? false),
        time: matchingReminder?.time ?? r.time ?? '09:00',
      };
    });
  })() : [];

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <LinearGradient
          colors={[colors.primary, colors.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
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
