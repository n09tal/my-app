import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useReviews,
  useReview,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from "../features/reviews/hooks/useReviews";
import { reviewsApi } from "../features/reviews/api/reviewsService";
import type { Review, PaginatedResponse, ReviewInput } from "../features/reviews/types";

jest.mock("../features/reviews/api/reviewsService", () => ({
  reviewsApi: {
    getReviews: jest.fn(),
    getReview: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
    deleteReview: jest.fn(),
  },
}));

const createMockReview = (
  id: number,
  vendorId: number,
  firstName: string = "Test",
  lastName: string = "User"
): Review => ({
  id,
  vendor: vendorId,
  first_name: firstName,
  last_name: lastName,
  stars: 4,
  description: `Test review ${id} for vendor ${vendorId}`,
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
});

const generateMockReviews = (count: number, vendorId: number): Review[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockReview(i + 1, vendorId, `User${i + 1}`, "Reviewer")
  );
};

const createPaginatedResponse = (
  reviews: Review[],
  totalCount: number,
  offset: number,
  limit: number
): PaginatedResponse<Review> => ({
  count: totalCount,
  next:
    offset + limit < totalCount
      ? `http://localhost:8000/api/directory/vendors/1/reviews/?limit=${limit}&offset=${offset + limit}`
      : null,
  previous:
    offset > 0
      ? `http://localhost:8000/api/directory/vendors/1/reviews/?limit=${limit}&offset=${Math.max(0, offset - limit)}`
      : null,
  results: reviews,
});

class ApiError extends Error {
  response: { status: number; data: { detail?: string; non_field_errors?: string[] } };

  constructor(
    message: string,
    status: number,
    detail?: string,
    nonFieldErrors?: string[]
  ) {
    super(message);
    this.name = "ApiError";
    this.response = {
      status,
      data: {
        detail,
        non_field_errors: nonFieldErrors,
      },
    };
  }
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    queryClient,
  };
};

describe("useReviews Hook - Read Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Get review list with pagination", () => {
    it("should fetch reviews with default pagination params", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(10, vendorId);
      const mockResponse = createPaginatedResponse(mockReviews, 50, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(reviewsApi.getReviews).toHaveBeenCalledWith(vendorId, {
        limit: 10,
        offset: 0,
      });
      expect(result.current.reviews).toHaveLength(10);
      expect(result.current.count).toBe(50);
      expect(result.current.isError).toBe(false);
    });

    it("should fetch reviews with custom limit and offset", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(5, vendorId);
      const mockResponse = createPaginatedResponse(mockReviews, 50, 20, 5);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useReviews(vendorId, { limit: 5, offset: 20 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(reviewsApi.getReviews).toHaveBeenCalledWith(vendorId, {
        limit: 5,
        offset: 20,
      });
      expect(result.current.reviews).toHaveLength(5);
    });

    it("should return correct next and previous URLs for middle page", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(10, vendorId);
      const mockResponse = createPaginatedResponse(mockReviews, 50, 10, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useReviews(vendorId, { limit: 10, offset: 10 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.next).toContain("offset=20");
      expect(result.current.previous).toContain("offset=0");
    });

    it("should return null for previous on first page", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(10, vendorId);
      const mockResponse = createPaginatedResponse(mockReviews, 50, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.previous).toBeNull();
      expect(result.current.next).not.toBeNull();
    });

    it("should return null for next on last page", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(5, vendorId);
      const mockResponse = createPaginatedResponse(mockReviews, 45, 40, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useReviews(vendorId, { limit: 10, offset: 40 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.next).toBeNull();
      expect(result.current.previous).not.toBeNull();
    });

    it("should return empty array when no reviews exist", async () => {
      const vendorId = 1;
      const mockResponse = createPaginatedResponse([], 0, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reviews).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it("should not fetch when vendorId is 0 (disabled query)", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(0), { wrapper });

      expect(reviewsApi.getReviews).not.toHaveBeenCalled();
      expect(result.current.reviews).toEqual([]);
    });
  });
});

describe("useCreateReviewMutation - Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("2. Must be authenticated to create a review", () => {
    it("should successfully create review when authenticated", async () => {
      const vendorId = 1;
      const reviewInput: ReviewInput = {
        first_name: "John",
        last_name: "Doe",
        stars: 5,
        description: "Great service!",
      };
      const createdReview = createMockReview(1, vendorId, "John", "Doe");
      (reviewsApi.createReview as jest.Mock).mockResolvedValue(createdReview);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.createReview(reviewInput);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reviewsApi.createReview).toHaveBeenCalledWith(vendorId, reviewInput);
    });

    it("should fail with 401 when not authenticated", async () => {
      const vendorId = 1;
      const reviewInput: ReviewInput = {
        first_name: "John",
        last_name: "Doe",
        stars: 5,
        description: "Great service!",
      };
      const authError = new ApiError(
        "Authentication credentials were not provided.",
        401,
        "Authentication credentials were not provided."
      );
      (reviewsApi.createReview as jest.Mock).mockRejectedValue(authError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.createReview(reviewInput);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as ApiError).response.status).toBe(401);

      consoleErrorSpy.mockRestore();
    });

    it("should fail with 400 when user already reviewed this vendor (duplicate)", async () => {
      const vendorId = 1;
      const reviewInput: ReviewInput = {
        first_name: "John",
        last_name: "Doe",
        stars: 5,
        description: "Another review!",
      };
      const duplicateError = new ApiError(
        "You have already reviewed this vendor.",
        400,
        undefined,
        ["You have already reviewed this vendor."]
      );
      (reviewsApi.createReview as jest.Mock).mockRejectedValue(duplicateError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useCreateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.createReview(reviewInput);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as ApiError).response.status).toBe(400);
      expect(
        (result.current.error as ApiError).response.data.non_field_errors
      ).toContain("You have already reviewed this vendor.");

      consoleErrorSpy.mockRestore();
    });
  });
});

