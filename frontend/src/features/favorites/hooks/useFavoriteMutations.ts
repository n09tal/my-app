"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesApi } from "../api/favoritesService";
import { queryKeys } from "@/lib/queryKeys";

export function useAddFavoriteMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (vendorId: number) => {
      return await favoritesApi.addFavorite({ vendor_id: vendorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      // Removed vendor invalidation to prevent unnecessary refetches when favoriting
      // The favorite status is already handled optimistically in the UI
      // and useFavorites() has its own query for favorite state
    },
  });

  return {
    addFavorite: mutation.mutate,
    addFavoriteAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}

export function useRemoveFavoriteMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (vendorId: number) => {
      return await favoritesApi.removeFavorite(vendorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      // Removed vendor invalidation to prevent unnecessary refetches when favoriting
      // The favorite status is already handled optimistically in the UI
      // and useFavorites() has its own query for favorite state
    },
  });

  return {
    removeFavorite: mutation.mutate,
    removeFavoriteAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      vendorId,
      isFavorite,
    }: {
      vendorId: number;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await favoritesApi.removeFavorite(vendorId);
      } else {
        await favoritesApi.addFavorite({ vendor_id: vendorId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      // Removed vendor invalidation to prevent unnecessary refetches when favoriting
      // The favorite status is already handled optimistically in the UI
      // and useFavorites() has its own query for favorite state
    },
  });

  return {
    toggleFavorite: mutation.mutate,
    toggleFavoriteAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
