// Get API base URL - works in both Node.js and browser environments
const getApiBaseUrl = (): string => {
  // Node.js environment
  if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  // Browser environment - use default (can be overridden via Vite env vars in web-app)
  return 'http://localhost:3000';
};

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
};

export const getApiUrl = (path: string): string => {
  const base = API_CONFIG.baseURL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};


