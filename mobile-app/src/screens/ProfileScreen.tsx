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
} from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../utils/useThemedStyles';
import { usersService } from '../services/users.service';
import { authService } from '../services/auth.service';
import { isRtlLanguage } from '@tasks-management/frontend-services/i18n';

export default function ProfileScreen() {
  const { user, logout, isLoading, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const isRtl = isRtlLanguage(i18n.language);
  const [uploading, setUploading] = useState(false);

  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      backgroundColor: colors.card,
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 45,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
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
      alignItems: 'center',
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
      alignSelf: isRtl ? 'flex-end' : 'flex-start',
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
      await refreshUser();
      Alert.alert(t('profile.pictureUpdated'), t('profile.pictureUpdatedMessage', { defaultValue: 'Profile picture updated successfully' }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert(
        t('profile.error'),
        error?.message || t('profile.pictureUpdateFailed'),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;

    try {
      await authService.resendVerification(user.email);
      Alert.alert(
        t('profile.verificationEmailSent'),
        t('profile.verificationEmailSentMessage', { defaultValue: 'Verification email sent. Please check your inbox.' }),
      );
    } catch (error: any) {
      Alert.alert(
        t('profile.error'),
        error?.message || t('profile.failedToResendVerification', { defaultValue: 'Failed to resend verification email' }),
      );
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
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
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
                  <Image
                    source={{ uri: user.profilePicture }}
                    style={styles.profilePicture}
                    onError={() => {
                      // Handle image load error
                    }}
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Text style={styles.profilePictureText}>
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                {uploading ? (
                  <View style={styles.profilePictureOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : (
                  <View style={styles.profilePictureOverlay}>
                    <Text style={{ color: '#fff', fontSize: 20 }}>✏️</Text>
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

          {/* Email Verification */}
          <View style={styles.profileSection}>
            <Text style={styles.profileLabel}>{t('profile.emailVerified')}</Text>
            <Text style={styles.profileValue}>
              {user.emailVerified ? t('profile.yes') : t('profile.no')}
            </Text>
            {!user.emailVerified && (
              <TouchableOpacity onPress={handleResendVerification} style={styles.resendButton}>
                <Text style={styles.resendButtonText}>{t('profile.resendVerification')}</Text>
              </TouchableOpacity>
            )}
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
