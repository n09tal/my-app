// Directory User Profile
export interface DirectoryUserProfile {
    first_name: string;
    last_name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  }
  
  // Directory User
  export interface DirectoryUser {
    id: number;
    email: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    user_profile: DirectoryUserProfile;
  }
  
  // Registration Request
  export interface RegisterDirectoryUserRequest {
    email: string;
    password: string;
    user_profile: {
      first_name: string;
      last_name: string;
      phone?: string;
    };
  }
  
  // Update Request
  export interface UpdateDirectoryUserRequest {
    user_profile: Partial<DirectoryUserProfile>;
  }
  
  // API Error Response
  export interface DirectoryUserApiError {
    email?: string[];
    password?: string[];
    user_profile?: {
      first_name?: string[];
      last_name?: string[];
      phone?: string[];
      address?: string[];
      city?: string[];
      state?: string[];
      zip?: string[];
    };
    error?: string;
  }