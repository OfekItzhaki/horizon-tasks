import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';
import { isRtlLanguage } from '@tasks-management/frontend-services/i18n';

export default function Layout() {
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = isRtlLanguage(i18n.language);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors">
      <nav className="bg-white dark:bg-[#1a1a1a] shadow-sm border-b border-gray-200 dark:border-[#2a2a2a] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between h-16 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
              <Link
                to="/lists"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                {t('nav.lists')}
              </Link>
              <Link
                to="/analysis"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                {t('nav.analysis')}
              </Link>
            </div>
            <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
              {/* Theme Toggle */}
              <div className={`flex items-center ${isRtl ? 'space-x-reverse space-x-1' : 'space-x-1'} bg-gray-100 dark:bg-[#1f1f1f] rounded-lg p-1`}>
                <button
                  onClick={() => setThemeMode('light')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    themeMode === 'light'
                      ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t('nav.theme.light')}
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    themeMode === 'dark'
                      ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t('nav.theme.dark')}
                </button>
                <button
                  onClick={() => setThemeMode('auto')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    themeMode === 'auto'
                      ? 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t('nav.theme.auto')}
                </button>
              </div>
              <select
                aria-label={t('nav.language')}
                value={(i18n.resolvedLanguage ?? i18n.language).split('-')[0]}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1f1f1f] px-2 py-1 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {supportedLanguages.map((lng) => (
                  <option key={lng} value={lng}>
                    {t(`languageNames.${lng}`, { defaultValue: String(lng).toUpperCase() })}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-700 dark:text-gray-200">{user?.email}</span>
              <Link
                to="/profile"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                {t('nav.profile')}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
