'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { MetricCard } from '@/lib/types';

export function SystemStatus() {
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            // Check API Health
            try {
                await api.healthCheck();
                setIsOnline(true);
            } catch (error) {
                console.error('API Health check failed', error);
                setIsOnline(false);
            }

            // Fetch Pending Count (only if online)
            try {
                const metrics = await api.getDashboardMetrics();
                const pendingMetric = metrics.find(m => m.id === 'pending');
                if (pendingMetric) {
                    setPendingCount(Number(pendingMetric.value));
                }
            } catch (error) {
                // If metrics fail but health check passed, we might still be 'online' but with DB issues?
                // For now, let's keep it simple: any failure to get metrics doesn't necessarily mean offline
                // unless health check also failed. But the current UI ties them. 
                // Let's rely on healthCheck for isOnline.
                console.error('Failed to fetch metrics', error);
            }
        };

        fetchStatus();
        // Poll every 30 seconds
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Status</div>
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>

            <div className="space-y-3">
                {/* Pending Requests */}
                <div className="group flex items-center justify-between p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200 cursor-default">
                    <div className="flex items-center space-x-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span className="text-xs text-gray-600 font-medium">Pending Review</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pendingCount && pendingCount > 0
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                        }`}>
                        {pendingCount !== null ? pendingCount : '-'}
                    </span>
                </div>

                {/* System Health */}
                <div className="group flex items-center justify-between p-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200 cursor-default">
                    <div className="flex items-center space-x-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-gray-600 font-medium">Backend API</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOnline
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
        </div>
    );
}
