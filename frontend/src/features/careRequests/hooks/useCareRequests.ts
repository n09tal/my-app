"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { careRequestsApi } from "../api/careRequestsService";
import type { CreateCareRequestInput } from "../types";

export function useCareRequests(params?: { limit?: number; offset?: number }, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.careRequests.list(params),
    queryFn: () => careRequestsApi.getCareRequests(params),
    enabled,
  });

  return {
    requests: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    next: query.data?.next ?? null,
    previous: query.data?.previous ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCareRequest(id: number, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.careRequests.detail(id),
    queryFn: () => careRequestsApi.getCareRequest(id),
    enabled: enabled && !!id,
  });

  return {
    request: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateCareRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateCareRequestInput) =>
      careRequestsApi.createCareRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.careRequests.all });
    },
  });

  return {
    createCareRequest: mutation.mutate,
    createCareRequestAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
