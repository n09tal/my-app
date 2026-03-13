import api from "@/lib/api";
import type {
  DirectoryUser,
  RegisterDirectoryUserRequest,
  UpdateDirectoryUserRequest,
} from "@/types";

export const directoryUserApi = {
  async register(data: RegisterDirectoryUserRequest): Promise<DirectoryUser> {
    const response = await api.post<DirectoryUser>(
      "/api/directory/users/register/",
      data
    );
    return response.data;
  },

  async getCurrentUser(): Promise<DirectoryUser> {
    const response = await api.get<DirectoryUser>("/api/directory/users/me/");
    return response.data;
  },

  async updateCurrentUser(
    data: UpdateDirectoryUserRequest
  ): Promise<DirectoryUser> {
    const response = await api.put<DirectoryUser>(
      "/api/directory/users/me/",
      data
    );
    return response.data;
  },

  async deactivateAccount(): Promise<void> {
    await api.delete("/api/directory/users/me/");
  }
};