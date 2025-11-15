'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { mockMetrics, mockActivity } from '@/lib/api/mockData';

export default function DashboardPage() {
  // TODO: Replace with API call - const metrics = await api.getDashboardMetrics();
  const metrics = mockMetrics;
  const activities = mockActivity;

  return (
    <MainLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Overview of your request processing</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Activity and Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed activities={activities} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors">
                Review pending requests →
              </button>
              <button className="w-full text-left px-4 py-3 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">
                Configure connections →
              </button>
              <button className="w-full text-left px-4 py-3 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">
                View patterns →
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
