"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { vendorsApi } from "../api/vendorsService";
import { queryKeys } from "@/lib/queryKeys";
import type { VendorSearchParams, ClaimVendorRequest } from "../types";
import { useSearchPattern } from "@/features/session";

const DEFAULT_LIMIT = 10;

export function useVendors(params?: Partial<VendorSearchParams>) {
  const searchPattern = useSearchPattern();

  const searchParams: VendorSearchParams = {
    limit: params?.limit ?? DEFAULT_LIMIT,
    offset: params?.offset ?? 0,
    agencyName: params?.agencyName,
    zipCode: params?.zipCode,
    services: params?.services,
    minRating: params?.minRating,
    languages: params?.languages,
    fundingSources: params?.fundingSources,
    searchPattern,
  };

  const query = useQuery({
    queryKey: queryKeys.vendors.list(searchParams),
    queryFn: () => vendorsApi.getVendors(searchParams),
    placeholderData: keepPreviousData,
  });

  return {
    vendors: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    next: query.data?.next,
    previous: query.data?.previous,
    isLoading: query.isLoading && !query.isPlaceholderData,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useVendor(id: number) {
  const query = useQuery({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: () => vendorsApi.getVendor(id),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  return {
    vendor: query.data,
    isLoading: query.isLoading && !query.isPlaceholderData,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useClaimVendorMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      vendorId,
      data,
    }: {
      vendorId: number;
      data: ClaimVendorRequest;
    }) => {
      return await vendorsApi.submitClaim(vendorId, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendors.detail(variables.vendorId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.claims.status(variables.vendorId),
      });
    },
  });

  return {
    submitClaim: mutation.mutate,
    submitClaimAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useClaimStatus(vendorId: number, enabled: boolean = true) {
  const query = useQuery({
    queryKey: queryKeys.claims.status(vendorId),
    queryFn: () => vendorsApi.getClaimStatus(vendorId),
    enabled: enabled && !!vendorId,
  });

  return {
    hasPendingClaim: query.data?.has_pending_claim ?? false,
    claimId: query.data?.claim_id ?? null,
    submittedAt: query.data?.submitted_at ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useMyVendors() {
  const query = useQuery({
    queryKey: queryKeys.vendors.mine(),
    queryFn: () => vendorsApi.getMyVendors(),
  });

  return {
    vendors: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}


export function useServices() {
  const query = useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: () => vendorsApi.getServices(),
  });

  return {
    services: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}


export function useFundingSources() {
  const query = useQuery({
    queryKey: queryKeys.fundingSources.list(),
    queryFn: () => vendorsApi.getFundingSources(),
  });

  return {
    fundingSources: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useCounties() {
  const query = useQuery({
    queryKey: queryKeys.vendors.counties(),
    queryFn: () => vendorsApi.getCounties(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    counties: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}