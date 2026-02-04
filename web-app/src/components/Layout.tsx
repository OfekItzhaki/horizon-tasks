import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { getAssetUrl } from '@tasks-management/frontend-services';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const navLinks = [
    { to: '/lists', label: t('nav.lists') },
    {
      to: '/analytics',
      label: t('nav.analytics', { defaultValue: 'Analytics' }),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-app font-inter">
      {/* Navigation Bar - Solid, Clean */}
      <nav className="sticky top-0 z-50 bg-surface border-b border-border-subtle shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Links */}
            <div className="flex items-center gap-8">
              <Link to="/lists" className="flex items-center gap-2 group">
                <span className="text-xl font-bold text-primary tracking-tight group-hover:text-accent transition-colors">
                  Horizon Tasks
                </span>
              </Link>

              <div className="hidden sm:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      location.pathname.startsWith(link.to)
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-hover'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <div className="flex bg-hover rounded-lg p-1 border border-border-subtle">
                {(['light', 'dark', 'auto'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setThemeMode(mode)}
                    className={`p-1.5 rounded-md transition-all ${
                      themeMode === mode
                        ? 'bg-surface text-accent shadow-sm'
                        : 'text-tertiary hover:text-secondary'
                    }`}
                    title={t(`theme.${mode}`, {
                      defaultValue:
                        mode.charAt(0).toUpperCase() + mode.slice(1),
                    })}
                  >
                    {mode === 'light' && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                        />
                      </svg>
                    )}
                    {mode === 'dark' && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    )}
                    {mode === 'auto' && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Language Selector */}
              <select
                aria-label={t('nav.language')}
                value={(i18n.resolvedLanguage ?? i18n.language).split('-')[0]}
                onChange={(e) => void i18n.changeLanguage(e.target.value)}
                className="px-3 py-1.5 text-sm font-medium text-secondary bg-hover border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer transition-all"
              >
                {supportedLanguages.map((lng) => (
                  <option key={lng} value={lng}>
                    {t(`languageNames.${lng}`, {
                      defaultValue: String(lng).toUpperCase(),
                    })}
                  </option>
                ))}
              </select>

              {/* Profile */}
              <div className="flex items-center gap-3 pl-3 border-l border-border-subtle">
                <Link to="/profile" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-accent/10 border-2 border-accent/20 group-hover:border-accent transition-all flex items-center justify-center overflow-hidden">
                    {user?.profilePicture ? (
                      <img
                        key={user.profilePicture}
                        src={getAssetUrl(user.profilePicture)}
                        alt={user.name || user.email}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {!user?.profilePicture && (
                      <span className="text-xs font-bold text-accent">
                        {user?.name?.[0]?.toUpperCase() ||
                          user?.email[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="hidden md:flex flex-col leading-none">
                    <span className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                      {user?.name || user?.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-tertiary mt-0.5">Pro</span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-tertiary hover:text-accent-danger hover:bg-accent-danger/10 transition-all"
                  title={t('nav.logout')}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full animate-fade-in">
        <Outlet />
      </main>

      <footer className="mt-auto py-6 px-6 border-t border-border-subtle bg-surface">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm">
          <span className="text-tertiary">
            &copy; {new Date().getFullYear()} Horizon Tasks.{' '}
            {t('footer.allRightsReserved')}
          </span>
          <span className="text-tertiary">
            Developed by{' '}
            <span className="text-accent font-medium">OfekLabs</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
