import api from "@/lib/api";
import type {
  CareRequest,
  CreateCareRequestInput,
  PaginatedCareRequestsResponse,
} from "../types";

export const careRequestsApi = {
  async getCareRequests(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedCareRequestsResponse> {
    const searchParams = new URLSearchParams();

    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
      searchParams.set("offset", String(params.offset));
    }

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const response = await api.get<PaginatedCareRequestsResponse | CareRequest[]>(
      `/api/directory/care-requests/${suffix}`,
    );
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data,
      };
    }

    return response.data;
  },

  async getCareRequest(id: number): Promise<CareRequest> {
    const response = await api.get<CareRequest>(`/api/directory/care-requests/${id}/`);
    return response.data;
  },

  async createCareRequest(payload: CreateCareRequestInput): Promise<CareRequest> {
    const response = await api.post<CareRequest>("/api/directory/care-requests/", payload);
    return response.data;
  },
};
