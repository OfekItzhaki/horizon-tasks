import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../utils/useThemedStyles';
import { usersService } from '../services/users.service';
import { authService } from '../services/auth.service';
import { isRtlLanguage, NotificationFrequency } from '@tasks-management/frontend-services';
import { handleApiError, isAuthError } from '../utils/errorHandler';
import { getApiUrl, getAssetUrl } from '../config/api';
import { SmartImage } from '../components/common/SmartImage';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, isLoading, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const isRtl = isRtlLanguage(i18n.language);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imageError, setImageError] = useState(false);

  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    header: {
      backgroundColor: colors.card,
      padding: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 45,
      paddingBottom: 24,
      marginBottom: 0,
      borderBottomWidth: 0,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      position: 'relative',
      overflow: 'hidden',
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 0,
    },
    backButton: {
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
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
      letterSpacing: -1,
      textShadowColor: 'rgba(99, 102, 241, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      textAlign: 'center',
      marginBottom: 0,
      flex: 1,
    },
    content: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    profileCard: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
      marginHorizontal: 0,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    profileSection: {
      marginBottom: 20,
    },
    profileLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    profileValue: {
      fontSize: 14,
      color: colors.text,
    },
    profilePictureContainer: {
      alignItems: isRtl ? 'flex-end' : 'flex-start',
      marginBottom: 20,
    },
    profilePictureWrapper: {
      position: 'relative',
    },
    profilePicture: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: colors.border,
    },
    profilePicturePlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    profilePictureText: {
      color: colors.textSecondary,
      fontSize: 32,
      fontWeight: 'bold',
    },
    profilePictureOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 40,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    profilePictureEditIcon: {
      width: 24,
      height: 24,
      tintColor: '#fff',
    },
    resendButton: {
      marginTop: 8,
    },
    resendButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    aboutCard: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
      marginHorizontal: 0,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    aboutTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    aboutLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    aboutValue: {
      fontSize: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: colors.text,
      fontWeight: '500',
    },
    aboutLink: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    themeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    themeLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    themeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 2,
    },
    themeOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    themeOptionActive: {
      backgroundColor: colors.primary,
    },
    themeOptionText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    themeOptionTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    logoutButton: {
      backgroundColor: colors.error,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
      marginHorizontal: 0,
    },
    logoutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  }));

  const handleLogout = async () => {
    Alert.alert(t('nav.logout'), t('profile.logoutConfirm', { defaultValue: 'Are you sure you want to logout?' }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('nav.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleProfilePicturePress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('profile.permissionDenied', { defaultValue: 'Permission Denied' }),
          t('profile.cameraPermissionRequired', { defaultValue: 'Camera permission is required to upload a profile picture.' }),
        );
        return;
      }

      // Show action sheet
      Alert.alert(
        t('profile.changePicture'),
        t('profile.selectImageSource', { defaultValue: 'Select image source' }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('profile.takePhoto', { defaultValue: 'Take Photo' }),
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0].uri, result.assets[0].fileName || 'photo.jpg', result.assets[0].type || 'image/jpeg');
              }
            },
          },
          {
            text: t('profile.chooseFromLibrary', { defaultValue: 'Choose from Library' }),
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0].uri, result.assets[0].fileName || 'photo.jpg', result.assets[0].type || 'image/jpeg');
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('profile.error', { defaultValue: 'Error' }), t('profile.failedToPickImage', { defaultValue: 'Failed to pick image' }));
    }
  };

  const uploadImage = async (uri: string, fileName: string, fileType: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileType)) {
        Alert.alert(t('profile.error'), t('profile.invalidFileType', { defaultValue: 'Invalid file type. Please select an image file.' }));
        return;
      }

      const updatedUser = await usersService.uploadAvatar(user.id, uri, fileName, fileType);
      setImageError(false); // Reset error state when new image is uploaded
      await refreshUser();
      Alert.alert(t('profile.pictureUpdated'), t('profile.pictureUpdatedMessage', { defaultValue: 'Profile picture updated successfully' }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      handleApiError(error, t('profile.pictureUpdateFailed', { defaultValue: 'Failed to update profile picture. Please try again.' }));
    } finally {
      setUploading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;

    try {
      await authService.resendVerification(user.email);
      Alert.alert(
        'Success',
        'Verification code sent. Please check your inbox.',
      );
    } catch (error: any) {
      handleApiError(error, t('profile.failedToResendVerification', { defaultValue: 'Failed to resend verification email. Please try again.' }));
    }
  };

  const handleFrequencyChange = async (frequency: NotificationFrequency) => {
    if (!user) return;
    try {
      setRefreshing(true);
      await usersService.update(user.id, { notificationFrequency: frequency });
      await refreshUser();
    } catch (error) {
      handleApiError(error, 'Failed to update notification frequency');
    } finally {
      setRefreshing(false);
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const handleOpenRepo = () => {
    Linking.openURL('https://github.com/OfekItzhaki/TasksManagement').catch(() => {
      Alert.alert(t('profile.error'), t('profile.failedToOpenRepo', { defaultValue: 'Could not open repository' }));
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return isRtl ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error: any) {
      console.error('Error refreshing user:', error);
      // Silently ignore auth errors - the navigation will handle redirect to login
      try {
        if (!isAuthError(error)) {
          handleApiError(error, 'Unable to refresh user data. Please try again.');
        }
      } catch (handlerError) {
        // If error handler itself fails, show a generic message
        console.error('Error in error handler:', handlerError);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>{t('profile.notAuthenticated')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            <Text style={styles.title}>{t('profile.title')}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={styles.profileCard}>
          {/* Profile Picture */}
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>{t('profile.profilePicture')}</Text>
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={handleProfilePicturePress}
              disabled={uploading}
            >
              <View style={styles.profilePictureWrapper}>
                {user.profilePicture ? (
                  <SmartImage
                    key={`${user.id}-${user.profilePicture}-${user.updatedAt}`}
                    source={{
                      uri: (() => {
                        let url = user.profilePicture || '';

                        // If it's a relative path
                        if (url.startsWith('/uploads')) {
                          url = getAssetUrl(url);
                        }
                        // If it's an absolute URL but contains localhost (legacy data fix)
                        else if (url.includes('localhost') || url.includes('127.0.0.1')) {
                          const parts = url.split('/uploads/');
                          if (parts.length > 1) {
                            url = getAssetUrl(`/uploads/${parts[1]}`);
                          }
                        }

                        return `${url}${url.includes('?') ? '&' : '?'}v=${user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now()}`;
                      })()
                    }}
                    style={styles.profilePicture}
                    onError={(e) => {
                      console.log('Image load error:', e.nativeEvent.error);
                      setImageError(true);
                    }}
                    onLoad={() => {
                      setImageError(false);
                    }}
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Text style={styles.profilePictureText}>
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.profilePictureOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>{t('profile.email')}</Text>
            <Text style={styles.profileValue}>{user.email}</Text>
          </View>

          {/* Name */}
          {user.name && (
            <View style={styles.profileSection}>
              <Text style={styles.profileLabel}>{t('profile.name')}</Text>
              <Text style={styles.profileValue}>{user.name}</Text>
            </View>
          )}

          {/* Notification Frequency */}
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>Task Updates Frequency</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {([NotificationFrequency.NONE, NotificationFrequency.DAILY, NotificationFrequency.WEEKLY]).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  onPress={() => handleFrequencyChange(freq)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: user.notificationFrequency === freq ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: user.notificationFrequency === freq ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{
                    color: user.notificationFrequency === freq ? '#fff' : colors.text,
                    fontWeight: 'bold',
                    fontSize: 12,
                  }}>
                    {freq.charAt(0) + freq.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.profileValue, { fontSize: 12, marginTop: 8, color: colors.textSecondary }]}>
              Choose how often you want to receive email updates about your tasks.
            </Text>
          </View>

          {/* Member Since */}
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>{t('profile.memberSince')}</Text>
            <Text style={[styles.profileValue, { writingDirection: isRtl ? 'rtl' : 'ltr' }]}>
              {formatDate(user.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>{t('profile.about')}</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('profile.version')}</Text>
            <Text style={styles.aboutValue}>{appVersion}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('profile.credits')}</Text>
            <Text style={styles.aboutValue}>{t('profile.creditsValue')}</Text>
          </View>
          <TouchableOpacity style={styles.aboutRow} onPress={handleOpenRepo}>
            <Text style={styles.aboutLabel}>{t('profile.sourceCode')}</Text>
            <Text style={styles.aboutLink}>{t('profile.openRepo')}</Text>
          </TouchableOpacity>

          {/* Theme Toggle */}
          <View style={styles.themeRow}>
            <Text style={styles.themeLabel}>{t('profile.theme')}</Text>
            <View style={styles.themeToggle}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'light' && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode('light')}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'light' && styles.themeOptionTextActive,
                  ]}
                >
                  {t('nav.theme.light')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'dark' && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode('dark')}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'dark' && styles.themeOptionTextActive,
                  ]}
                >
                  {t('nav.theme.dark')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  themeMode === 'auto' && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode('auto')}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'auto' && styles.themeOptionTextActive,
                  ]}
                >
                  {t('nav.theme.auto')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('nav.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
