/**
 * API Configuration
 * 
 * Production: Set EXPO_PUBLIC_API_URL environment variable to your Render backend URL
 * Development: Uses local IP or localhost
 * 
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable (for production builds)
 * 2. Fallback to development URL (localhost or local IP)
 */
import { ENV } from './env';

export const API_CONFIG = {
  // Set EXPO_PUBLIC_API_URL in .env. Never use localhost for physical device / Android emulator.
  baseURL: ENV.EXPO_PUBLIC_API_URL || (__DEV__
    ? 'http://192.168.68.54:3000/api/v1'  // Dev fallback: use your machine's IP (ipconfig / ifconfig)
    : 'https://tasksmanagement-lv54.onrender.com/api/v1'),
};

/**
 * Get the full API URL for an endpoint
 * Automatically adds /api/v1 if not present in the baseURL
 */
export const getApiUrl = (endpoint: string): string => {
  let base = API_CONFIG.baseURL.replace(/\/$/, ''); // Remove trailing slash

  // Ensure architecture matches backend (with api/v1 prefix)
  if (!base.includes('/api/v1')) {
    base = `${base}/api/v1`;
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

// Log the API URL in development (helps with debugging)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('API Base URL:', API_CONFIG.baseURL);
}

/**
 * Helper for assets that are outside /api/v1 (like /uploads)
 */
export const getAssetUrl = (path: string): string => {
  let root = API_CONFIG.baseURL.replace(/\/$/, '');

  // If base contains /api/v1, strip it to get the root
  if (root.includes('/api/v1')) {
    root = root.split('/api/v1')[0];
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${root}${cleanPath}`;
};
