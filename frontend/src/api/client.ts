/**
 * Lightweight native Fetch client for Sagara Mission Control.
 * Connects exclusively to the Mission Control backend API.
 * Never connects directly to Hermes or VPS runtime directly.
 */

export interface ApiClientConfig {
  baseUrl?: string;
  credentials?: RequestCredentials;
}

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data: unknown;

  constructor(status: number, statusText: string, data: unknown) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export class ApiClient {
  private baseUrl: string;
  private defaultCredentials?: RequestCredentials;

  constructor(config?: ApiClientConfig) {
    const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MISSION_CONTROL_API_URL) ||
      (typeof process !== 'undefined' && process.env?.VITE_MISSION_CONTROL_API_URL);
    this.baseUrl = (config?.baseUrl || envUrl || 'http://localhost:8000').replace(/\/+$/, '');
    this.defaultCredentials = config?.credentials;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, body, headers, credentials, signal, ...rest } = options;

    let url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const requestHeaders: HeadersInit = {
      'Accept': 'application/json',
      ...headers,
    };

    let serializedBody: BodyInit | undefined;
    if (body !== undefined) {
      if (body instanceof FormData || body instanceof Blob) {
        serializedBody = body;
      } else {
        (requestHeaders as Record<string, string>)['Content-Type'] = 'application/json';
        serializedBody = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, {
        ...rest,
        headers: requestHeaders,
        body: serializedBody,
        credentials: credentials || this.defaultCredentials,
        signal,
      });

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        throw new ApiError(response.status, response.statusText, errorData);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      throw new ApiError(0, 'Network / Connection Failed', {
        originalError: err instanceof Error ? err.message : String(err),
      });
    }
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
