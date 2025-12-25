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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { listsService } from '../services/lists.service';
import { ToDoList, ListType, CreateTodoListDto } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ListsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [lists, setLists] = useState<ToDoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedListType, setSelectedListType] = useState<ListType>(ListType.CUSTOM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingList, setEditingList] = useState<ToDoList | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editListType, setEditListType] = useState<ListType>(ListType.CUSTOM);

  useEffect(() => {
    loadLists();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadLists();
    }, [])
  );

  const loadLists = async () => {
    try {
      console.log('Loading lists...');
      const data = await listsService.getAll();
      console.log('Lists loaded:', data);
      console.log('Lists count:', data?.length ?? 'undefined');
      setLists(data || []);
    } catch (error: any) {
      console.error('Error loading lists:', error);
      // Silently ignore auth errors - the navigation will handle redirect to login
      const isAuthError = error?.response?.status === 401 || 
                          error?.message?.toLowerCase()?.includes('unauthorized');
      if (!isAuthError) {
        const errorMessage = error?.response?.data?.message || error?.message || 'Unable to load lists. Please try again.';
        Alert.alert('Error Loading Lists', errorMessage);
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
    setEditListType(list.type);
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
        type: editListType,
      });
      setEditingList(null);
      setEditListName('');
      setEditListType(ListType.CUSTOM);
      setShowAddModal(false);
      loadLists();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update list');
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
        type: selectedListType,
      };

      await listsService.create(listData);
      setNewListName('');
      setSelectedListType(ListType.CUSTOM);
      setShowAddModal(false);
      loadLists();
      // Success feedback - UI update is visible, no alert needed
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to create list. Please try again.';
      Alert.alert('Create List Failed', errorMessage);
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
              const errorMessage = error?.response?.data?.message || error?.message || 'Unable to delete list. Please try again.';
              Alert.alert('Delete Failed', errorMessage);
            }
          },
        },
      ],
    );
  };

  const getListTypeColor = (type: ListType) => {
    switch (type) {
      case ListType.DAILY:
        return '#4CAF50';
      case ListType.WEEKLY:
        return '#2196F3';
      case ListType.MONTHLY:
        return '#FF9800';
      case ListType.YEARLY:
        return '#9C27B0';
      case ListType.FINISHED:
        return '#607D8B'; // Gray-blue for finished tasks
      default:
        return '#757575';
    }
  };

  const listTypes = [
    ListType.DAILY,
    ListType.WEEKLY,
    ListType.MONTHLY,
    ListType.YEARLY,
    ListType.CUSTOM,
  ];

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
        <Text style={styles.title}>My Lists</Text>
        <Text style={styles.listCount}>{lists.length} list{lists.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id.toString()}
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
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: getListTypeColor(item.type) },
                  ]}
                >
                  <Text style={styles.typeText}>{item.type}</Text>
                </View>
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
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
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

            <Text style={styles.typeLabel}>List Type:</Text>
            <View style={styles.typeSelector}>
              {listTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    (editingList ? editListType : selectedListType) === type && {
                      backgroundColor: getListTypeColor(type),
                    },
                  ]}
                  onPress={() => editingList ? setEditListType(type) : setSelectedListType(type)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      (editingList ? editListType : selectedListType) === type && styles.typeOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewListName('');
                  setSelectedListType(ListType.CUSTOM);
                  setEditingList(null);
                  setEditListName('');
                  setEditListType(ListType.CUSTOM);
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
    paddingTop: Platform.OS === 'ios' ? 60 : 45, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  listCount: {
    fontSize: 14,
    color: '#666',
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
    color: '#333',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
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
    bottom: 70, // Above the tab bar
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
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
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
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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





