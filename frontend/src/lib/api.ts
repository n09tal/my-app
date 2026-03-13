import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";
import { env } from "./env";

const BASE_URL = env.API_URL;

if (typeof window !== "undefined") {
  console.log("[API] Using BASE_URL:", BASE_URL);
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log("[API] Request:", config.method?.toUpperCase(), config.url);

    if (typeof window !== "undefined") {
      const accessToken = useAuthStore.getState().accessToken;

      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          console.log("[API] No refresh token - clearing storage");
          useAuthStore.getState().clearAuthenticated();
          window.location.href = "/";
          return Promise.reject(error);
        }

        const response = await axios.post<{ access: string }>(
          `${BASE_URL}/auth/token/refresh/`,
          {
            refresh: refreshToken,
          },
        );

        const newAccessToken = response.data.access;

        useAuthStore.getState().setAccessToken(newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        console.log("[API] Token refresh failed - clearing storage");
        useAuthStore.getState().clearAuthenticated();
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
