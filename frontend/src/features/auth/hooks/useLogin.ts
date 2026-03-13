"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authService";
import { storeAuthData } from "../api/tokenStorage";
import type { LoginResponse, LoginParams } from "../types";

export function useLogin() {
  const router = useRouter();

  const { mutate, isPending, error, isSuccess } = useMutation<
    LoginResponse,
    Error,
    LoginParams
  >({
    mutationFn: async (credentials: LoginParams): Promise<LoginResponse> => {
      const response = await authApi.login(credentials);
      return response;
    },
    onSuccess: async (response: LoginResponse, variables: LoginParams) => {
      storeAuthData(
        response.access_token,
        response.refresh_token,
        response.user,
      );
      router.push(variables.redirectTo || "/");
    },
    onError: (error: Error) => {
      console.error("[Auth] Login error:", error);
    },
  });

  return {
    login: mutate,
    isLoading: isPending,
    error: error instanceof Error ? "Invalid email or password" : null,
    isSuccess: isSuccess,
  };
}
