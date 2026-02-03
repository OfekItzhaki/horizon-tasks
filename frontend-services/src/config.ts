// Get API base URL - works in both Node.js and browser environments
const getApiBaseUrl = (): string => {
  let url = 'http://localhost:3000';

  if (typeof process !== 'undefined' && process.env) {
    const env = process.env;
    if (env.EXPO_PUBLIC_API_URL) url = env.EXPO_PUBLIC_API_URL;
    else if (env.API_BASE_URL) url = env.API_BASE_URL;
    else if ((env as any).VITE_API_URL) url = (env as any).VITE_API_URL;
  }

  // Ensure /api/v1 prefix is present if it's a prod/render/custom URL
  // Backend API always requires it, and many users forget to add it to env vars
  const isProdUrl = url.includes('onrender.com') || url.includes('ofeklabs.dev');
  if (isProdUrl && !url.includes('/api/v1')) {
    return `${url.replace(/\/$/, '')}/api/v1`;
  }

  return url;
};

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
};

export const getApiUrl = (path: string): string => {
  const base = API_CONFIG.baseURL.replace(/\/$/, '');

  // Handle absolute paths by stripping the leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Special case: if path is already an absolute URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${base}${cleanPath}`;
};

/**
 * Helper to get the root URL (without /api/v1) for static assets like uploads
 */
export const getAssetUrl = (path: string): string => {
  const root = API_CONFIG.baseURL.split('/api/v1')[0];
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${root}${cleanPath}`;
};
