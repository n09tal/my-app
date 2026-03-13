import api from "@/lib/api";
import type { Favorite, AddFavoriteRequest } from "../types";

export const favoritesApi = {
  async getFavorites(): Promise<Favorite[]> {
    const response = await api.get("/api/directory/favorites/");
    return response.data;
  },

  async addFavorite(data: AddFavoriteRequest): Promise<Favorite> {
    const response = await api.post("/api/directory/favorites/", data);
    return response.data;
  },

  async removeFavorite(vendorId: number): Promise<void> {
    await api.delete(`/api/directory/favorites/${vendorId}/`);
  },
};
