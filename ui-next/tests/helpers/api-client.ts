/**
 * API Client Helper
 * Provides typed HTTP methods with automatic token injection
 */
import { APIRequestContext } from '@playwright/test';
import * as fs from 'fs';

export class ApiClient {
  private request: APIRequestContext;
  private baseURL: string;

  constructor(request: APIRequestContext, baseURL: string) {
    this.request = request;
    this.baseURL = baseURL;
  }

  private async getToken(): Promise<string | null> {
    try {
      const authStoragePath = 'tests/.auth/user.json';
      if (fs.existsSync(authStoragePath)) {
        const authData = JSON.parse(fs.readFileSync(authStoragePath, 'utf-8'));
        return authData.sessionToken || null;
      }
    } catch (error) {
      console.warn('Warning: Could not read auth token', error);
    }
    return null;
  }

  private async getTokenCookieName(): Promise<string> {
    try {
      const authStoragePath = 'tests/.auth/user.json';
      if (fs.existsSync(authStoragePath)) {
        const authData = JSON.parse(fs.readFileSync(authStoragePath, 'utf-8')) as {
          sessionCookieName?: string;
        };
        if (authData.sessionCookieName) {
          return authData.sessionCookieName;
        }
      }
    } catch {
      // Ignore and fallback to default cookie name.
    }

    return 'authjs.session-token';
  }

  private async getHeaders(additionalHeaders?: Record<string, string>) {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (token) {
      const cookieName = await this.getTokenCookieName();
      headers['Cookie'] = `${cookieName}=${token}`;
    }

    return headers;
  }

  private static isAuthEndpoint(endpoint: string): boolean {
    return endpoint.startsWith('/api/auth/');
  }

  private async parseResponse<T>(response: { text: () => Promise<string> }): Promise<T> {
    const raw = await response.text();
    if (!raw) return {} as T;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  private static isAuthCallbackEndpoint(endpoint: string): boolean {
    return endpoint.includes('/api/auth/callback/credentials');
  }

  async get<T = any>(endpoint: string): Promise<{ ok: boolean; data: T; status: number; error?: string }> {
    try {
      const headers = ApiClient.isAuthEndpoint(endpoint) ? { 'Content-Type': 'application/json' } : await this.getHeaders();
      const response = await this.request.get(`${this.baseURL}${endpoint}`, { headers });
      const data = await this.parseResponse<T>(response);
      return { ok: response.ok(), data, status: response.status() };
    } catch (error) {
      return { ok: false, data: {} as T, status: 0, error: String(error) };
    }
  }

  async post<T = any>(endpoint: string, body?: any): Promise<{ ok: boolean; data: T; status: number; error?: string }> {
    try {
      const isAuthCallback = ApiClient.isAuthCallbackEndpoint(endpoint);
      const headers = ApiClient.isAuthEndpoint(endpoint)
        ? (isAuthCallback
            ? { 'Content-Type': 'application/x-www-form-urlencoded' }
            : { 'Content-Type': 'application/json' })
        : await this.getHeaders(
            isAuthCallback ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
          );
      const response = await this.request.post(`${this.baseURL}${endpoint}`, {
        headers,
        ...(isAuthCallback ? { form: body } : { data: body }),
      });
      const data = await this.parseResponse<T>(response);
      return { ok: response.ok(), data, status: response.status() };
    } catch (error) {
      return { ok: false, data: {} as T, status: 0, error: String(error) };
    }
  }

  async put<T = any>(endpoint: string, body?: any): Promise<{ ok: boolean; data: T; status: number; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await this.request.put(`${this.baseURL}${endpoint}`, { headers, data: body });
      const data = await this.parseResponse<T>(response);
      return { ok: response.ok(), data, status: response.status() };
    } catch (error) {
      return { ok: false, data: {} as T, status: 0, error: String(error) };
    }
  }

  async delete<T = any>(endpoint: string): Promise<{ ok: boolean; data: T; status: number; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await this.request.delete(`${this.baseURL}${endpoint}`, { headers });
      const data = await this.parseResponse<T>(response);
      return { ok: response.ok(), data, status: response.status() };
    } catch (error) {
      return { ok: false, data: {} as T, status: 0, error: String(error) };
    }
  }
}
