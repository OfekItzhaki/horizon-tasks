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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { listsService } from '../services/lists.service';
import { ToDoList, CreateTodoListDto } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../utils/useThemedStyles';
import { handleApiError, isAuthError } from '../utils/errorHandler';
import { rescheduleAllReminders } from '../services/notifications.service';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ListsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    header: {
      backgroundColor: colors.card,
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
    title: {
      fontSize: 40,
      fontWeight: '900',
      color: colors.primary,
      marginBottom: 8,
      letterSpacing: -1,
      textAlign: 'center',
      textShadowColor: 'rgba(99, 102, 241, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    listCount: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      textAlign: 'center',
    },
    listItem: {
      backgroundColor: colors.card,
      padding: 20,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    listContent: {
      flexDirection: 'column',
    },
    listInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    listName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    typeBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginTop: 4,
    },
    typeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 40,
      opacity: 0.7,
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: Platform.OS === 'ios' ? 50 : 40,
      width: 68,
      height: 68,
      borderRadius: 34,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    fabText: {
      fontSize: 38,
      color: '#fff',
      fontWeight: '200',
      lineHeight: 38,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
      marginBottom: 24,
      backgroundColor: colors.surface,
      color: colors.text,
      fontWeight: '500',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    typeLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10,
      color: colors.text,
    },
    typeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 20,
      gap: 8,
    },
    typeOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginRight: 8,
      marginBottom: 8,
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: '#fff',
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 8,
      gap: 12,
    },
    modalButton: {
      flex: 1,
      padding: 18,
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
  }));
  const [lists, setLists] = useState<ToDoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingList, setEditingList] = useState<ToDoList | null>(null);
  const [editListName, setEditListName] = useState('');

  useEffect(() => {
    loadLists();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadLists();
      
      // Reschedule all reminders to sync with backend (including web-app changes)
      // This runs in the background and doesn't block the UI
      rescheduleAllReminders().catch((error) => {
        if (__DEV__) {
          console.error('Error rescheduling reminders:', error);
        }
        // Silently fail - don't interrupt user experience
      });
    }, [])
  );

  const loadLists = async () => {
    try {
      const data = await listsService.getAll();
      setLists(data || []);
    } catch (error: any) {
      console.error('Error loading lists:', error);
      // Silently ignore auth errors - the navigation will handle redirect to login
      if (!isAuthError(error)) {
        handleApiError(error, 'Unable to load lists. Please try again later.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLists();
  };

  const handleListPress = (list: ToDoList) => {
    navigation.navigate('Tasks', {
      listId: list.id,
      listName: list.name,
      listType: list.type,
    });
  };

  const handleEditList = (list: ToDoList) => {
    setEditingList(list);
    setEditListName(list.name);
    setShowAddModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingList) return;

    if (!editListName.trim()) {
      Alert.alert('Validation Error', 'Please enter a list name before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      await listsService.update(editingList.id, {
        name: editListName.trim(),
      });
      setEditingList(null);
      setEditListName('');
      setShowAddModal(false);
      loadLists();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      handleApiError(error, 'Failed to update list. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddList = async () => {
    if (editingList) {
      handleSaveEdit();
      return;
    }

    if (!newListName.trim()) {
      Alert.alert('Validation Error', 'Please enter a list name before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const listData: CreateTodoListDto = {
        name: newListName.trim(),
      };

      await listsService.create(listData);
      setNewListName('');
      setShowAddModal(false);
      loadLists();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      handleApiError(error, 'Unable to create list. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteList = (list: ToDoList) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.name}"? This will also delete all tasks in this list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await listsService.delete(list.id);
              loadLists();
            } catch (error: any) {
              handleApiError(error, 'Unable to delete list. Please try again.');
            }
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
        <Text style={styles.title}>My Lists</Text>
        <Text style={styles.listCount}>{lists.length} list{lists.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => handleListPress(item)}
            onLongPress={() => {
              // System lists (like Finished Tasks) cannot be edited or deleted
              if (item.isSystem) {
                Alert.alert(
                  item.name,
                  'This is a system list and cannot be modified.',
                  [{ text: 'OK' }],
                );
                return;
              }
              Alert.alert(
                item.name,
                'Choose an action',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Edit', onPress: () => handleEditList(item) },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDeleteList(item) },
                ],
              );
            }}
          >
            <View style={styles.listContent}>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{item.name}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No lists yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button below to create your first list
            </Text>
          </View>
        }
        contentContainerStyle={lists.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366f1', '#a855f7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add List Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingList ? 'Edit List' : 'Create New List'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="List name"
              value={editingList ? editListName : newListName}
              onChangeText={editingList ? setEditListName : setNewListName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewListName('');
                  setEditingList(null);
                  setEditListName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddList}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingList ? 'Save Changes' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

