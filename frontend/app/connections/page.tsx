'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { Button } from '@/components/ui/Button';
import { mockConnections } from '@/lib/api/mockData';
import type { Connection } from '@/lib/types';

export default function ConnectionsPage() {
  // TODO: Replace with API call - const connections = await api.getConnections();
  const [connections, setConnections] = useState<Connection[]>(mockConnections);

  const handleTest = async (id: string) => {
    // TODO: Call API - await api.testConnection(id);
    console.log('Testing connection:', id);
    // Simulate test result
    alert('Connection test successful!');
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
            <p className="text-sm text-gray-600 mt-1">
              {connectedCount} of {connections.length} connections active
            </p>
          </div>
          <Button variant="primary">
            + Add Connection
          </Button>
        </div>

        {/* Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onTest={handleTest}
            />
          ))}
        </div>

        {/* Empty State */}
        {connections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No connections configured</p>
            <Button variant="primary">
              Add Your First Connection
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
