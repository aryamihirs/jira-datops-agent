// Core type definitions for the DataOps JIRA Agent

export type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'pending_info';
export type RequestPriority = 'highest' | 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type ConnectionType = 'jira' | 'email' | 'slack' | 'confluence' | 'file_system';

export interface Request {
  id: number;
  summary: string;
  description: string;
  status: string;
  source_tag: string;
  source_content?: any;
  acceptance_criteria?: string;
  requestor?: string;
  assignee?: string;
  business_unit?: string;
  tags?: string[];
  jira_issue_key?: string;
  released_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedFields {
  requestType?: string;
  dataSources?: string[];
  tables?: string[];
  deadline?: string;
  assignee?: string;
  labels?: string[];
  compliance?: string;
}

export interface MetricCard {
  id: string;
  label: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  sparklineData?: number[];
}

export interface ActivityItem {
  id: string;
  type: 'request_created' | 'request_approved' | 'pattern_detected' | 'connection_status';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Connection {
  id: number;
  type: ConnectionType;
  name: string;
  status: string; // 'active' | 'inactive' | 'error'
  jira_url?: string;
  jira_email?: string;
  jira_project_key?: string;
  field_config?: any;
  has_api_token?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  matchCount: number;
  accuracy: number;
  active: boolean;
  createdAt: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}
