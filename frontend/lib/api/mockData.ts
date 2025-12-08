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


