import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { BUILD_INFO } from '../utils/buildInfo';
import { isRtlLanguage } from '@tasks-management/frontend-services/i18n';
import { usersService } from '@tasks-management/frontend-services';
import { authService } from '../services/auth.service';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();


  const updateProfilePictureMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!user) throw new Error('User not found');
      return usersService.uploadAvatar(user.id, file);
    },
    onSuccess: async (updatedUser) => {
      toast.success(t('profile.pictureUpdated'));
      setSelectedFile(null);
      setFilePreview(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Update user in context without page reload
      updateUser(updatedUser);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('profile.pictureUpdateFailed'));
    },
  });

  if (loading) {
    return <div className="text-gray-900 dark:text-white">{t('common.loading')}</div>;
  }

  if (!user) {
    return <div className="text-sm text-gray-600 dark:text-gray-400">{t('profile.notAuthenticated')}</div>;
  }



  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please select an image file (JPEG, PNG, GIF, or WebP).');
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }

      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Auto-save after file selection
      updateProfilePictureMutation.mutate({ file });
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('profile.title')}</h1>

      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('profile.profilePicture')}
            </label>
            <div className="relative inline-block">
              <div
                className="relative cursor-pointer group"
                onMouseEnter={() => setIsHoveringImage(true)}
                onMouseLeave={() => setIsHoveringImage(false)}
                onClick={handleImageClick}
              >
                {(filePreview || user.profilePicture) ? (
                  <img
                    src={filePreview || user.profilePicture || undefined}
                    alt={t('profile.profilePicture')}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-[#2a2a2a] transition-opacity group-hover:opacity-75"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-[#2a2a2a] flex items-center justify-center border-2 border-gray-300 dark:border-[#2a2a2a] transition-opacity group-hover:opacity-75">
                    <span className="text-2xl text-gray-400 dark:text-gray-500">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Edit overlay on hover */}
                {isHoveringImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.email')}</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</p>
          </div>

          {user.name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.name')}</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.emailVerified')}
            </label>
            <div className={`mt-1 flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 flex-wrap`} dir={isRtl ? 'rtl' : 'ltr'}>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {user.emailVerified ? t('profile.yes') : t('profile.no')}
              </span>
              {!user.emailVerified && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authService.resendVerification(user.email);
                      toast.success(t('profile.verificationEmailSent'));
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : t('profile.verificationEmailSent'));
                    }
                  }}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  {t('profile.resendVerification')}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.memberSince')}
            </label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
              {(() => {
                const date = new Date(user.createdAt);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return isRtl ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
              })()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.about')}</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">{t('profile.version')}</span>
            <span className="font-mono text-gray-900 dark:text-white">{BUILD_INFO.version}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">{t('profile.credits')}</span>
            <span className="text-gray-900 dark:text-white">{t('profile.creditsValue')}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">{t('profile.sourceCode')}</span>
            <a
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              href="https://github.com/OfekItzhaki/TasksManagement"
              target="_blank"
              rel="noreferrer"
            >
              {t('profile.openRepo')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
