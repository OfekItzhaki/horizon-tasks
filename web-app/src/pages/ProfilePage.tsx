import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { BUILD_INFO } from '../utils/buildInfo';
import { usersService } from '@tasks-management/frontend-services';
import Skeleton from '../components/Skeleton';

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      await usersService.uploadAvatar(user.id, file);
      await refreshUser();
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-64 w-full premium-card" />
        <Skeleton className="h-48 w-full premium-card" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/10 text-red-500 mb-4">
          <svg
            className="w-12 h-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h11l4 4V15z"
            />
          </svg>
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {t('profile.notAuthenticated')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h1 className="premium-header-main animate-slide-up">
        {t('profile.title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div
          className="md:col-span-1 space-y-6 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="premium-card p-8 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-primary-100 dark:bg-primary-900/20 border-4 border-white dark:border-[#1a1a1a] shadow-2xl relative transition-transform duration-500 group-hover:scale-105">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-primary-600 dark:text-primary-400 uppercase">
                    {user.name?.[0] || user.email[0]}
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-xl transition-all duration-200 group-hover:scale-110 active:scale-95 disabled:opacity-50"
                title={t('profile.profilePicture')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <h2 className="mt-6 text-xl font-bold text-gray-900 dark:text-white truncate w-full px-2">
              {user.name || user.email.split('@')[0]}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full px-2">
              {user.email}
            </p>

            <div className="mt-6 w-full pt-6 border-t border-gray-100 dark:border-[#2a2a2a]">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400">
                {t('profile.proAccount', { defaultValue: 'Pro Account' })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info & System Info */}
        <div
          className="md:col-span-2 space-y-8 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          {/* Account Details */}
          <div className="premium-card p-8">
            <h3 className="premium-header-section">{t('profile.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('profile.email')}
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {user.email}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('profile.name')}
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {user.name || '—'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('profile.emailVerified')}
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}
                  ></span>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user.emailVerified ? t('profile.yes') : t('profile.no')}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('profile.memberSince')}
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* System & Credits */}
          <div className="premium-card p-8">
            <h3 className="premium-header-section">{t('profile.about')}</h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {t('profile.version')}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg font-mono text-sm text-gray-900 dark:text-white font-bold">
                  {BUILD_INFO.version}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {t('profile.credits')}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-gray-900 dark:text-white font-bold">
                    {t('profile.creditsValue')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {t('profile.sourceCode')}
                </span>
                <a
                  href="https://github.com/OfekItzhaki/TasksManagement"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white dark:text-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-gray-400/20 dark:shadow-none"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t('profile.openRepo')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
