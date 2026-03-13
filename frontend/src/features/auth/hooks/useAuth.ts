"use client";

import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const {
    user,
    authenticatedLoading,
    isAuthenticated,
    initializeAuthenticated,
  } = useAuthStore();

  useEffect(() => {
    initializeAuthenticated();
  }, [initializeAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth-storage") {
        try {
          const currentState = useAuthStore.getState();

          const stored = localStorage.getItem("auth-storage");
          if (stored) {
            const parsed = JSON.parse(stored);
            const newAccessToken = parsed.state?.accessToken;
            const newUser = parsed.state?.user;

            if (
              newAccessToken !== currentState.accessToken ||
              newUser?.id !== currentState.user?.id
            ) {
              useAuthStore.setState({
                accessToken: newAccessToken ?? null,
                refreshToken: parsed.state?.refreshToken ?? null,
                user: newUser ?? null,
              });
              initializeAuthenticated();
            }
          } else if (e.newValue === null) {
            useAuthStore.setState({
              accessToken: null,
              refreshToken: null,
              user: null,
            });
            initializeAuthenticated();
          }
        } catch (error) {
          console.error("[Auth] Error syncing from storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [initializeAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAuthChange = () => {
      initializeAuthenticated();
    };

    window.addEventListener("auth:login", handleAuthChange);
    window.addEventListener("auth:logout", handleAuthChange);
    window.addEventListener("auth:refresh", handleAuthChange);

    return () => {
      window.removeEventListener("auth:login", handleAuthChange);
      window.removeEventListener("auth:logout", handleAuthChange);
      window.removeEventListener("auth:refresh", handleAuthChange);
    };
  }, [initializeAuthenticated]);

  return {
    user,
    authenticated: isAuthenticated,
    isAuthenticated,
    authenticatedLoading,
    loading: authenticatedLoading,
    refetch: () => {
      initializeAuthenticated();
    },
  };
}
