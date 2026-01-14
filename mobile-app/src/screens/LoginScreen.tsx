import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useThemedStyles } from '../utils/useThemedStyles';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 40,
      textAlign: 'center',
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 15,
      marginBottom: 15,
      fontSize: 16,
      backgroundColor: colors.card,
      color: colors.text,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginBottom: 15,
      backgroundColor: colors.card,
    },
    passwordInput: {
      flex: 1,
      padding: 15,
      fontSize: 16,
      color: colors.text,
    },
    eyeButton: {
      padding: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eyeIcon: {
      fontSize: 20,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    switchButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    switchText: {
      color: colors.primary,
      fontSize: 14,
    },
  }));

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Navigation will be handled by AppNavigator via AuthContext
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid credentials';
      // Check for timeout or slow connection
      const isTimeout = errorMessage.toLowerCase().includes('too long') || 
                       errorMessage.toLowerCase().includes('timeout') ||
                       error?.code === 'ECONNABORTED';
      const isNetworkError = error.statusCode === 0 || 
                            errorMessage.toLowerCase().includes('connect') ||
                            isTimeout;
      
      let finalMessage = errorMessage;
      if (isTimeout) {
        finalMessage = 'Login is taking too long. Please try again later.';
      } else if (isNetworkError && !isTimeout) {
        finalMessage = errorMessage + ' Please try again later.';
      }
      
      Alert.alert(
        isNetworkError ? 'Connection Error' : 'Login Failed',
        finalMessage,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      Alert.alert('Success', 'Account created! Please log in.');
      setIsLogin(true);
      setPassword('');
    } catch (error: any) {
      const errorMessage = error.message || 'Could not create account';
      // Check for timeout or slow connection
      const isTimeout = errorMessage.toLowerCase().includes('too long') || 
                       errorMessage.toLowerCase().includes('timeout') ||
                       error?.code === 'ECONNABORTED';
      const isNetworkError = error.statusCode === 0 || 
                            errorMessage.toLowerCase().includes('connect') ||
                            isTimeout;
      
      let finalMessage = errorMessage;
      if (isTimeout) {
        finalMessage = 'Registration is taking too long. Please try again later.';
      } else if (isNetworkError && !isTimeout) {
        finalMessage = errorMessage + ' Please try again later.';
      }
      
      Alert.alert(
        isNetworkError ? 'Connection Error' : 'Registration Failed',
        finalMessage,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isLogin ? 'Tasks Management' : 'Create Account'}
      </Text>

      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={styles.button.backgroundColor as string} />
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={isLogin ? handleLogin : handleRegister}
        >
          <Text style={styles.buttonText}>
            {isLogin ? 'Login' : 'Register'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => setIsLogin(!isLogin)}
      >
        <Text style={styles.switchText}>
          {isLogin
            ? "Don't have an account? Register"
            : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
