import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { listsService } from '../services/lists.service';
import { tasksService } from '../services/tasks.service';
import { ToDoList, Task } from '../types';
import { useThemedStyles } from '../utils/useThemedStyles';
import { useTheme } from '../context/ThemeContext';

export default function AnalysisScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    statCard: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    statValueGreen: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.success,
      marginBottom: 4,
    },
    statValueBlue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    listRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    listName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    listStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    listStat: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    listStatGreen: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
    },
    listStatRed: {
      fontSize: 14,
      color: colors.error,
      fontWeight: '600',
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    typeCard: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
      textTransform: 'capitalize',
    },
    typeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    typeLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    typeValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
  }));

  const [lists, setLists] = useState<ToDoList[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const loadedLists = await listsService.getAll();
      setLists(loadedLists);

      const tasksPromises = loadedLists.map((list) => tasksService.getTasksByListId(list.id));
      const tasksArrays = await Promise.all(tasksPromises);
      setAllTasks(tasksArrays.flat());
    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const completedTasks = allTasks.filter((task) => task.completed);
  const pendingTasks = allTasks.filter((task) => !task.completed);
  const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

  // Tasks with due dates
  const tasksWithDueDates = allTasks.filter((task) => task.dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const overdueTasks = tasksWithDueDates.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < today && !task.completed;
  });

  const dueTodayTasks = tasksWithDueDates.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000) && !task.completed;
  });

  const dueThisWeekTasks = tasksWithDueDates.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate < weekFromNow && !task.completed;
  });

  const tasksByList = lists.map((list) => {
    const listTasks = allTasks.filter((task) => task.todoListId === list.id);
    return {
      listName: list.name,
      total: listTasks.length,
      completed: listTasks.filter((t) => t.completed).length,
      pending: listTasks.filter((t) => !t.completed).length,
    };
  });

  const tasksByType = lists.reduce((acc, list) => {
    const type = list.type;
    if (!acc[type]) {
      acc[type] = { total: 0, completed: 0, pending: 0 };
    }
    const listTasks = allTasks.filter((task) => task.todoListId === list.id);
    acc[type].total += listTasks.length;
    acc[type].completed += listTasks.filter((t) => t.completed).length;
    acc[type].pending += listTasks.filter((t) => !t.completed).length;
    return acc;
  }, {} as Record<string, { total: number; completed: number; pending: number }>);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Task Analysis</Text>

        {/* Overview Stats */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{lists.length}</Text>
              <Text style={styles.statLabel}>Lists</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{allTasks.length}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValueGreen}>{completedTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValueBlue}>{completionRate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Due Date Statistics */}
        {tasksWithDueDates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Due Date Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.error }]}>{overdueTasks.length}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {dueTodayTasks.length}
                </Text>
                <Text style={styles.statLabel}>Due Today</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {dueThisWeekTasks.length}
                </Text>
                <Text style={styles.statLabel}>Due This Week</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{tasksWithDueDates.length}</Text>
                <Text style={styles.statLabel}>With Dates</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tasks by List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks by List</Text>
          {tasksByList.map((item, index) => {
            const progress = item.total > 0 ? (item.completed / item.total) * 100 : 0;
            return (
              <View key={index}>
                <View style={styles.listRow}>
                  <Text style={styles.listName}>{item.listName}</Text>
                  <View style={styles.listStats}>
                    <Text style={styles.listStat}>{item.total} total</Text>
                    <Text style={styles.listStatGreen}>{item.completed} ✓</Text>
                    <Text style={styles.listStatRed}>{item.pending} ⏳</Text>
                  </View>
                </View>
                {item.total > 0 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Tasks by Type */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tasks by Type</Text>
          {Object.entries(tasksByType).map(([type, stats]) => {
            const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            return (
              <View key={type} style={styles.typeCard}>
                <Text style={styles.typeTitle}>{type}</Text>
                <View style={styles.typeRow}>
                  <Text style={styles.typeLabel}>Total:</Text>
                  <Text style={styles.typeValue}>{stats.total}</Text>
                </View>
                <View style={styles.typeRow}>
                  <Text style={styles.typeLabel}>Completed:</Text>
                  <Text style={[styles.typeValue, { color: colors.success }]}>
                    {stats.completed}
                  </Text>
                </View>
                <View style={styles.typeRow}>
                  <Text style={styles.typeLabel}>Pending:</Text>
                  <Text style={[styles.typeValue, { color: colors.error }]}>
                    {stats.pending}
                  </Text>
                </View>
                {stats.total > 0 && (
                  <>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={[styles.typeLabel, { marginTop: 4 }]}>
                      {progress.toFixed(1)}% complete
                    </Text>
                  </>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