describe("useUpdateReviewMutation - Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("3. Must be authenticated to edit your own review", () => {
    it("should successfully update own review when authenticated", async () => {
      const vendorId = 1;
      const reviewId = 5;
      const reviewInput: ReviewInput = {
        first_name: "John",
        last_name: "Doe",
        stars: 4,
        description: "Updated review text",
      };
      const updatedReview: Review = {
        ...createMockReview(reviewId, vendorId, "John", "Doe"),
        stars: 4,
        description: "Updated review text",
        updated_at: "2025-01-20T10:00:00Z",
      };
      (reviewsApi.updateReview as jest.Mock).mockResolvedValue(updatedReview);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.updateReview({ reviewId, review: reviewInput });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reviewsApi.updateReview).toHaveBeenCalledWith(
        vendorId,
        reviewId,
        reviewInput
      );
    });

    it("should fail with 401 when not authenticated for update", async () => {
      const vendorId = 1;
      const reviewId = 5;
      const reviewInput: ReviewInput = {
        first_name: "John",
        last_name: "Doe",
        stars: 4,
        description: "Trying to update without auth",
      };
      const authError = new ApiError(
        "Authentication credentials were not provided.",
        401,
        "Authentication credentials were not provided."
      );
      (reviewsApi.updateReview as jest.Mock).mockRejectedValue(authError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.updateReview({ reviewId, review: reviewInput });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as ApiError).response.status).toBe(401);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("4. Cannot edit another person's review", () => {
    it("should fail with 403 when trying to update another user's review", async () => {
      const vendorId = 1;
      const reviewId = 10;
      const reviewInput: ReviewInput = {
        first_name: "Hacker",
        last_name: "User",
        stars: 1,
        description: "Trying to modify someone else's review",
      };
      const forbiddenError = new ApiError(
        "You can only modify your own reviews.",
        403,
        "You can only modify your own reviews."
      );
      (reviewsApi.updateReview as jest.Mock).mockRejectedValue(forbiddenError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.updateReview({ reviewId, review: reviewInput });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as ApiError).response.status).toBe(403);
      expect((result.current.error as ApiError).response.data.detail).toBe(
        "You can only modify your own reviews."
      );

      consoleErrorSpy.mockRestore();
    });

    it("should fail with 404 when review does not exist", async () => {
      const vendorId = 1;
      const reviewId = 99999;
      const reviewInput: ReviewInput = {
        first_name: "John",
        last_name: "Doe",
        stars: 4,
        description: "Trying to update non-existent review",
      };
      const notFoundError = new ApiError("Not found.", 404, "Not found.");
      (reviewsApi.updateReview as jest.Mock).mockRejectedValue(notFoundError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useUpdateReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.updateReview({ reviewId, review: reviewInput });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as ApiError).response.status).toBe(404);

      consoleErrorSpy.mockRestore();
    });
  });
});

