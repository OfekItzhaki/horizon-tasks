import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { BUILD_INFO } from '../utils/buildInfo';
import {
  usersService,
  authService,
  getAssetUrl,
  isRtlLanguage,
} from '@tasks-management/frontend-services';
import Skeleton from '../components/Skeleton';

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);
  const [uploading, setUploading] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const updatedUser = await usersService.uploadAvatar(user.id, file);
      setUser(updatedUser);
      // No need to call refreshUser anymore as we updated state locally
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };
  const handleResendVerification = async () => {
    if (!user?.email) return;
    try {
      setResendingVerify(true);
      await authService.resendVerification(user.email);
      alert(t('login.verificationResent'));
    } catch (err) {
      console.error('Failed to resend verification:', err);
      alert(t('login.verificationFailed'));
    } finally {
      setResendingVerify(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 mb-8 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl border border-border-subtle" />
        <Skeleton className="h-48 w-full rounded-2xl border border-border-subtle" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="p-4 rounded-full bg-accent-danger/10 text-accent-danger mb-4">
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
        <p className="text-xl font-bold text-primary">
          {t('profile.notAuthenticated')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <Link
          to="/lists"
          className={`inline-flex items-center gap-2 text-accent hover:text-accent/80 font-semibold text-sm transition-all mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <span className={isRtl ? 'rotate-180' : ''}>←</span>
          {t('tasks.backToLists')}
        </Link>
        <h1 className="text-4xl font-bold text-primary tracking-tight">
          {t('profile.title')}
        </h1>
        <p className="mt-2 text-secondary">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div
          className="md:col-span-1 space-y-6 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="premium-card p-8 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-accent/10 border-2 border-accent/20 shadow-lg relative transition-all duration-300 group-hover:scale-105 group-hover:border-accent">
                {user.profilePicture ? (
                  <img
                    key={user.profilePicture}
                    src={getAssetUrl(user.profilePicture)}
                    alt={user.name || ''}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-accent uppercase">
                    {user.name?.[0] || user.email[0]}
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-surface/90 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 p-3 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
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

            <h2 className="mt-6 text-xl font-bold text-primary truncate w-full px-2">
              {user.name || user.email.split('@')[0]}
            </h2>
            <p className="text-sm text-secondary truncate w-full px-2">
              {user.email}
            </p>

            {/* Verified Badge */}
            <div className="mt-6 w-full pt-6 border-t border-border-subtle flex flex-col gap-2 items-center">
              <span
                className="inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-accent/10 text-accent cursor-help"
                title="Pro features coming soon"
              >
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
            <h3 className="text-2xl font-bold text-primary mb-6">
              {t('profile.title')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                  {t('profile.email')}
                </label>
                <p className="text-primary font-medium">{user.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                  {t('profile.name')}
                </label>
                <p className="text-primary font-medium">{user.name || '—'}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                  {t('profile.emailVerified')}
                </label>
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-accent-success' : 'bg-accent-warning animate-pulse'}`}
                    ></span>
                    <p className="text-primary font-medium">
                      {user.emailVerified ? t('profile.yes') : t('profile.no')}
                    </p>
                  </div>
                  {!user.emailVerified && (
                    <button
                      onClick={handleResendVerification}
                      disabled={resendingVerify}
                      className="text-xs font-semibold text-accent hover:underline uppercase tracking-wide disabled:opacity-50"
                    >
                      {resendingVerify
                        ? t('common.loading')
                        : t('login.resendVerification')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                  {t('profile.memberSince')}
                </label>
                <p className="text-primary font-medium">
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
            <h3 className="text-2xl font-bold text-primary mb-6">
              {t('profile.about')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-secondary font-medium">
                  {t('profile.version')}
                </span>
                <span className="px-3 py-1 bg-hover border border-border-subtle rounded-lg font-mono text-sm text-primary font-semibold">
                  {BUILD_INFO.version}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-secondary font-medium">
                  {t('profile.credits')}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-primary font-bold">
                    {t('profile.creditsValue')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-secondary font-medium">
                  {t('profile.sourceCode')}
                </span>
                <a
                  href="https://github.com/OfekItzhaki/TasksManagement"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-xl text-xs font-bold uppercase tracking-wide hover:scale-105 active:scale-95 transition-all duration-200 shadow-md"
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
