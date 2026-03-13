import api from "@/lib/api";
import type {
  Vendor,
  PaginatedResponse,
  VendorSearchParams,
  UpdateVendorData,
  Service,
  FundingSource,
  County,
  ClaimVendorRequest,
  ClaimVendorResponse,
  ClaimStatusResponse,
} from "../types";

export const vendorsApi = {
  async getVendors(
    params: VendorSearchParams,
  ): Promise<PaginatedResponse<Vendor>> {
    const searchParams = new URLSearchParams();
    
    // Pagination params
    searchParams.set("limit", String(params.limit));
    searchParams.set("offset", String(params.offset));
    
    // Search filter params
    if (params.agencyName) {
      searchParams.set("agency_name", params.agencyName);
    }
    if (params.zipCode) {
      searchParams.set("zip_code", params.zipCode);
    }
    if (params.services && params.services.length > 0) {
      searchParams.set("services", params.services.join(","));
    }
    if (params.minRating) {
      searchParams.set("min_rating", params.minRating);
    }
    if (params.languages && params.languages.length > 0) {
      searchParams.set("languages", params.languages.join(","));
    }
    if (params.fundingSources && params.fundingSources.length > 0) {
      searchParams.set("funding_sources", params.fundingSources.join(","));
    }
    if (params.searchPattern) {
      searchParams.set("search_pattern", params.searchPattern);
    }

    const response = await api.get<PaginatedResponse<Vendor>>(
      `/api/directory/vendors/?${searchParams.toString()}`,
    );
    return response.data;
  },

  async getVendor(id: number): Promise<Vendor> {
    const response = await api.get(`/api/directory/vendors/${id}/`);
    return response.data;
  },

  async submitClaim(
    vendorId: number,
    data: ClaimVendorRequest,
  ): Promise<ClaimVendorResponse> {
    const formData = new FormData();
    formData.append("claimant_name", data.claimant_name);
    formData.append("claimant_email", data.claimant_email);
    formData.append("claimant_phone", data.claimant_phone);
    data.documents.forEach((file) => {
      formData.append("documents", file);
    });
    const response = await api.post(
      `/api/directory/vendors/${vendorId}/claim/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },

  async getClaimStatus(vendorId: number): Promise<ClaimStatusResponse> {
    const response = await api.get(
      `/api/directory/vendors/${vendorId}/claim/status/`,
    );
    return response.data;
  },

  async updateVendor(id: number, data: UpdateVendorData): Promise<Vendor> {
    const response = await api.patch(`/api/directory/vendors/${id}/`, data);
    return response.data;
  },

  async getMyVendors(): Promise<Vendor[]> {
    const response = await api.get<Vendor[]>(`/api/directory/vendors/mine/`);
    return response.data;
  },

  async getServices(): Promise<Service[]> {
    const response = await api.get<Service[]>(`/api/directory/services/`);
    return response.data;
  },

  async getFundingSources(): Promise<FundingSource[]> {
    const response = await api.get<FundingSource[]>(`/api/directory/funding-sources/`);
    return response.data;
  },

  async getCounties(): Promise<County[]> {
    const response = await api.get<County[]>(`/api/directory/counties/`);
    return response.data;
  },
};