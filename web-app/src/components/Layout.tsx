import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link
                to="/lists"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('nav.lists')}
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <select
                aria-label={t('nav.language')}
                value={(i18n.resolvedLanguage ?? i18n.language).split('-')[0]}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {supportedLanguages.map((lng) => (
                  <option key={lng} value={lng}>
                    {t(`languageNames.${lng}`, { defaultValue: String(lng).toUpperCase() })}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <Link
                to="/profile"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {t('nav.profile')}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
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
