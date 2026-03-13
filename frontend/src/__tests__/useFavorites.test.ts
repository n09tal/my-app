import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFavorites } from "../features/favorites/hooks/useFavorites";
import {
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useToggleFavoriteMutation,
} from "../features/favorites/hooks/useFavoriteMutations";
import { favoritesApi } from "../features/favorites/api/favoritesService";
import type { Favorite } from "../features/favorites/types";
import type { Vendor } from "../features/vendors/types";

jest.mock("../features/favorites/api/favoritesService", () => ({
  favoritesApi: {
    getFavorites: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
  },
}));

jest.mock("../features/auth/store/authStore", () => ({
  useAuthStore: jest.fn((selector) =>
    selector({
      isAuthenticated: true,
    }),
  ),
}));

const mockVendor: Vendor = {
  id: 1,
  legal_name: "Test Vendor LLC",
  dba: "Test Vendor",
  display_name: "Test Vendor",
  vendor_type: "Provider",
  primary_county: "Test County",
  contact_phone: "555-1234",
  verified: true,
  availability: "Available",
  description: "Test description",
  languages: ["English"],
  image: "test.jpg",
  is_favorite: true,
  counties: [{ id: 1, name: "Test County" }],
  services: [{ id: 1, name: "Test Service" }],
  rating: 4.5,
  reviews: 10,
  claim_status: null,
  claimed_by: null,
};

const mockFavorite: Favorite = {
  id: 1,
  vendor: mockVendor,
  created_at: "2024-01-15T00:00:00Z",
};

const mockFavorites: Favorite[] = [
  mockFavorite,
  {
    id: 2,
    vendor: { ...mockVendor, id: 2, display_name: "Test Vendor 2" },
    created_at: "2024-01-16T00:00:00Z",
  },
];

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

describe("useFavorites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetching favorites", () => {
    it("should fetch favorites successfully when authenticated", async () => {
      (favoritesApi.getFavorites as jest.Mock).mockResolvedValue(mockFavorites);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFavorites(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(favoritesApi.getFavorites).toHaveBeenCalledTimes(1);
      expect(result.current.favorites).toEqual(mockFavorites);
      expect(result.current.isError).toBe(false);
    });

    it("should return empty array when no favorites exist", async () => {
      (favoritesApi.getFavorites as jest.Mock).mockResolvedValue([]);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.favorites).toEqual([]);
    });

    it("should handle fetch error", async () => {
      (favoritesApi.getFavorites as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useFavorites(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});

describe("useAddFavoriteMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("adding favorites", () => {
    it("should add a favorite successfully", async () => {
      (favoritesApi.addFavorite as jest.Mock).mockResolvedValue(mockFavorite);

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useAddFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.addFavorite(1);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(favoritesApi.addFavorite).toHaveBeenCalledWith({ vendor_id: 1 });
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it("should handle add favorite error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (favoritesApi.addFavorite as jest.Mock).mockRejectedValue(
        new Error("Failed to add favorite"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAddFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.addFavorite(1);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      consoleErrorSpy.mockRestore();
    });

    it("should use addFavoriteAsync for async operations", async () => {
      (favoritesApi.addFavorite as jest.Mock).mockResolvedValue(mockFavorite);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useAddFavoriteMutation(), {
        wrapper,
      });

      let returnedFavorite: Favorite | undefined;
      await act(async () => {
        returnedFavorite = await result.current.addFavoriteAsync(1);
      });

      expect(returnedFavorite).toEqual(mockFavorite);
    });
  });
});

describe("useRemoveFavoriteMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("removing favorites", () => {
    it("should remove a favorite successfully", async () => {
      (favoritesApi.removeFavorite as jest.Mock).mockResolvedValue(undefined);

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useRemoveFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.removeFavorite(1);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(favoritesApi.removeFavorite).toHaveBeenCalledWith(1);
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it("should handle remove favorite error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (favoritesApi.removeFavorite as jest.Mock).mockRejectedValue(
        new Error("Failed to remove favorite"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRemoveFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.removeFavorite(1);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      consoleErrorSpy.mockRestore();
    });

    it("should use removeFavoriteAsync for async operations", async () => {
      (favoritesApi.removeFavorite as jest.Mock).mockResolvedValue(undefined);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useRemoveFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        await result.current.removeFavoriteAsync(1);
      });

      expect(favoritesApi.removeFavorite).toHaveBeenCalledWith(1);
    });
  });
});

describe("useToggleFavoriteMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("toggling favorites", () => {
    it("should add favorite when isFavorite is false", async () => {
      (favoritesApi.addFavorite as jest.Mock).mockResolvedValue(mockFavorite);

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useToggleFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.toggleFavorite({ vendorId: 1, isFavorite: false });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(favoritesApi.addFavorite).toHaveBeenCalledWith({ vendor_id: 1 });
      expect(favoritesApi.removeFavorite).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it("should remove favorite when isFavorite is true", async () => {
      (favoritesApi.removeFavorite as jest.Mock).mockResolvedValue(undefined);

      const { wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => useToggleFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.toggleFavorite({ vendorId: 1, isFavorite: true });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(favoritesApi.removeFavorite).toHaveBeenCalledWith(1);
      expect(favoritesApi.addFavorite).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).toHaveBeenCalled();
    });

    it("should handle toggle favorite error when adding", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (favoritesApi.addFavorite as jest.Mock).mockRejectedValue(
        new Error("Failed to add"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useToggleFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.toggleFavorite({ vendorId: 1, isFavorite: false });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle toggle favorite error when removing", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (favoritesApi.removeFavorite as jest.Mock).mockRejectedValue(
        new Error("Failed to remove"),
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useToggleFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        result.current.toggleFavorite({ vendorId: 1, isFavorite: true });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      consoleErrorSpy.mockRestore();
    });

    it("should use toggleFavoriteAsync for async operations", async () => {
      (favoritesApi.addFavorite as jest.Mock).mockResolvedValue(mockFavorite);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useToggleFavoriteMutation(), {
        wrapper,
      });

      await act(async () => {
        await result.current.toggleFavoriteAsync({
          vendorId: 1,
          isFavorite: false,
        });
      });

      expect(favoritesApi.addFavorite).toHaveBeenCalledWith({ vendor_id: 1 });
    });
  });
});
