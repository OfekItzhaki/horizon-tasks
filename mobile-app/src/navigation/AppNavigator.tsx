import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ... screens imports ...

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'tasks-management://'],
  config: {
    screens: {
      Main: {
        screens: {
          Lists: 'lists',
          Analysis: 'analysis',
          Profile: 'profile',
        },
      },
      Tasks: 'tasks/:listId',
      TaskDetails: 'task-details/:taskId',
    },
  },
};

// Screens
import LoginScreen from '../screens/LoginScreen';
import ListsScreen from '../screens/ListsScreen';
import TasksScreen from '../screens/TasksScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnalysisScreen from '../screens/AnalysisScreen';

import { ListType } from '../types';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Tasks: { listId: number; listName: string; listType: ListType };
  TaskDetails: { taskId: number };
};

export type MainTabParamList = {
  Lists: undefined;
  Analysis: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 8 : 0),
          paddingTop: 12,
          height: 70 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 8 : 0)),
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 15,
          fontWeight: '700',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Lists"
        component={ListsScreen}
        options={{
          title: 'My Lists',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{
          title: 'Analysis',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Tasks"
              component={TasksScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TaskDetails"
              component={TaskDetailsScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
