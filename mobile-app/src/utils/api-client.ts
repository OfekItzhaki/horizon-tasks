import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiUrl } from '../config/api';
import { TokenStorage, UserStorage } from './storage';
import { normalizeBooleans } from './normalize';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create and configure axios instance
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getApiUrl(''),
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
  });

  // Request interceptor: Add auth token
  client.interceptors.request.use(
    async (config) => {
      const token = await TokenStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - let axios set it with boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor: Normalize data and handle errors
  client.interceptors.response.use(
    (response) => {
      // Normalize boolean values in response data
      if (response.data) {
        response.data = normalizeBooleans(response.data);
      }
      return response;
    },
    async (error: AxiosError) => {
      if (error.response) {
        const statusCode = error.response.status;
        const serverMessage = (error.response.data as any)?.message;
        
        // Handle 401 Unauthorized - clear auth and redirect to login
        if (statusCode === 401) {
          // Clear token and user storage
          await TokenStorage.removeToken();
          await UserStorage.removeUser();
          // The AuthContext will detect the user is null and redirect to login
          if (__DEV__) {
            console.log('Unauthorized - cleared token and user storage');
          }
        }
        
        // Provide user-friendly messages for common HTTP errors
        let message: string;
        switch (statusCode) {
          case 400:
            message = serverMessage || 'Invalid request. Please check your input.';
            break;
          case 401:
            message = serverMessage || 'Session expired. Please log in again.';
            break;
          case 403:
            message = 'You do not have permission to perform this action.';
            break;
          case 404:
            message = serverMessage || 'The requested resource was not found.';
            break;
          case 409:
            message = serverMessage || 'This resource already exists.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          case 502:
          case 503:
          case 504:
            message = 'Server is temporarily unavailable. Please try again later.';
            break;
          default:
            message = serverMessage || error.message || 'An error occurred';
        }
        throw new ApiError(statusCode, message, error.response.data);
      } else if (error.request) {
        // Check if it's a timeout error
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new ApiError(
            0,
            'Request is taking too long. The server may be slow or unavailable. Please try again later.',
          );
        }
        // Network error - server not reachable
        throw new ApiError(
          0, 
          'Unable to connect to server. Please check your internet connection and try again later.',
        );
      } else {
        throw new ApiError(0, 'Something went wrong. Please try again later.');
      }
    },
  );

  return client;
};

export const apiClient = createApiClient();