describe("useDeleteReviewMutation - Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("5. Must be authenticated to delete your review", () => {
    it("should successfully delete own review when authenticated", async () => {
      const vendorId = 1;
      const reviewId = 5;
      (reviewsApi.deleteReview as jest.Mock).mockResolvedValue(undefined);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.deleteReview(reviewId);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(reviewsApi.deleteReview).toHaveBeenCalledWith(vendorId, reviewId);
    });

    it("should fail with 401 when not authenticated for delete", async () => {
      const vendorId = 1;
      const reviewId = 5;
      const authError = new ApiError(
        "Authentication credentials were not provided.",
        401,
        "Authentication credentials were not provided."
      );
      (reviewsApi.deleteReview as jest.Mock).mockRejectedValue(authError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.deleteReview(reviewId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as ApiError).response.status).toBe(401);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("6. Cannot delete someone else's review", () => {
    it("should fail with 403 when trying to delete another user's review", async () => {
      const vendorId = 1;
      const reviewId = 10;
      const forbiddenError = new ApiError(
        "You can only modify your own reviews.",
        403,
        "You can only modify your own reviews."
      );
      (reviewsApi.deleteReview as jest.Mock).mockRejectedValue(forbiddenError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.deleteReview(reviewId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect((result.current.error as ApiError).response.status).toBe(403);
      expect((result.current.error as ApiError).response.data.detail).toBe(
        "You can only modify your own reviews."
      );

      consoleErrorSpy.mockRestore();
    });

    it("should fail with 404 when review does not exist for deletion", async () => {
      const vendorId = 1;
      const reviewId = 99999;
      const notFoundError = new ApiError("Not found.", 404, "Not found.");
      (reviewsApi.deleteReview as jest.Mock).mockRejectedValue(notFoundError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useDeleteReviewMutation(vendorId), {
        wrapper,
      });

      await act(async () => {
        result.current.deleteReview(reviewId);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as ApiError).response.status).toBe(404);

      consoleErrorSpy.mockRestore();
    });
  });
});

describe("7. Review count and rating display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Reviews count verification", () => {
    it("should return correct total count from paginated response", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(10, vendorId);
      const totalCount = 47;
      const mockResponse = createPaginatedResponse(mockReviews, totalCount, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.count).toBe(47);
      expect(result.current.reviews).toHaveLength(10);
    });

    it("should return 0 count when vendor has no reviews", async () => {
      const vendorId = 1;
      const mockResponse = createPaginatedResponse([], 0, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.count).toBe(0);
      expect(result.current.reviews).toHaveLength(0);
    });
  });

  describe("Rating calculation from reviews", () => {
    it("should correctly calculate average rating from multiple reviews", async () => {
      const vendorId = 1;
      const mockReviews: Review[] = [
        { ...createMockReview(1, vendorId), stars: 5 },
        { ...createMockReview(2, vendorId), stars: 4 },
        { ...createMockReview(3, vendorId), stars: 3 },
        { ...createMockReview(4, vendorId), stars: 5 },
        { ...createMockReview(5, vendorId), stars: 4 },
      ];
      const mockResponse = createPaginatedResponse(mockReviews, 5, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Calculate expected average: (5+4+3+5+4)/5 = 21/5 = 4.2
      const totalStars = result.current.reviews.reduce((sum, r) => sum + r.stars, 0);
      const avgRating = totalStars / result.current.reviews.length;

      expect(avgRating).toBe(4.2);
      expect(result.current.reviews.every((r) => r.stars >= 1 && r.stars <= 5)).toBe(
        true
      );
    });

    it("should handle single review rating correctly", async () => {
      const vendorId = 1;
      const mockReviews: Review[] = [{ ...createMockReview(1, vendorId), stars: 5 }];
      const mockResponse = createPaginatedResponse(mockReviews, 1, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.count).toBe(1);
      expect(result.current.reviews[0].stars).toBe(5);
    });

    it("should validate star ratings are within valid range (1-5)", async () => {
      const vendorId = 1;
      const mockReviews = generateMockReviews(10, vendorId);
      const mockResponse = createPaginatedResponse(mockReviews, 10, 0, 10);
      (reviewsApi.getReviews as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useReviews(vendorId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.reviews.forEach((review) => {
        expect(review.stars).toBeGreaterThanOrEqual(1);
        expect(review.stars).toBeLessThanOrEqual(5);
      });
    });
  });
});

describe("useReview - Single Review Fetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch a single review by ID", async () => {
    const vendorId = 1;
    const reviewId = 5;
    const mockReview = createMockReview(reviewId, vendorId, "Single", "Review");
    (reviewsApi.getReview as jest.Mock).mockResolvedValue(mockReview);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReview(vendorId, reviewId), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(reviewsApi.getReview).toHaveBeenCalledWith(vendorId, reviewId);
    expect(result.current.review).toEqual(mockReview);
    expect(result.current.review?.id).toBe(reviewId);
  });

  it("should not fetch when vendorId or reviewId is 0", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReview(0, 0), { wrapper });

    expect(reviewsApi.getReview).not.toHaveBeenCalled();
    expect(result.current.review).toBeUndefined();
  });

  it("should handle 404 for non-existent review", async () => {
    const vendorId = 1;
    const reviewId = 99999;
    const notFoundError = new ApiError("Not found.", 404, "Not found.");
    (reviewsApi.getReview as jest.Mock).mockRejectedValue(notFoundError);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReview(vendorId, reviewId), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect((result.current.error as ApiError).response.status).toBe(404);
  });
});

describe("Mutation State Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reset mutation state after calling reset()", async () => {
    const vendorId = 1;
    const authError = new ApiError("Unauthorized", 401, "Unauthorized");
    (reviewsApi.createReview as jest.Mock).mockRejectedValue(authError);

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateReviewMutation(vendorId), {
      wrapper,
    });

    await act(async () => {
      result.current.createReview({
        first_name: "Test",
        last_name: "User",
        stars: 5,
        description: "Test",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    await act(async () => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it("should track loading state during mutation", async () => {
    const vendorId = 1;
    let resolvePromise: (value: Review) => void;
    const pendingPromise = new Promise<Review>((resolve) => {
      resolvePromise = resolve;
    });
    (reviewsApi.createReview as jest.Mock).mockReturnValue(pendingPromise);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateReviewMutation(vendorId), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.createReview({
        first_name: "Test",
        last_name: "User",
        stars: 5,
        description: "Test",
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise!(createMockReview(1, vendorId));
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
  });
});

