import { useAuthStore } from "../store/authStore";
import type { User } from "../types";

export const storeAuthData = (
  accessToken: string,
  refreshToken: string,
  user: User,
): void => {
  if (typeof window === "undefined") return;
  useAuthStore.getState().setAuthenticated(accessToken, refreshToken, user);
};

export const clearAuthData = (): void => {
  if (typeof window === "undefined") return;
  useAuthStore.getState().clearAuthenticated();
  console.log("[Auth] Storage cleared");
};

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return useAuthStore.getState().accessToken;
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return useAuthStore.getState().refreshToken;
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  return useAuthStore.getState().user;
};

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  return useAuthStore.getState().isAuthenticated;
};
