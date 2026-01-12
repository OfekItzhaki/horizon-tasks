import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { BUILD_INFO } from '../utils/buildInfo';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  if (!user) {
    return <div className="text-sm text-gray-600">{t('profile.notAuthenticated')}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('profile.title')}</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('profile.email')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>

          {user.name && (
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('profile.name')}</label>
              <p className="mt-1 text-sm text-gray-900">{user.name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.emailVerified')}
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {user.emailVerified ? t('profile.yes') : t('profile.no')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('profile.memberSince')}
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('profile.about')}</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">{t('profile.version')}</span>
            <span className="font-mono text-gray-900">{BUILD_INFO.version}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">{t('profile.credits')}</span>
            <span className="text-gray-900">{t('profile.creditsValue')}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600">{t('profile.sourceCode')}</span>
            <a
              className="text-indigo-600 hover:text-indigo-700 font-medium"
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
