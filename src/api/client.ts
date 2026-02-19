import axios from 'axios';

// Runtime config from window.APP_CONFIG (set by docker-entrypoint.sh)
// Falls back to import.meta.env for local development, then to default
declare global {
  interface Window {
    APP_CONFIG?: {
      API_URL?: string;
      WS_URL?: string;
      BASE_PATH?: string;
    };
  }
}

export const API_URL =
  window.APP_CONFIG?.API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Flag to prevent interceptor from running during logout
let isLoggingOut = false;

export const setLoggingOut = (value: boolean) => {
  isLoggingOut = value;
};

const redirectToLogin = () => {
  // Clear all auth-related storage
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage'); // Clear zustand persisted auth state

  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no config or error is not 401 or request already retried, reject
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're logging out, don't try to refresh - just reject
    if (isLoggingOut) {
      return Promise.reject(error);
    }

    // If this is the logout request failing, don't try to refresh
    if (originalRequest.url?.includes('/auth/logout')) {
      return Promise.reject(error);
    }

    // If this is the refresh token request itself failing, redirect to login
    if (originalRequest.url?.includes('/auth/refresh')) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      isRefreshing = false;
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { token, refresh_token } = response.data.data;

      localStorage.setItem('token', token);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }

      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
      originalRequest.headers.Authorization = `Bearer ${token}`;

      processQueue(null, token);

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
