import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { tasksService } from '../services/tasks.service';
import { Task, CreateTaskDto, ListType } from '../types';
import type { ReminderConfig } from '@tasks-management/frontend-services';
import ReminderConfigComponent from '../components/ReminderConfig';
import DatePicker from '../components/DatePicker';
import { scheduleTaskReminders, cancelAllTaskNotifications } from '../services/notifications.service';
import { ReminderTimesStorage, ReminderAlarmsStorage } from '../utils/storage';
import { convertRemindersToBackend } from '@tasks-management/frontend-services';
import { formatDate } from '../utils/helpers';
import { handleApiError, isAuthError, showErrorAlert } from '../utils/errorHandler';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../utils/useThemedStyles';
import { createTasksStyles } from './styles/TasksScreen.styles';
import { TaskListItem } from '../components/task/TaskListItem';

type TasksScreenRouteProp = RouteProp<RootStackParamList, 'Tasks'>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TasksScreen() {
  const route = useRoute<TasksScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { listId, listName, listType } = route.params;
  const { colors } = useTheme();
  const styles = useThemedStyles(createTasksStyles);

  // Helper to check if a task has repeating reminders (based on task properties, not list type)
  const isRepeatingTask = (task: Task): boolean => {
    // Task has weekly reminder if specificDayOfWeek is set
    return task.specificDayOfWeek !== null && task.specificDayOfWeek !== undefined;
  };
  // Check if this is the archived list
  const isArchivedList = listType === ListType.FINISHED;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskReminders, setTaskReminders] = useState<ReminderConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'dueDate' | 'completed' | 'alphabetical'>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  const loadTasks = async () => {
    try {
      const data = await tasksService.getAll(listId);
      // Ensure all boolean fields are properly typed
      const normalizedTasks = data.map((task) => ({
        ...task,
        completed: Boolean(task.completed),
      }));
      setAllTasks(normalizedTasks);
    } catch (error: any) {
      // Silently ignore auth errors - the navigation will handle redirect to login
      if (!isAuthError(error)) {
        handleApiError(error, 'Unable to load tasks. Please try again later.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (tasksToFilter: Task[]): Task[] => {
    if (!searchQuery.trim()) {
      return tasksToFilter;
    }
    const query = searchQuery.toLowerCase().trim();
    return tasksToFilter.filter((task) =>
      task.description.toLowerCase().includes(query)
    );
  };

  const applySorting = (tasksToSort: Task[]) => {
    const sorted = [...tasksToSort];

    switch (sortBy) {
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;
      case 'completed':
        sorted.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.description.localeCompare(b.description));
        break;
      default:
        // Keep original order (by order field)
        sorted.sort((a, b) => a.order - b.order);
    }

    setTasks(sorted);
  };

  useEffect(() => {
    loadTasks();
  }, [listId]);

  useEffect(() => {
    const filtered = applyFilter(allTasks);
    applySorting(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, allTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const toggleTask = async (task: Task) => {
    const currentCompleted = Boolean(task.completed);
    const newCompleted = !currentCompleted;

    // Optimistic update - update UI immediately
    setAllTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === task.id ? { ...t, completed: newCompleted } : t
      )
    );

    try {
      await tasksService.update(task.id, { completed: newCompleted });
      // No need to reload - optimistic update already applied
    } catch (error: any) {
      // Revert on error
      setAllTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id ? { ...t, completed: currentCompleted } : t
        )
      );
      handleApiError(error, 'Unable to update task. Please try again.');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      showErrorAlert('Validation Error', null, 'Please enter a task description before adding.');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData: CreateTaskDto = {
        description: newTaskDescription.trim(),
      };

      // Add due date if provided
      let dueDateStr: string | undefined;
      if (newTaskDueDate.trim()) {
        // Convert date string to ISO format
        const date = new Date(newTaskDueDate);
        if (!isNaN(date.getTime())) {
          dueDateStr = date.toISOString();
          taskData.dueDate = dueDateStr;
        }
      }

      // Convert reminders to backend format
      if (taskReminders.length > 0) {
        const reminderData = convertRemindersToBackend(taskReminders, dueDateStr);
        // Always set reminderDaysBefore - use the converted value or empty array
        // Only set it if we actually have reminders to process
        if (reminderData.reminderDaysBefore !== undefined) {
          taskData.reminderDaysBefore = reminderData.reminderDaysBefore;
        } else {
          // If no reminderDaysBefore in result, set empty array to clear any existing reminders
          taskData.reminderDaysBefore = [];
        }
        // Set specificDayOfWeek if provided
        if (reminderData.specificDayOfWeek !== undefined && reminderData.specificDayOfWeek !== null) {
          taskData.specificDayOfWeek = reminderData.specificDayOfWeek;
        } else {
          taskData.specificDayOfWeek = undefined;
        }
      } else {
        taskData.reminderDaysBefore = [];
        taskData.specificDayOfWeek = undefined;
      }

      const createdTask = await tasksService.create(listId, taskData);

      // Store reminder times for all reminders (backend doesn't store times)
      const reminderTimes: Record<string, string> = {};
      taskReminders.forEach(reminder => {
        if (reminder.time && reminder.time !== '09:00') {
          // Only store if time is different from default
          reminderTimes[reminder.id] = reminder.time;
        }
      });

      if (Object.keys(reminderTimes).length > 0) {
        await ReminderTimesStorage.setTimesForTask(createdTask.id, reminderTimes);
      }

      setNewTaskDescription('');
      setNewTaskDueDate('');
      setTaskReminders([]);
      setShowAddModal(false);

      // Schedule notifications for reminders (include all reminders)
      if (taskReminders.length > 0) {
        await scheduleTaskReminders(
          createdTask.id,
          createdTask.description,
          taskReminders,
          dueDateStr || null,
        );
      }

      // Reload tasks to refresh daily reminders state
      await loadTasks();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      handleApiError(error, 'Unable to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel all notifications for this task
              await cancelAllTaskNotifications(task.id);
              // Clean up client-side storage for this task
              await ReminderTimesStorage.removeTimesForTask(task.id);
              await ReminderAlarmsStorage.removeAlarmsForTask(task.id);
              await tasksService.delete(task.id);
              loadTasks();
            } catch (error: any) {
              handleApiError(error, 'Unable to delete task. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleArchivedTaskOptions = (task: Task) => {
    Alert.alert(
      'Archived Task',
      `What would you like to do with "${task.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await tasksService.restore(task.id);
              showErrorAlert('Success', null, 'Task restored to original list');
              loadTasks();
            } catch (error: any) {
              handleApiError(error, 'Unable to restore task. Please try again.');
            }
          },
        },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Permanently Delete?',
              'This action cannot be undone. The task will be deleted forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Cancel all notifications for this task
                      await cancelAllTaskNotifications(task.id);
                      // Clean up client-side storage
                      await ReminderTimesStorage.removeTimesForTask(task.id);
                      await ReminderAlarmsStorage.removeAlarmsForTask(task.id);
                      await tasksService.permanentDelete(task.id);
                      loadTasks();
                    } catch (error: any) {
                      handleApiError(error, 'Unable to delete task. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, '#a855f7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>{listName}</Text>
            <Text style={styles.taskCount}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.searchSortRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortMenu(true)}
          >
            <Text style={styles.sortButtonText}>
              Sort: {sortBy === 'default' ? 'Default' : sortBy === 'dueDate' ? 'Due Date' : sortBy === 'completed' ? 'Status' : 'A-Z'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TaskListItem
            task={item}
            onPress={() => navigation.navigate('TaskDetails', { taskId: item.id })}
            onLongPress={() => isArchivedList ? handleArchivedTaskOptions(item) : handleDeleteTask(item)}
            onToggle={() => toggleTask(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button below to add your first task
            </Text>
          </View>
        }
        contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.listContentContainer}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366f1', '#a855f7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%', borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Task</Text>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <TextInput
                style={styles.input}
                placeholder="Task description"
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                autoFocus
                placeholderTextColor="#999"
              />

              <DatePicker
                value={newTaskDueDate}
                onChange={setNewTaskDueDate}
                placeholder="Due date (Optional)"
              />

              <ReminderConfigComponent
                reminders={taskReminders}
                onRemindersChange={setTaskReminders}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewTaskDescription('');
                  setNewTaskDueDate('');
                  setTaskReminders([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddTask}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Menu Modal */}
      <Modal
        visible={showSortMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSortMenu(false)}
      >
        <TouchableOpacity
          style={styles.sortMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowSortMenu(false)}
        >
          <View style={styles.sortMenuContent}>
            <Text style={styles.sortMenuTitle}>Sort Tasks</Text>
            {[
              { value: 'default', label: 'Default (Order)' },
              { value: 'dueDate', label: 'Due Date' },
              { value: 'completed', label: 'Completion Status' },
              { value: 'alphabetical', label: 'Alphabetical' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  sortBy === option.value && styles.sortOptionSelected,
                ]}
                onPress={() => {
                  setSortBy(option.value as any);
                  setShowSortMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
