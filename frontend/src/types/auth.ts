export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  email: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}
