// Utility helper functions

import type { ConfidenceLevel, RequestPriority } from '@/lib/types';

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-amber-600 bg-amber-50';
    case 'low': return 'text-red-600 bg-red-50';
  }
}

export function getPriorityColor(priority: RequestPriority): string {
  switch (priority) {
    case 'highest': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function formatTimeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
