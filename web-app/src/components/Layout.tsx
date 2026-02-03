import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';
import { useTheme } from '../context/ThemeContext';

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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500">
      {/* Background Aura */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/5 dark:bg-violet-900/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/5 dark:bg-indigo-900/5 rounded-full blur-[100px] animate-pulse-slow"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 glass-card mx-auto max-w-7xl mt-4 rounded-2xl border-white/20 dark:border-white/5 shadow-2xl backdrop-blur-xl">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 flex items-center mr-6">
                <span className="text-xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent transform hover:scale-105 transition-transform duration-300 cursor-default">
                  Horizon Tasks
                </span>
              </div>
              <div className="hidden sm:flex sm:space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`inline-flex items-center px-4 py-2 text-sm font-bold transition-all duration-300 rounded-xl ${
                      location.pathname.startsWith(link.to)
                        ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-lg shadow-violet-500/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1e293b]/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <div className="flex bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl">
                {(['light', 'dark', 'auto'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setThemeMode(mode)}
                    className={`p-1.5 rounded-lg transition-all duration-300 ${
                      themeMode === mode
                        ? 'bg-white dark:bg-[#0f172a] shadow-sm text-violet-600 dark:text-violet-400 scale-110'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
                className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1e293b] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all duration-300"
              >
                {supportedLanguages.map((lng) => (
                  <option key={lng} value={lng}>
                    {t(`languageNames.${lng}`, {
                      defaultValue: String(lng).toUpperCase(),
                    })}
                  </option>
                ))}
              </select>

              {/* Profile/User Section */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-white/5">
                <Link to="/profile" className="flex items-center group">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center border-2 border-transparent group-hover:border-violet-500 transition-all duration-300 shadow-lg shadow-violet-500/20">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-black text-violet-600 dark:text-violet-400">
                        {user?.name?.[0].toUpperCase() ||
                          user?.email[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:ml-2 md:flex flex-col items-start leading-none">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
                      {user?.name || user?.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-violet-500 dark:text-violet-400 mt-1 uppercase tracking-wider font-black">
                      {t('profile.proAccount', { defaultValue: 'Pro Account' })}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors duration-300"
                  title={t('nav.logout')}
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in relative z-10">
        <Outlet />
      </main>

      {/* Credits Footer */}
      <footer className="mt-auto py-8 px-4 border-t border-slate-200/50 dark:border-white/5 bg-transparent backdrop-blur-sm z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Horizon Tasks.{' '}
            {t('footer.allRightsReserved', {
              defaultValue: 'All rights reserved.',
            })}
          </span>
          <span className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-700 hover:text-violet-400 dark:hover:text-violet-500 transition-colors cursor-default select-none">
            Developed by OfekLabs
          </span>
        </div>
      </footer>
    </div>
  );
}
