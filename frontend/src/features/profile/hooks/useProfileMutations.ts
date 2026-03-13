"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profileService";
import { queryKeys } from "@/lib/queryKeys";
import type { UpdateProfileData } from "../types";

export function useUpdateProfileMutation(userId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      return await profileApi.updateProfile(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.byId(userId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
    },
    onError: (error) => {
      console.error("Profile update failed:", error);
    },
  });

  return {
    updateProfile: mutation.mutate,
    updateProfileAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}

export function useUpdateProviderProfileMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return await profileApi.updateProviderProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
    },
    onError: (error) => {
      console.error("Provider profile update failed:", error);
    },
  });

  return {
    updateProviderProfile: mutation.mutate,
    updateProviderProfileAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}

export function useUploadDocumentsMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      return await profileApi.uploadDocuments(files);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
    onError: (error) => {
      console.error("Document upload failed:", error);
    },
  });

  return {
    uploadDocuments: mutation.mutate,
    uploadDocumentsAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
