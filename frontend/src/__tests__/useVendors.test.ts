/**
 * Tests for useVendors hook with pagination
 */

import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVendors } from "../features/vendors/hooks/useVendors";
import { vendorsApi } from "../features/vendors/api/vendorsService";
import type { Vendor, PaginatedResponse } from "../features/vendors/types";

jest.mock("../features/vendors/api/vendorsService", () => ({
  vendorsApi: {
    getVendors: jest.fn(),
    getVendor: jest.fn(),
    submitClaim: jest.fn(),
    getClaimStatus: jest.fn(),
  },
}));

jest.mock("../features/session", () => ({
  useSearchPattern: jest.fn(() => "test-search-pattern-123"),
}));

// Mock vendor data
const createMockVendor = (id: number): Vendor => ({
  id,
  legal_name: `Test Vendor ${id} LLC`,
  dba: `Test Vendor ${id}`,
  display_name: `Test Vendor ${id}`,
  vendor_type: "Provider",
  primary_county: "Test County",
  contact_phone: "555-1234",
  verified: true,
  availability: "Available",
  description: "Test description",
  languages: ["English"],
  image: "test.jpg",
  is_favorite: false,
  counties: [{ id: 1, name: "Test County" }],
  services: [{ id: 1, name: "Test Service" }],
  rating: 4.5,
  reviews: 10,
  claim_status: null,
  claimed_by: null,
});

// Generate mock vendors
const generateMockVendors = (count: number): Vendor[] => {
  return Array.from({ length: count }, (_, i) => createMockVendor(i + 1));
};

// Create paginated response
const createPaginatedResponse = (
  vendors: Vendor[],
  totalCount: number,
  offset: number,
  limit: number,
): PaginatedResponse<Vendor> => ({
  count: totalCount,
  next:
    offset + limit < totalCount
      ? `http://localhost:8000/api/directory/vendors/?limit=${limit}&offset=${offset + limit}`
      : null,
  previous:
    offset > 0
      ? `http://localhost:8000/api/directory/vendors/?limit=${limit}&offset=${Math.max(0, offset - limit)}`
      : null,
  results: vendors,
});

// Helper to create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    queryClient,
  };
};

describe("useVendors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetching vendors with pagination", () => {
    it("should fetch vendors with default pagination params", async () => {
      const mockVendors = generateMockVendors(10);
      const mockResponse = createPaginatedResponse(mockVendors, 1722, 0, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useVendors(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vendorsApi.getVendors).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          searchPattern: "test-search-pattern-123",
        }),
      );
      expect(result.current.vendors).toHaveLength(10);
      expect(result.current.count).toBe(1722);
      expect(result.current.isError).toBe(false);
    });

    it("should fetch vendors with custom limit and offset", async () => {
      const mockVendors = generateMockVendors(10);
      const mockResponse = createPaginatedResponse(mockVendors, 1722, 20, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useVendors({ limit: 10, offset: 20 }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vendorsApi.getVendors).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
          searchPattern: "test-search-pattern-123",
        }),
      );
      expect(result.current.vendors).toHaveLength(10);
    });

    it("should return exactly 10 results when limit is 10", async () => {
      const mockVendors = generateMockVendors(10);
      const mockResponse = createPaginatedResponse(mockVendors, 1722, 0, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useVendors({ limit: 10 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.vendors).toHaveLength(10);
      expect(result.current.count).toBe(1722);
    });

    it("should return next and previous URLs for pagination", async () => {
      const mockVendors = generateMockVendors(10);
      const mockResponse = createPaginatedResponse(mockVendors, 1722, 10, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useVendors({ limit: 10, offset: 10 }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.next).toContain("offset=20");
      expect(result.current.previous).toContain("offset=0");
    });

    it("should return null for previous on first page", async () => {
      const mockVendors = generateMockVendors(10);
      const mockResponse = createPaginatedResponse(mockVendors, 1722, 0, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useVendors({ limit: 10, offset: 0 }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.previous).toBeNull();
      expect(result.current.next).not.toBeNull();
    });

    it("should return null for next on last page", async () => {
      const mockVendors = generateMockVendors(2);
      const mockResponse = createPaginatedResponse(mockVendors, 1722, 1720, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useVendors({ limit: 10, offset: 1720 }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.next).toBeNull();
      expect(result.current.previous).not.toBeNull();
      expect(result.current.vendors).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("should handle fetch error", async () => {
      (vendorsApi.getVendors as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useVendors(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.vendors).toEqual([]);
      expect(result.current.count).toBe(0);
    });
  });

  describe("empty results", () => {
    it("should return empty array when no vendors exist", async () => {
      const mockResponse = createPaginatedResponse([], 0, 0, 10);
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue(mockResponse);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useVendors(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.vendors).toEqual([]);
      expect(result.current.count).toBe(0);
      expect(result.current.next).toBeNull();
      expect(result.current.previous).toBeNull();
    });
  });
});
