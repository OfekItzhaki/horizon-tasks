import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginDto, ApiError } from '@tasks-management/frontend-services';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth.service';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isNotVerified, setIsNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsNotVerified(false);
    setLoading(true);

    try {
      const credentials: LoginDto = { email, password };
      await login(credentials);
      navigate('/lists');
    } catch (err: unknown) {
      const error = err as ApiError;
      const errorMessage = Array.isArray(error.message)
        ? error.message.join(', ')
        : error.message || t('login.failed');

      if (errorMessage.toLowerCase().includes('not verified')) {
        setIsNotVerified(true);
        setError(t('login.notVerified'));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    try {
      setResending(true);
      await authService.resendVerification(email);
      alert(t('login.verificationResent'));
    } catch (err) {
      console.error('Failed to resend verification:', err);
      alert(t('login.verificationFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500">
      {/* Dynamic Aura Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 dark:bg-violet-900/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/20 dark:bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow"
        style={{ animationDelay: '4s' }}
      ></div>

      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-10 translate-y-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl shadow-2xl shadow-violet-500/20 flex items-center justify-center mb-6 transform hover:rotate-6 hover:scale-105 transition-all duration-500 animate-float">
            <svg
              className="w-10 h-10 text-white drop-shadow-md"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm tracking-tight text-center">
            Horizon Tasks
          </h1>
          <p className="mt-3 text-sm font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 text-center">
            {t('login.title')}
          </p>
        </div>

        <div className="premium-card p-10 animate-slide-up bg-white/60 dark:bg-[#0f172a]/50">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div
                className={`p-4 rounded-2xl flex items-start gap-3 animate-scale-in ${isNotVerified ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}
                role="alert"
              >
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-bold">{error}</p>
                  {isNotVerified && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="mt-2 text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-50"
                    >
                      {resending
                        ? t('common.loading')
                        : t('login.resendVerification')}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div className="group">
                <label
                  htmlFor="email"
                  className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1 transition-colors group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400"
                >
                  {t('login.emailPlaceholder')}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="premium-input pl-11"
                    placeholder="name@example.com"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
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
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label
                  htmlFor="password"
                  className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1 transition-colors group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400"
                >
                  {t('login.passwordPlaceholder')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="premium-input pl-11 pr-12"
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-violet-500 transition-colors">
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
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    {showPassword ? (
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
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-button w-full group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center gap-2">
                  {t('login.signIn')}
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 select-none hover:text-violet-400 dark:hover:text-violet-500 transition-colors cursor-default">
            Developed by OfekLabs
          </p>
        </div>
      </div>
    </div>
  );
}
