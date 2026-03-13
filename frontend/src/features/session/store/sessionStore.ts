import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SearchFiltersType } from "@/types/search";

/**
 * Generate a random search pattern string.
 * This pattern will be used by the backend to randomize search results.
 */
const generateSearchPattern = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let pattern = "";
  
  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    pattern += chars[randomIndex];
  }
  
  return pattern;
};

type SessionState = {
  searchPattern: string | null;
  sessionId: string | null;
  tabCreatedAt: number | null;
  lastSearchFilters: SearchFiltersType | null;
};

type SessionActions = {
  getSearchPattern: () => string;
  regenerateSearchPattern: () => string;
  initializeSession: () => void;
  clearSession: () => void;
  saveSearchFilters: (filters: SearchFiltersType) => void;
  getLastSearchFilters: () => SearchFiltersType | null;
  clearSearchFilters: () => void;
};

export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      searchPattern: null,
      sessionId: null,
      tabCreatedAt: null,
      lastSearchFilters: null,

      getSearchPattern: () => {
        const currentPattern = get().searchPattern;
        if (currentPattern) {
          return currentPattern;
        }

        const newPattern = generateSearchPattern();
        const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        set({
          searchPattern: newPattern,
          sessionId,
          tabCreatedAt: Date.now(),
        });

        return newPattern;
      },

      regenerateSearchPattern: () => {
        const newPattern = generateSearchPattern();
        set({ searchPattern: newPattern });
        return newPattern;
      },

      initializeSession: () => {
        const state = get();
        if (!state.searchPattern || !state.sessionId) {
          get().getSearchPattern();
        }
      },

      clearSession: () => {
        set({
          searchPattern: null,
          sessionId: null,
          tabCreatedAt: null,
          lastSearchFilters: null,
        });
      },

      saveSearchFilters: (filters: SearchFiltersType) => {
        set({ lastSearchFilters: filters });
      },

      getLastSearchFilters: () => {
        return get().lastSearchFilters;
      },

      clearSearchFilters: () => {
        set({ lastSearchFilters: null });
      },
    }),
    {
      name: "session-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        searchPattern: state.searchPattern,
        sessionId: state.sessionId,
        tabCreatedAt: state.tabCreatedAt,
        lastSearchFilters: state.lastSearchFilters,
      }),
      // Add onRehydrateStorage to ensure proper initialization
      onRehydrateStorage: () => (state) => {
        // After rehydration, if no pattern exists, generate one
        if (state && (!state.searchPattern || !state.sessionId)) {
          state.getSearchPattern();
        }
      },
    },
  ),
);