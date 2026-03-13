import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { setCookie, deleteCookie } from "@/lib/utils/cookies";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  authenticatedLoading: boolean;
  authenticatedError: string | null;

  loginLoading: boolean;
  loginError: string | null;

  logoutLoading: boolean;
  logoutError: string | null;
};

type AuthActions = {
  initializeAuthenticated: () => void;
  setAuthenticated: (
    accessToken: string,
    refreshToken: string,
    user: User,
  ) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuthenticated: () => void;
  setAuthenticatedLoading: (loading: boolean) => void;
  setAuthenticatedError: (error: string | null) => void;

  setLoginLoading: (loading: boolean) => void;
  setLoginError: (error: string | null) => void;

  setLogoutLoading: (loading: boolean) => void;
  setLogoutError: (error: string | null) => void;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      authenticatedLoading: true,
      authenticatedError: null,
      loginLoading: false,
      loginError: null,
      logoutLoading: false,
      logoutError: null,
      isAuthenticated: false,
      initializeAuthenticated: () => {
        set((state) => ({
          authenticatedLoading: false,
          isAuthenticated: !!state.accessToken,
        }));
      },
      setAuthenticated: (
        accessToken: string,
        refreshToken: string,
        user: User,
      ) => {
        setCookie("ACCESS_TOKEN", accessToken, 0.0104);
        setCookie("REFRESH_TOKEN", refreshToken, 1);

        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          authenticatedLoading: false,
        });
      },
      setAccessToken: (accessToken: string) => {
        setCookie("ACCESS_TOKEN", accessToken, 0.0104);

        set({
          accessToken,
          isAuthenticated: true,
        });
      },
      clearAuthenticated: () => {
        deleteCookie("ACCESS_TOKEN");
        deleteCookie("REFRESH_TOKEN");

        if (typeof window !== "undefined") {
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(
                /=.*/,
                "=;expires=" + new Date().toUTCString() + ";path=/",
              );
          });
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          authenticatedLoading: false,
        });
      },
      setAuthenticatedLoading: (loading: boolean) => {
        set({ authenticatedLoading: loading });
      },
      setAuthenticatedError: (error: string | null) => {
        set({ authenticatedError: error });
      },
      setLoginLoading: (loading: boolean) => {
        set({ loginLoading: loading });
      },
      setLoginError: (error: string | null) => {
        set({ loginError: error });
      },
      setLogoutLoading: (loading: boolean) => {
        set({ logoutLoading: loading });
      },
      setLogoutError: (error: string | null) => {
        set({ logoutError: error });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.accessToken;
          state.authenticatedLoading = false;
        }
      },
    },
  ),
);
