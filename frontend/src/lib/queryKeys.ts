import type { VendorSearchParams } from "@/features/vendors/types";

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    user: () => [...queryKeys.auth.all, "user"] as const,
  },

  profile: {
    all: ["profile"] as const,
    current: () => [...queryKeys.profile.all, "current"] as const,
    byId: (userId: number) => [...queryKeys.profile.all, userId] as const,
  },

  vendors: {
    all: ["vendors"] as const,
    list: (filters?: Partial<VendorSearchParams>) =>
      [...queryKeys.vendors.all, "list", filters] as const,
    detail: (id: number) => [...queryKeys.vendors.all, "detail", id] as const,
    mine: () => [...queryKeys.vendors.all, "mine"] as const,
    counties: () => [...queryKeys.vendors.all, "counties"] as const,
  },

  services: {
    all: ["services"] as const,
    list: () => [...queryKeys.services.all, "list"] as const,
  },

  fundingSources: {
    all: ["fundingSources"] as const,
    list: () => [...queryKeys.fundingSources.all, "list"] as const,
  },

  reviews: {
    all: ["reviews"] as const,
    list: (vendorId: number, filters?: { limit: number; offset: number }) =>
      [...queryKeys.reviews.all, "list", vendorId, filters] as const,
    detail: (vendorId: number, reviewId: number) => [...queryKeys.reviews.all, "detail", vendorId, reviewId] as const,
  },

  favorites: {
    all: ["favorites"] as const,
    list: () => [...queryKeys.favorites.all, "list"] as const,
  },

  claims: {
    all: ["claims"] as const,
    status: (vendorId: number) =>
      [...queryKeys.claims.all, "status", vendorId] as const,
  },

  careRequests: {
    all: ["careRequests"] as const,
    list: (params?: { limit?: number; offset?: number }) =>
      [...queryKeys.careRequests.all, "list", params] as const,
    detail: (id: number) => [...queryKeys.careRequests.all, "detail", id] as const,
  },
} as const;