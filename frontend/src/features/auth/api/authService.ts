import api from "@/lib/api";
import type { LoginCredentials, LoginResponse } from "../types";

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login/", credentials);

    if (
      !response.data?.access_token ||
      !response.data?.refresh_token ||
      !response.data?.user
    ) {
      console.error("[AuthAPI ERROR] Invalid response format:", response.data);
      throw new Error("Invalid server response - missing tokens");
    }

    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<string> {
    const response = await api.post<{ access: string }>(
      "/auth/token/refresh/",
      { refresh: refreshToken },
    );
    return response.data.access;
  },

  async logout(): Promise<void> {},
};
