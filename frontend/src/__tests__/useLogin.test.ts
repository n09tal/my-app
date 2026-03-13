/**
 * Tests for useLogin hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogin } from "../features/auth/hooks/useLogin";
import { authApi } from "../features/auth/api/authService";
import * as tokenStorage from "../features/auth/api/tokenStorage";
import type { LoginResponse, User } from "../features/auth/types";

// Mock dependencies
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

jest.mock("../features/auth/api/authService", () => ({
  authApi: {
    login: jest.fn(),
  },
}));

jest.mock("../features/auth/api/tokenStorage", () => ({
  storeAuthData: jest.fn(),
}));

// Mock user data
const mockUser: User = {
  id: 1,
  email: "test@example.com",
  account: 1,
  user_profile: {
    first_name: "Test",
    last_name: "User",
    phone: "1234567890",
  },
  group: "Provider",
  twofactor: {
    otp_2fa_enabled: false,
    qr_2fa_enabled: false,
  },
};

// Mock login response
const mockLoginResponse: LoginResponse = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  user: mockUser,
};

// Helper to create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  }
  return Wrapper;
};

describe("useLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authApi.login as jest.Mock).mockResolvedValue(mockLoginResponse);
  });

  describe("successful login", () => {
    it("should call login API, store auth data, and redirect to home", async () => {
      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      const credentials = {
        email: "test@example.com",
        password: "password123",
      };

      await act(async () => {
        result.current.login(credentials);
      });

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith(credentials);
        expect(tokenStorage.storeAuthData).toHaveBeenCalledWith(
          mockLoginResponse.access_token,
          mockLoginResponse.refresh_token,
          mockLoginResponse.user,
        );
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("should redirect to specified path if redirectTo is provided", async () => {
      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "test@example.com",
          password: "password123",
          redirectTo: "/dashboard",
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("login failure handling", () => {
    it("should show error and not store data or redirect when login fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (authApi.login as jest.Mock).mockRejectedValue(
        new Error("Invalid credentials"),
      );

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.login({
          email: "wrong@example.com",
          password: "wrongpassword",
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Invalid email or password");
      });

      expect(tokenStorage.storeAuthData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
