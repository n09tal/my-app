export type CareRequestStatus = "pending" | "open" | "closed" | "urgent" | "needs_assistance";
export type CareRequestSource = "consumer" | "social_worker";

export interface NotifiedVendor {
  vendor_id: number;
  vendor_name: string;
  vendor_county: string;
  vendor_image: string | null;
  vendor_rating: number;
  notified_at: string;
}

export interface CareRequest {
  id: number;
  client_name: string;
  services: string[];
  status: CareRequestStatus;
  source: CareRequestSource;
  is_urgent: boolean;
  needs_assistance: boolean;
  is_private_pay: boolean;
  notified_vendors: NotifiedVendor[];
  selected_vendor: NotifiedVendor | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCareRequestInput {
  client_name: string;
  services: string[];
  is_urgent: boolean;
  needs_assistance: boolean;
  notes: string;
  source?: CareRequestSource;
}

export interface PaginatedCareRequestsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CareRequest[];
}
