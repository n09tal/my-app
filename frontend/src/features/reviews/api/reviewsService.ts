import api from "@/lib/api";
import type { Review, ReviewInput, PaginatedResponse, PaginationParams } from "../types";

export const reviewsApi = {
    async getReviews(vendorId: number, params: PaginationParams): Promise<PaginatedResponse<Review>> {
      const response = await api.get<PaginatedResponse<Review>>(
        `/api/directory/vendors/${vendorId}/reviews/?limit=${params.limit}&offset=${params.offset}`
      );
      return response.data;
    },
  
    async getReview(vendorId: number, reviewId: number): Promise<Review> {
      const response = await api.get<Review>(
        `/api/directory/vendors/${vendorId}/reviews/${reviewId}/`
      );
      return response.data;
    },
  
    async createReview(vendorId: number, review: ReviewInput): Promise<Review> {
      const response = await api.post<Review>(
        `/api/directory/vendors/${vendorId}/reviews/`,
        review as ReviewInput
      );
      return response.data;
    },
  
    async updateReview(vendorId: number, reviewId: number, review: ReviewInput): Promise<Review> {
      const response = await api.put<Review>(
        `/api/directory/vendors/${vendorId}/reviews/${reviewId}/`,
        review as ReviewInput
      );
      return response.data;
    },
  
    async deleteReview(vendorId: number, reviewId: number): Promise<void> {
      await api.delete(`/api/directory/vendors/${vendorId}/reviews/${reviewId}/`);
    }
  };