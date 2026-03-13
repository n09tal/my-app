"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorsApi } from "../api/vendorsService";
import { queryKeys } from "@/lib/queryKeys";
import type { UpdateVendorData } from "../types";

export function useUpdateVendorMutation(vendorId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdateVendorData) => vendorsApi.updateVendor(vendorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendorId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
    onError: (error) => {
      console.error("Vendor update failed:", error);
    },
  });

  return {
    updateVendor: mutation.mutate,
    updateVendorAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}