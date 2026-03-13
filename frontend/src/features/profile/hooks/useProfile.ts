"use client";

import { useQuery } from "@tanstack/react-query";
import { profileApi } from "../api/profileService";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/features/auth";

export function useProfile() {
  const { authenticated, user } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: async () => {
      const data = await profileApi.getProfile();
      return data;
    },
    enabled: authenticated && !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: process.env.NODE_ENV === "production",
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUserProfile(userId: number, enabled: boolean = true) {
  const query = useQuery({
    queryKey: queryKeys.profile.byId(userId),
    queryFn: async () => {
      const data = await profileApi.getUserProfile(userId);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
