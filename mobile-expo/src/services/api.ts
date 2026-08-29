import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL, API_ORIGIN } from '../config';
import type {
  AppUser,
  Complaint,
  ComplaintStatus,
  PhotoAsset,
} from '../types';

const TOKEN_KEY = 'nwsdb_officer_token';

export class ApiError extends Error {
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  readonly status?: number;
}

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String(data.message)
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The NWSDB server did not respond in time.');
    }
    throw new Error(
      'Cannot reach the NWSDB server. Check the API address, Wi-Fi, and PC firewall.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  async hasSession(): Promise<boolean> {
    return (await SecureStore.getItemAsync(TOKEN_KEY)) !== null;
  },

  async login(email: string, password: string): Promise<AppUser> {
    const response = await request<{ token: string; user: AppUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.user.role !== 'OFFICER') {
      throw new ApiError('Use a field-officer account in this application.', 403);
    }
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    return response.user;
  },

  async me(): Promise<AppUser> {
    const response = await request<{ user: AppUser }>('/auth/me');
    return response.user;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async listComplaints(status?: ComplaintStatus): Promise<Complaint[]> {
    const params = new URLSearchParams({ limit: '100' });
    if (status) params.set('status', status);
    const response = await request<{ complaints: Complaint[] }>(
      `/complaints?${params.toString()}`,
    );
    return response.complaints;
  },

  async getComplaint(id: string): Promise<Complaint> {
    const response = await request<{ complaint: Complaint }>(`/complaints/${id}`);
    return response.complaint;
  },

  async uploadResolutionPhoto(complaintId: string, photo: PhotoAsset): Promise<void> {
    const form = new FormData();
    form.append('type', 'resolution');
    form.append(
      'photo',
      {
        uri: photo.uri,
        name: photo.fileName,
        type: photo.mimeType,
      } as unknown as Blob,
    );

    await request(`/complaints/${complaintId}/photos`, {
      method: 'POST',
      body: form,
      timeoutMs: 30000,
    });
  },

  async updateStatus(
    complaintId: string,
    status: ComplaintStatus,
    notes: string,
  ): Promise<void> {
    await request(`/complaints/${complaintId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  absolutePhotoUrl(value: string): string {
    return /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${value}`;
  },
};

