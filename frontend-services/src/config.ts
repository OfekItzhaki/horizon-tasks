// Get API base URL - works in both Node.js and browser environments
const getApiBaseUrl = (): string => {
  let url = 'http://localhost:3000';

  if (typeof process !== 'undefined') {
    // 1. Direct access for Vite's static replacement (define in vite.config.ts)
    // We use bracket notation to handle Hermes/Expo without crashing, 
    // but Vite needs clear strings to replace.
    const pEnv = process.env as any;
    const vUrl = pEnv['VITE_API_URL'];
    const aUrl = pEnv['API_BASE_URL'];
    const eUrl = pEnv['EXPO_PUBLIC_API_URL'];

    if (vUrl) url = vUrl;
    else if (aUrl) url = aUrl;
    else if (eUrl) url = eUrl;
    // 2. Fallback for Node/Jest where process.env is a real object
    else {
      if (pEnv['VITE_API_URL']) url = pEnv['VITE_API_URL'];
      else if (pEnv['API_BASE_URL']) url = pEnv['API_BASE_URL'];
      else if (pEnv['EXPO_PUBLIC_API_URL']) url = pEnv['EXPO_PUBLIC_API_URL'];
    }
  }

  // Final Safety Check: If we are on a production domain but still have localhost URL
  if (typeof window !== 'undefined' && window.location) {
    const isProdDomain = window.location.hostname.includes('ofeklabs.dev') || window.location.hostname.includes('onrender.com');
    if (isProdDomain && url.includes('localhost')) {
      // Force correct production API even if environment variables failed to bake in
      url = 'https://tasks-api.ofeklabs.dev';
    }
  }

  // Ensure /api/v1 prefix is present for ALL environments, including localhost
  if (!url.includes('/api/v1')) {
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
