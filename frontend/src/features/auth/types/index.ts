export interface TwoFactorStatus {
  otp_2fa_enabled: boolean;
  qr_2fa_enabled: boolean;
}

export interface LoginParams extends LoginCredentials {
  redirectTo?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface User {
  id: number;
  email: string;
  account: number;
  user_profile: UserProfile;
  group: "Provider" | "Agency" | "Requestor" | "SocialWorker";
  twofactor: TwoFactorStatus;
}
