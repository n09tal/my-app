import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useClaimVendorMutation,
  useClaimStatus,
} from "../features/vendors/hooks/useVendors";
import { vendorsApi } from "../features/vendors/api/vendorsService";
import type {
  ClaimVendorResponse,
  ClaimStatusResponse,
} from "../features/vendors/types";

jest.mock("../features/vendors/api/vendorsService", () => ({
  vendorsApi: {
    getVendors: jest.fn(),
    getVendor: jest.fn(),
    submitClaim: jest.fn(),
    getClaimStatus: jest.fn(),
  },
}));

const mockClaimResponse: ClaimVendorResponse = {
  id: 123,
  vendor: 456,
  status: "pending",
  message: "Your claim has been submitted and is pending review.",
  created_at: "2026-01-26T12:00:00Z",
};

const mockClaimStatusPending: ClaimStatusResponse = {
  has_pending_claim: true,
  claim_id: 123,
  submitted_at: "2026-01-26T12:00:00Z",
};

const mockClaimStatusNone: ClaimStatusResponse = {
  has_pending_claim: false,
  claim_id: null,
  submitted_at: null,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  jest.spyOn(queryClient, "invalidateQueries");
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

const createMockFile = (name: string): File => {
  const blob = new Blob(["test content"], { type: "application/pdf" });
  return new File([blob], name, { type: "application/pdf" });
};

describe("useClaimVendorMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("submitting a claim", () => {
    it("should submit a claim successfully", async () => {
      (vendorsApi.submitClaim as jest.Mock).mockResolvedValue(
        mockClaimResponse,
      );

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 456, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(vendorsApi.submitClaim).toHaveBeenCalledWith(456, claimData);
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it("should submit a claim with multiple documents", async () => {
      (vendorsApi.submitClaim as jest.Mock).mockResolvedValue(
        mockClaimResponse,
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFiles = [
        createMockFile("document1.pdf"),
        createMockFile("document2.jpg"),
        createMockFile("document3.png"),
      ];
      const claimData = {
        claimant_name: "Jane Smith",
        claimant_email: "jane@example.com",
        claimant_phone: "555-5678",
        documents: mockFiles,
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 789, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(vendorsApi.submitClaim).toHaveBeenCalledWith(789, claimData);
    });

    it("should handle claim submission error", async () => {
      (vendorsApi.submitClaim as jest.Mock).mockRejectedValue(
        new Error("Failed to submit claim"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 456, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should handle 409 conflict error when vendor already claimed", async () => {
      const conflictError = {
        response: {
          status: 409,
          data: { detail: "This vendor has already been claimed." },
        },
      };
      (vendorsApi.submitClaim as jest.Mock).mockRejectedValue(conflictError);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 456, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should handle 409 conflict error when user has pending claim", async () => {
      const conflictError = {
        response: {
          status: 409,
          data: { detail: "You already have a pending claim for this vendor." },
        },
      };
      (vendorsApi.submitClaim as jest.Mock).mockRejectedValue(conflictError);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 456, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should use submitClaimAsync for async operations", async () => {
      (vendorsApi.submitClaim as jest.Mock).mockResolvedValue(
        mockClaimResponse,
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      let returnedResponse: ClaimVendorResponse | undefined;
      await act(async () => {
        returnedResponse = await result.current.submitClaimAsync({
          vendorId: 456,
          data: claimData,
        });
      });

      expect(returnedResponse).toEqual(mockClaimResponse);
    });

    it("should invalidate vendor queries on successful claim", async () => {
      (vendorsApi.submitClaim as jest.Mock).mockResolvedValue(
        mockClaimResponse,
      );

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 456, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
    });

    it("should reset mutation state", async () => {
      (vendorsApi.submitClaim as jest.Mock).mockResolvedValue(
        mockClaimResponse,
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimVendorMutation(), {
        wrapper,
      });

      const mockFile = createMockFile("document.pdf");
      const claimData = {
        claimant_name: "John Doe",
        claimant_email: "john@example.com",
        claimant_phone: "555-1234",
        documents: [mockFile],
      };

      await act(async () => {
        result.current.submitClaim({ vendorId: 456, data: claimData });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(false);
      });

      expect(result.current.isError).toBe(false);
    });
  });
});

describe("useClaimStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetching claim status", () => {
    it("should fetch claim status when user has pending claim", async () => {
      (vendorsApi.getClaimStatus as jest.Mock).mockResolvedValue(
        mockClaimStatusPending,
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimStatus(456, true), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vendorsApi.getClaimStatus).toHaveBeenCalledWith(456);
      expect(result.current.hasPendingClaim).toBe(true);
      expect(result.current.claimId).toBe(123);
      expect(result.current.submittedAt).toBe("2026-01-26T12:00:00Z");
    });

    it("should fetch claim status when user has no pending claim", async () => {
      (vendorsApi.getClaimStatus as jest.Mock).mockResolvedValue(
        mockClaimStatusNone,
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimStatus(456, true), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPendingClaim).toBe(false);
      expect(result.current.claimId).toBeNull();
      expect(result.current.submittedAt).toBeNull();
    });

    it("should not fetch claim status when disabled", async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimStatus(456, false), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vendorsApi.getClaimStatus).not.toHaveBeenCalled();
      expect(result.current.hasPendingClaim).toBe(false);
    });

    it("should handle fetch error", async () => {
      (vendorsApi.getClaimStatus as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimStatus(456, true), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.hasPendingClaim).toBe(false);
    });

    it("should handle 404 when vendor not found", async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { detail: "Vendor not found." },
        },
      };
      (vendorsApi.getClaimStatus as jest.Mock).mockRejectedValue(notFoundError);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimStatus(999, true), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should refetch claim status", async () => {
      (vendorsApi.getClaimStatus as jest.Mock).mockResolvedValue(
        mockClaimStatusNone,
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useClaimStatus(456, true), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vendorsApi.getClaimStatus).toHaveBeenCalledTimes(1);

      (vendorsApi.getClaimStatus as jest.Mock).mockResolvedValue(
        mockClaimStatusPending,
      );

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.hasPendingClaim).toBe(true);
      });

      expect(vendorsApi.getClaimStatus).toHaveBeenCalledTimes(2);
    });
  });
});
