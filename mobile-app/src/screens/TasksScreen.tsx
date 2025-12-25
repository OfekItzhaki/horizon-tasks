import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { tasksService } from '../services/tasks.service';
import { Task, CreateTaskDto, ReminderConfig, ReminderTimeframe, ReminderSpecificDate } from '../types';
import ReminderConfigComponent from '../components/ReminderConfig';
import DatePicker from '../components/DatePicker';
import { scheduleTaskReminders, cancelAllTaskNotifications } from '../services/notifications.service';
import { EveryDayRemindersStorage, ReminderTimesStorage } from '../utils/storage';

type TasksScreenRouteProp = RouteProp<RootStackParamList, 'Tasks'>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TasksScreen() {
  const route = useRoute<TasksScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { listId, listName } = route.params;
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
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [listId]);

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
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to load tasks. Please try again.';
      Alert.alert('Error Loading Tasks', errorMessage);
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
    let sorted = [...tasksToSort];

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
    try {
      // Ensure we're working with a proper boolean
      const currentCompleted = Boolean(task.completed);
      await tasksService.update(task.id, { completed: !currentCompleted });
      loadTasks(); // Reload tasks
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to update task. Please try again.';
      Alert.alert('Update Failed', errorMessage);
    }
  };

  // Convert reminder configs to backend format
  const convertRemindersToBackend = (
    reminders: ReminderConfig[],
    dueDate?: string,
  ): { dueDate?: string; reminderDaysBefore?: number[]; specificDayOfWeek?: number } => {
    const result: { dueDate?: string; reminderDaysBefore?: number[]; specificDayOfWeek?: number } = {};

    if (dueDate) {
      result.dueDate = new Date(dueDate).toISOString();
    }

    const daysBefore: number[] = [];
    let dayOfWeek: number | undefined;

    reminders.forEach((reminder) => {
      // Note: EVERY_DAY reminders are NOT saved to backend (backend only supports 0-6 for weekly)
      // They're handled client-side via notifications only
      // Skip EVERY_DAY reminders for backend storage
      if (reminder.timeframe === ReminderTimeframe.EVERY_DAY) {
        return; // Skip - handled by notification system only
      }
      
      // For reminders with daysBefore (relative to due date) - this is the primary use case
      if (reminder.daysBefore !== undefined && reminder.daysBefore > 0) {
        if (dueDate) {
          daysBefore.push(reminder.daysBefore);
        }
        // Note: daysBefore reminders require a due date, but we still want to save them
        // if a due date is provided in the same request
      }

      // For weekly reminders
      if (reminder.timeframe === ReminderTimeframe.EVERY_WEEK && reminder.dayOfWeek !== undefined) {
        dayOfWeek = reminder.dayOfWeek;
      }

      // For specific date reminders that are relative to due date
      if (reminder.timeframe === ReminderTimeframe.SPECIFIC_DATE && dueDate && reminder.customDate) {
        const reminderDate = new Date(reminder.customDate);
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays <= 365) { // Reasonable range
          daysBefore.push(diffDays);
        }
      }
    });

    // Always set reminderDaysBefore if we have valid daysBefore values
    if (daysBefore.length > 0) {
      // Remove duplicates and sort descending
      result.reminderDaysBefore = [...new Set(daysBefore)].sort((a, b) => b - a);
    } else {
      // Set empty array if no daysBefore reminders
      result.reminderDaysBefore = [];
    }

    // Set specificDayOfWeek (0-6 for weekly reminders only, backend doesn't support "every day")
    if (dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6) {
      result.specificDayOfWeek = dayOfWeek;
    }

    return result;
  };

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter a task description before adding.');
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
        if (reminderData.specificDayOfWeek !== undefined) {
          taskData.specificDayOfWeek = reminderData.specificDayOfWeek;
        } else {
          // Clear specificDayOfWeek if not in result
          taskData.specificDayOfWeek = null;
        }
      } else {
        // Explicitly set empty arrays to prevent backend defaults
        taskData.reminderDaysBefore = [];
        taskData.specificDayOfWeek = null;
      }

      const createdTask = await tasksService.create(listId, taskData);
      
      // Separate EVERY_DAY reminders (client-side storage) from others
      const everyDayReminders = taskReminders.filter(r => r.timeframe === ReminderTimeframe.EVERY_DAY);
      const otherReminders = taskReminders.filter(r => r.timeframe !== ReminderTimeframe.EVERY_DAY);
      
      // Store EVERY_DAY reminders client-side
      if (everyDayReminders.length > 0) {
        await EveryDayRemindersStorage.setRemindersForTask(createdTask.id, everyDayReminders);
      }
      
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
      
      loadTasks();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to create task. Please try again.';
      Alert.alert('Create Task Failed', errorMessage);
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
              await tasksService.delete(task.id);
              loadTasks();
            } catch (error: any) {
              const errorMessage = error?.response?.data?.message || error?.message || 'Unable to delete task. Please try again.';
              Alert.alert('Delete Failed', errorMessage);
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{listName}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
            <Text style={styles.taskCount}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        {showSearch && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        )}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(true)}
        >
          <Text style={styles.sortButtonText}>
            Sort: {sortBy === 'default' ? 'Default' : sortBy === 'dueDate' ? 'Due Date' : sortBy === 'completed' ? 'Status' : 'A-Z'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const isCompleted = Boolean(item.completed);
          const isOverdue =
            item.dueDate &&
            !isCompleted &&
            new Date(item.dueDate) < new Date() &&
            new Date(item.dueDate).toDateString() !== new Date().toDateString();

          return (
            <TouchableOpacity
              style={[
                styles.taskItem,
                isCompleted && styles.taskItemCompleted,
                isOverdue && styles.taskItemOverdue,
              ]}
              onPress={() => {
                // Navigate to task details on tap
                navigation.navigate('TaskDetails', { taskId: item.id });
              }}
              onLongPress={() => handleDeleteTask(item)}
            >
              <View style={styles.taskContent}>
                <View style={styles.taskCheckbox}>
                  {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.taskTextContainer}>
                  <Text
                    style={[
                      styles.taskText,
                      isCompleted && styles.taskTextCompleted,
                    ]}
                  >
                    {item.description}
                  </Text>
                  {item.dueDate && (
                    <Text
                      style={[
                        styles.dueDate,
                        isOverdue && styles.dueDateOverdue,
                      ]}
                    >
                      Due: {formatDate(item.dueDate)}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button below to add your first task
            </Text>
          </View>
        }
        contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    padding: 8,
  },
  searchButtonText: {
    fontSize: 20,
  },
  taskCount: {
    fontSize: 14,
    color: '#666',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  sortMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortMenuContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  sortMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  sortOptionSelected: {
    backgroundColor: '#007AFF',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskItemCompleted: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  taskItemOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTextContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  dueDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
  },
  dueDateOverdue: {
    color: '#f44336',
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 32,
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
    maxHeight: '90%',
    width: '100%',
    padding: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    padding: 20,
    paddingBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
    minHeight: 50,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalButton: {
    flex: 1,
    padding: 15,
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
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


