import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatTimeAgo, getConfidenceColor, getPriorityColor } from '@/lib/utils/helpers';
import type { Request } from '@/lib/types';

interface RequestCardProps {
  request: Request;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function RequestCard({ request, onApprove, onReject }: RequestCardProps) {
  const confidenceClass = getConfidenceColor(request.confidenceLevel);
  const priorityClass = getPriorityColor(request.priority);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{request.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>From: {request.sender}</span>
            <span>•</span>
            <span>{formatTimeAgo(request.createdAt)}</span>
          </div>
        </div>
        <Badge className={confidenceClass}>
          {request.confidence}% confident
        </Badge>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge className={priorityClass}>
          {request.priority}
        </Badge>
        <Badge variant="info">{request.source}</Badge>
        {request.hasPII && (
          <Badge variant="error">PHI Detected</Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {request.description}
      </p>

      {/* Extracted Fields */}
      {request.extractedFields && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-xs space-y-1">
          {request.extractedFields.requestType && (
            <div><span className="font-medium">Type:</span> {request.extractedFields.requestType}</div>
          )}
          {request.extractedFields.tables && request.extractedFields.tables.length > 0 && (
            <div><span className="font-medium">Tables:</span> {request.extractedFields.tables.join(', ')}</div>
          )}
          {request.extractedFields.deadline && (
            <div><span className="font-medium">Deadline:</span> {request.extractedFields.deadline}</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onApprove?.(request.id)}
          className="flex-1"
        >
          Approve & Create
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onReject?.(request.id)}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
}
