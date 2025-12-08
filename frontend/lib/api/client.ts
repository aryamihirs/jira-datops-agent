// API client layer
import type { Request, MetricCard, ActivityItem, Connection, Pattern, ChartDataPoint } from '@/lib/types';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Generic fetch wrapper
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }
  return response.json();
}

// API methods
export const api = {
  // Dashboard endpoints
  getDashboardMetrics: () => apiCall<MetricCard[]>('/dashboard/metrics'),
  getRecentActivity: () => apiCall<ActivityItem[]>('/dashboard/activity'),
  getRequestVolumeData: () => apiCall<ChartDataPoint[]>('/dashboard/request-volume'), // TODO: Implement backend
  getRequestTypeDistribution: () => apiCall<ChartDataPoint[]>('/dashboard/request-types'), // TODO: Implement backend
  healthCheck: () => apiCall<any>('/health'),

  // Requests endpoints
  getRequests: (filters?: { status?: string }) => {
    const query = filters?.status ? `?status=${filters.status}` : '';
    return apiCall<Request[]>(`/requests/${query}`);
  },
  getRequestById: (id: number) => apiCall<Request>(`/requests/${id}`),
  createRequest: (data: Partial<Request>) =>
    apiCall<Request>('/requests/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  approveRequest: (id: number) => apiCall<void>(`/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id: number) => apiCall<void>(`/requests/${id}/reject`, { method: 'POST' }),
  updateRequest: (id: number, updates: Partial<Request>) =>
    apiCall<Request>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
  analyzeRequest: (description: string, files?: string[], jiraSchema?: Record<string, any>) =>
    apiCall<any>('/requests/analyze', {
      method: 'POST',
      body: JSON.stringify({ description, files, jira_schema: jiraSchema })
    }),

  releaseRequests: (ids: number[]) =>
    apiCall<{ total: number; success: number; failed: number; skipped: number; details: any[] }>('/requests/release', {
      method: 'POST',
      body: JSON.stringify({ request_ids: ids })
    }),

  // Connections endpoints
  getConnections: () => apiCall<Connection[]>('/connections'),
  createConnection: (connection: Partial<Connection>) =>
    apiCall<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(connection),
    }),
  updateConnection: (id: number, connection: Partial<Connection>) =>
    apiCall<Connection>(`/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(connection),
    }),
  deleteConnection: (id: number) =>
    apiCall<void>(`/connections/${id}`, {
      method: 'DELETE',
    }),

  exportRequestsCSV: async () => {
    const response = await fetch(`${API_BASE_URL}/requests/export/csv`);
    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requests_export.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Knowledge Base Ingestion
  ingestJiraCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/knowledge/ingest/jira-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`Ingestion failed: ${response.statusText}`);
    return response.json();
  },

  ingestDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/knowledge/ingest/document`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`Ingestion failed: ${response.statusText}`);
    return response.json();
  },

  listKnowledgeBase: async () => {
    return apiCall<{ documents: any[], jira_tickets: any[], total: number }>('/knowledge/list');
  },

  deleteDocument: async (docId: string) => {
    return apiCall(`/knowledge/document/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
  },

  deleteJiraTicket: async (ticketId: string) => {
    return apiCall(`/knowledge/jira-ticket/${encodeURIComponent(ticketId)}`, {
      method: 'DELETE',
    });
  }
};

