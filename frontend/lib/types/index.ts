// Core type definitions for the DataOps JIRA Agent

export type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'pending_info';
export type RequestPriority = 'highest' | 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type ConnectionType = 'jira' | 'email' | 'slack' | 'confluence' | 'file_system';

export interface Request {
  id: string;
  title: string;
  description: string;
  source: string;
  sender: string;
  priority: RequestPriority;
  status: RequestStatus;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  extractedFields: ExtractedFields;
  originalContent: string;
  createdAt: string;
  hasPII: boolean;
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
  id: string;
  type: ConnectionType;
  name: string;
  status: ConnectionStatus;
  lastSync?: string;
  config?: Record<string, any>;
  errorMessage?: string;
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
