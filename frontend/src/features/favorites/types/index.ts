import type { Vendor } from "@/features/vendors";

export interface Favorite {
  id: number;
  vendor: Vendor;
  created_at: string;
}

export interface AddFavoriteRequest {
  vendor_id: number;
}
