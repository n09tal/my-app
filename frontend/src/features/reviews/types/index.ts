export interface Review {
    id: number;
    vendor: number;
    first_name: string;
    last_name: string;
    stars: number;
    description: string;
    created_at: string;
    updated_at: string;
}
  
export interface ReviewInput {
    first_name: string;
    last_name: string;
    stars: number;
    description: string;
}

export interface ReviewsQueryParams {
    vendorId: number;
    page: number;
    limit: number;
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