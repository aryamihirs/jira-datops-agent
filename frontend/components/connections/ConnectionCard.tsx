import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatTimeAgo } from '@/lib/utils/helpers';
import type { Connection } from '@/lib/types';

interface ConnectionCardProps {
  connection: Connection;
  onTest?: (id: number | string) => void;
}

export function ConnectionCard({ connection, onTest }: ConnectionCardProps) {
  const getStatusBadge = () => {
    switch (connection.status) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
      default:
        return <Badge variant="warning">Disconnected</Badge>;
    }
  };

  const getIcon = () => {
    switch (connection.type) {
      case 'jira': return '📋';
      case 'email': return '📧';
      case 'slack': return '💬';
      case 'confluence': return '📚';
      case 'file_system': return '📁';
      default: return '🔗';
    }
  };

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="text-4xl">{getIcon()}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{connection.name}</h3>
              <p className="text-xs text-gray-500 capitalize">{connection.type}</p>
            </div>
            {getStatusBadge()}
          </div>

          {connection.lastSync && (
            <p className="text-xs text-gray-600 mb-3">
              Last sync: {formatTimeAgo(connection.lastSync)}
            </p>
          )}

          {connection.errorMessage && (
            <p className="text-xs text-red-600 mb-3">
              {connection.errorMessage}
            </p>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="primary"
              size="sm"
            >
              Configure
            </Button>
            <button
              onClick={() => onTest?.(connection.id)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Test connection
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
