"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authService";
import { clearAuthData } from "../api/tokenStorage";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      clearAuthData();

      queryClient.clear();

      router.push("/");
    },
    onError: (error) => {
      console.error("Logout failed:", error);
      clearAuthData();
      queryClient.clear();
      router.push("/");
    },
  });

  return {
    logout: mutate,
    isLoading: isPending,
  };
}
