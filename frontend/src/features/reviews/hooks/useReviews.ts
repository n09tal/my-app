"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { reviewsApi } from "../api/reviewsService";
import type { PaginationParams, ReviewInput } from "../types";

const DEFAULT_LIMIT = 10;

export function useReviews(vendorId: number, params?: Partial<PaginationParams>) {
  const paginationParams: PaginationParams = {
    limit: params?.limit ?? DEFAULT_LIMIT,
    offset: params?.offset ?? 0,
  };

  const query = useQuery({
    queryKey: queryKeys.reviews.list(vendorId, paginationParams),
    queryFn: () => reviewsApi.getReviews(vendorId, paginationParams),
    enabled: !!vendorId,
  });

  return {
    reviews: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    next: query.data?.next,
    previous: query.data?.previous,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useReview(vendorId: number, reviewId: number) {
  const query = useQuery({
    queryKey: queryKeys.reviews.detail(vendorId, reviewId),
    queryFn: () => reviewsApi.getReview(vendorId, reviewId),
    enabled: !!vendorId && !!reviewId,
  });

  return {
    review: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateReviewMutation(vendorId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (review: ReviewInput) => reviewsApi.createReview(vendorId, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendorId) });
    },
    onError: (error) => {
      console.error("Failed to create review:", error);
    },
  });

  return {
    createReview: mutation.mutate,
    createReviewAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useUpdateReviewMutation(vendorId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ reviewId, review }: { reviewId: number; review: ReviewInput }) =>
      reviewsApi.updateReview(vendorId, reviewId, review),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.detail(vendorId, variables.reviewId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
    onError: (error) => {
      console.error("Failed to update review:", error);
    },
  });

  return {
    updateReview: mutation.mutate,
    updateReviewAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useDeleteReviewMutation(vendorId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (reviewId: number) => reviewsApi.deleteReview(vendorId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendorId) });
    },
    onError: (error) => {
      console.error("Failed to delete review:", error);
    },
  });

  return {
    deleteReview: mutation.mutate,
    deleteReviewAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}