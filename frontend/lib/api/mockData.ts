// Minimal mock data - replace with API calls
import type { Request, MetricCard, ActivityItem, Connection } from '@/lib/types';

export const mockMetrics: MetricCard[] = [
  { id: '1', label: 'Pending Requests', value: 23, trend: 12, trendLabel: '+12% from yesterday' },
  { id: '2', label: 'Avg. Processing Time', value: '45s', trend: -25, trendLabel: '-25% improvement' },
  { id: '3', label: 'Auto-Approval Rate', value: '87%', trend: 5, trendLabel: '+5% this week' },
  { id: '4', label: 'Time Saved Today', value: '2.3h', trend: 15, trendLabel: '+15% vs last week' },
];

export const mockActivity: ActivityItem[] = [
  { id: '1', type: 'request_created', message: 'New request from finance-team@company.com', timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: '2', type: 'request_approved', message: '5 high-confidence requests auto-approved', timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: '3', type: 'pattern_detected', message: 'New pattern detected: Weekly Sales Reports', timestamp: new Date(Date.now() - 1800000).toISOString() },
];

export const mockRequests: Request[] = [
  {
    id: '1',
    title: 'Monthly Sales Data Pull for Q4 Board Meeting',
    description: 'Need sales data aggregated by region for the upcoming board presentation',
    source: 'email',
    sender: 'sarah.johnson@company.com',
    priority: 'high',
    status: 'pending',
    confidence: 92,
    confidenceLevel: 'high',
    extractedFields: {
      requestType: 'Data Pull',
      dataSources: ['Salesforce', 'Internal DB'],
      tables: ['sales_transactions', 'customer_regions'],
      deadline: '2025-11-20',
      labels: ['board-meeting', 'sales']
    },
    originalContent: 'Hi team, we need the monthly sales data...',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    hasPII: false
  },
  {
    id: '2',
    title: 'Customer Data Export - Marketing Campaign',
    description: 'Export customer email list for upcoming campaign',
    source: 'slack',
    sender: 'marketing-team',
    priority: 'medium',
    status: 'pending',
    confidence: 78,
    confidenceLevel: 'medium',
    extractedFields: {
      requestType: 'Data Export',
      tables: ['customers', 'email_preferences'],
      compliance: 'PII-Protected'
    },
    originalContent: 'Can someone pull the customer emails?',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    hasPII: true
  }
];

export const mockConnections: Connection[] = [
  { id: '1', type: 'jira', name: 'JIRA DataOps', status: 'connected', lastSync: new Date(Date.now() - 300000).toISOString() },
  { id: '2', type: 'email', name: 'dataops-requests@company.com', status: 'connected', lastSync: new Date(Date.now() - 180000).toISOString() },
  { id: '3', type: 'slack', name: '#data-requests', status: 'connected', lastSync: new Date(Date.now() - 120000).toISOString() },
];
