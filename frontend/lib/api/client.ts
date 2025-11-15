// API client layer - designed for easy replacement with real API calls

import type { Request, MetricCard, ActivityItem, Connection, Pattern, ChartDataPoint } from '@/lib/types';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Generic fetch wrapper
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // TODO: Replace with actual API call
  // const response = await fetch(`${API_BASE_URL}${endpoint}`, {
  //   ...options,
  //   headers: {
  //     'Content-Type': 'application/json',
  //     ...options?.headers,
  //   },
  // });
  // if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  // return response.json();

  // For now, return mock data based on endpoint
  return getMockData(endpoint) as T;
}

// API methods
export const api = {
  // Dashboard endpoints
  getDashboardMetrics: () => apiCall<MetricCard[]>('/dashboard/metrics'),
  getRecentActivity: () => apiCall<ActivityItem[]>('/dashboard/activity'),
  getRequestVolumeData: () => apiCall<ChartDataPoint[]>('/dashboard/request-volume'),
  getRequestTypeDistribution: () => apiCall<ChartDataPoint[]>('/dashboard/request-types'),

  // Requests endpoints
  getRequests: (filters?: { status?: string; confidence?: string }) =>
    apiCall<Request[]>('/requests', {
      method: 'GET',
      // TODO: Add query params: `?${new URLSearchParams(filters)}`
    }),
  getRequestById: (id: string) => apiCall<Request>(`/requests/${id}`),
  approveRequest: (id: string) => apiCall<void>(`/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id: string) => apiCall<void>(`/requests/${id}/reject`, { method: 'POST' }),
  bulkApprove: (ids: string[]) => apiCall<void>('/requests/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }),
  updateRequest: (id: string, updates: Partial<Request>) =>
    apiCall<Request>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  // Connections endpoints
  getConnections: () => apiCall<Connection[]>('/connections'),
  testConnection: (id: string) => apiCall<{ success: boolean }>(`/connections/${id}/test`),
  updateConnection: (id: string, config: Record<string, any>) =>
    apiCall<Connection>(`/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(config)
    }),

  // Patterns endpoints
  getPatterns: () => apiCall<Pattern[]>('/patterns'),
  createPattern: (pattern: Partial<Pattern>) =>
    apiCall<Pattern>('/patterns', {
      method: 'POST',
      body: JSON.stringify(pattern)
    }),
};

// Mock data function (to be replaced with real API)
function getMockData(endpoint: string): any {
  // Return empty arrays/objects by default
  // Real data will come from the components
  if (endpoint.includes('/metrics')) return [];
  if (endpoint.includes('/activity')) return [];
  if (endpoint.includes('/requests')) return [];
  if (endpoint.includes('/connections')) return [];
  if (endpoint.includes('/patterns')) return [];
  return null;
}
