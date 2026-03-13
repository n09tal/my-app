"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { directoryUserApi } from "../api/directoryUserService";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/features/auth/store/authStore";
import type {
  RegisterDirectoryUserRequest,
  UpdateDirectoryUserRequest,
  DirectoryUserApiError,
} from "@/types";

export function useRegisterDirectoryUser() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (data: RegisterDirectoryUserRequest) => {
      return await directoryUserApi.register(data);
    },
    onSuccess: () => {
      router.push("/login?registered=true");
    },
    onError: (error: AxiosError<DirectoryUserApiError>) => {
      console.error("[DirectoryUser] Registration error:", error);
    },
  });

  return {
    register: mutation.mutate,
    registerAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error as AxiosError<DirectoryUserApiError> | null,
    reset: mutation.reset,
  };
}

export function useUpdateDirectoryUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateDirectoryUserRequest) => {
      return await directoryUserApi.updateCurrentUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
    },
    onError: (error: AxiosError<DirectoryUserApiError>) => {
      console.error("[DirectoryUser] Update error:", error);
    },
  });

  return {
    updateUser: mutation.mutate,
    updateUserAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error as AxiosError<DirectoryUserApiError> | null,
    reset: mutation.reset,
  };
}

export function useDeactivateAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuthenticated = useAuthStore((state) => state.clearAuthenticated);

  const mutation = useMutation({
    mutationFn: async () => {
      return await directoryUserApi.deactivateAccount();
    },
    onSuccess: () => {
      queryClient.clear();
      clearAuthenticated();
      router.push("/?deactivated=true");
    },
    onError: (error: AxiosError<DirectoryUserApiError>) => {
      console.error("[DirectoryUser] Deactivation error:", error);
    },
  });

  return {
    deactivate: mutation.mutate,
    deactivateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error as AxiosError<DirectoryUserApiError> | null,
  };
}