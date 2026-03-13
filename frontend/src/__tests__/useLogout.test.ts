/**
 * Tests for useLogout hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogout } from "../features/auth/hooks/useLogout";
import { authApi } from "../features/auth/api/authService";
import * as tokenStorage from "../features/auth/api/tokenStorage";

// Mock dependencies
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

jest.mock("../features/auth/api/authService", () => ({
  authApi: {
    logout: jest.fn(),
  },
}));

jest.mock("../features/auth/api/tokenStorage", () => ({
  clearAuthData: jest.fn(),
}));

// Helper to create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  // Spy on queryClient.clear
  jest.spyOn(queryClient, "clear");
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    queryClient,
  };
};

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authApi.logout as jest.Mock).mockResolvedValue(undefined);
  });

  describe("successful logout", () => {
    it("should call logout API, clear auth data, clear query cache, and redirect", async () => {
      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useLogout(), { wrapper });

      await act(async () => {
        result.current.logout();
      });

      await waitFor(() => {
        expect(authApi.logout).toHaveBeenCalledTimes(1);
        expect(tokenStorage.clearAuthData).toHaveBeenCalledTimes(1);
        expect(queryClient.clear).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("logout failure handling", () => {
    it("should clear local data and redirect even if API fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (authApi.logout as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useLogout(), { wrapper });

      await act(async () => {
        result.current.logout();
      });

      await waitFor(() => {
        expect(tokenStorage.clearAuthData).toHaveBeenCalledTimes(1);
        expect(queryClient.clear).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith("/");
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
