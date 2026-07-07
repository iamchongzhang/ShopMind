import apiClient from './client';
import type { ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse, User } from '../types/auth';

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await apiClient.post<TokenResponse>('/auth/register', data);
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await apiClient.get<User>('/auth/me');
  return res.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await apiClient.put('/auth/change-password', data);
}
