import { ApiUser, UserSettings } from '@/types/api';

import { apiFetch } from './apiClient';

export async function getCurrentUser() {
  const response = await apiFetch<{ user: ApiUser }>('/api/me');
  return response.user;
}

export async function loginWithGoogleIdToken(idToken: string) {
  const response = await apiFetch<{ user: ApiUser }>('/api/auth/google', {
    method: 'POST',
    body: { idToken },
  });
  return response.user;
}

export async function loginDemo(name: string) {
  const response = await apiFetch<{ user: ApiUser }>('/api/auth/demo', {
    method: 'POST',
    body: { name },
  });
  return response.user;
}

export async function registerLocalAccount(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const response = await apiFetch<{ user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
  return response.user;
}

export async function loginLocalAccount(payload: { email: string; password: string }) {
  const response = await apiFetch<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
  return response.user;
}

export async function changeLocalPassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  await apiFetch<void>('/api/auth/password/change', {
    method: 'POST',
    body: payload,
  });
}

export async function updateCurrentUserProfile(payload: {
  name?: string;
  email?: string;
  picture?: string | null;
}) {
  const response = await apiFetch<{ user: ApiUser }>('/api/me/profile', {
    method: 'PATCH',
    body: payload,
  });
  return response.user;
}

export async function getUserSettings() {
  const response = await apiFetch<{ settings: UserSettings }>('/api/settings');
  return response.settings;
}

export async function updateUserSettings(payload: Partial<UserSettings>) {
  const response = await apiFetch<{ settings: UserSettings; user: ApiUser }>('/api/settings', {
    method: 'PATCH',
    body: payload,
  });
  return response;
}

export async function logoutSession() {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' });
}
