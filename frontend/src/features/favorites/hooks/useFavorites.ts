"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { favoritesApi } from "../api/favoritesService";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/features/auth/store/authStore";

export function useFavorites() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useQuery({
    queryKey: queryKeys.favorites.list(),
    queryFn: () => favoritesApi.getFavorites(),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const favoriteVendorIds = useMemo(
    () => new Set((query.data ?? []).map((fav) => fav.vendor.id)),
    [query.data],
  );

  const isFavorite = useCallback(
    (vendorId: number) => favoriteVendorIds.has(vendorId),
    [favoriteVendorIds],
  );

  return {
    favorites: query.data ?? [],
    favoriteVendorIds,
    isFavorite,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
