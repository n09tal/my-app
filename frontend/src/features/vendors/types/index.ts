export interface County {
  id: number;
  name: string;
}

export interface Service {
  id: number;
  name: string;
}

export interface FundingSource {
  id: number;
  name: string;
}

export interface Vendor {
  id: number;
  legal_name: string;
  dba: string;
  display_name: string;
  vendor_type: string;
  primary_county: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  funding_sources: FundingSource[];
  verified: boolean;
  availability: string;
  description: string;
  languages: string[];
  image: string;
  is_favorite: boolean;
  counties: County[];
  services: Service[];
  rating?: number;
  review_count?: number;
  claim_status: "pending" | "claimed" | null;
  claimed_by: number | null;
}

export interface ClaimVendorRequest {
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string;
  documents: File[];
}

export interface ClaimVendorResponse {
  id: number;
  vendor: number;
  status: string;
  message: string;
  created_at: string;
}

export interface ClaimStatusResponse {
  has_pending_claim: boolean;
  claim_id: number | null;
  submitted_at: string | null;
}

export interface UpdateVendorData {
  display_name?: string;
  availability?: string;
  primary_county?: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  languages?: string[];
  services?: number[];
  funding_sources?: number[];
  counties?: number[];
  website?: string;
  image?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface VendorSearchParams extends PaginationParams {
  agencyName?: string;
  zipCode?: string;
  services?: string[];
  minRating?: string;
  languages?: string[];
  fundingSources?: string[];
  searchPattern?: string;
}