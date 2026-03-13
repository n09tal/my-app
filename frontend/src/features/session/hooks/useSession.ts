"use client";

import { useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";

/**
 * Hook to get the search pattern for the current session.
 * Automatically initializes the session if needed.
 * 
 * @returns The search pattern string (unique per browser tab)
 */
export function useSearchPattern(): string {
  const searchPattern = useSessionStore((state) => state.searchPattern);
  const getSearchPattern = useSessionStore((state) => state.getSearchPattern);
  const initializeSession = useSessionStore((state) => state.initializeSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return searchPattern || getSearchPattern();
}

/**
 * Hook to get session information
 */
export function useSession() {
  const searchPattern = useSessionStore((state) => state.searchPattern);
  const sessionId = useSessionStore((state) => state.sessionId);
  const tabCreatedAt = useSessionStore((state) => state.tabCreatedAt);
  const initializeSession = useSessionStore((state) => state.initializeSession);
  const regenerateSearchPattern = useSessionStore(
    (state) => state.regenerateSearchPattern,
  );
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return {
    searchPattern: searchPattern || null,
    sessionId: sessionId || null,
    tabCreatedAt: tabCreatedAt || null,
    regenerateSearchPattern,
    clearSession,
  };
}