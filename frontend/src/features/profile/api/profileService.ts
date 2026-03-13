import api from "@/lib/api";
import type { UpdateProfileData } from "../types";

export const profileApi = {
  async getProfile() {
    const response = await api.get("/api/users/me/");
    return response.data;
  },

  async updateProfile(userId: number, data: UpdateProfileData) {
    const response = await api.put(`/api/users/${userId}/profile/`, data);
    return response.data;
  },

  async getUserProfile(userId: number) {
    const response = await api.get(`/api/users/${userId}/profile/`);
    return response.data;
  },

  async uploadDocuments(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post("/api/users/upload-docs/", formData);
    return response.data;
  },

  async updateProviderProfile(data: Record<string, unknown>) {
    const response = await api.patch(
      "/api/users/custom-provider-profile/",
      data,
    );
    return response.data;
  },
};
