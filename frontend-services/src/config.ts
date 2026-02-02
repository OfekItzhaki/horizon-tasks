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

const rawConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
};

// Validate config on startup
const validatedConfig = apiConfigSchema.parse(rawConfig);

export const API_CONFIG = validatedConfig;

export const getApiUrl = (path: string): string => {
  const base = API_CONFIG.baseURL.replace(/\/$/, '');

  // Handle absolute paths by stripping the leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Special case: if Path is already an absolute URL, return it
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
