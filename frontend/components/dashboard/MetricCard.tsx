import { Card } from '@/components/ui/Card';
import type { MetricCard as MetricCardType } from '@/lib/types';

interface MetricCardProps {
  metric: MetricCardType;
}

export function MetricCard({ metric }: MetricCardProps) {
  const isPositive = metric.trend >= 0;

  return (
    <Card>
      <div className="space-y-2">
        <p className="text-sm text-gray-600">{metric.label}</p>
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
          <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span>{isPositive ? '↑' : '↓'}</span>
            <span className="ml-1">{Math.abs(metric.trend)}%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">{metric.trendLabel}</p>
      </div>
    </Card>
  );
}
