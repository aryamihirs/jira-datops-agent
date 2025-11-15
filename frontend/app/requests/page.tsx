'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { mockRequests } from '@/lib/api/mockData';
import { formatTimeAgo, getConfidenceColor, getPriorityColor } from '@/lib/utils/helpers';
import type { Request } from '@/lib/types';

export default function RequestsPage() {
  // TODO: Replace with API call - const requests = await api.getRequests();
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleApprove = (id: string) => {
    // TODO: Call API - await api.approveRequest(id);
    console.log('Approving request:', id);
    setRequests(requests.filter(r => r.id !== id));
  };

  const handleReject = (id: string) => {
    // TODO: Call API - await api.rejectRequest(id);
    console.log('Rejecting request:', id);
    setRequests(requests.filter(r => r.id !== id));
  };

  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.confidenceLevel === filter;
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.sender.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Request Queue</h1>
          <p className="text-sm text-gray-600 mt-1">
            {requests.length} pending requests waiting for review
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:w-80"
            />
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'high' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('high')}
              >
                High Confidence
              </Button>
              <Button
                variant={filter === 'medium' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('medium')}
              >
                Medium
              </Button>
              <Button
                variant={filter === 'low' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('low')}
              >
                Low
              </Button>
            </div>
          </div>
        </div>

        {/* Request Table */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No requests found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tables
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-start">
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {request.title}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {request.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{request.sender}</div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="info" className="text-xs">{request.source}</Badge>
                          {request.hasPII && <Badge variant="error" className="text-xs">PHI</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900">
                          {request.extractedFields?.requestType || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {request.extractedFields?.tables?.join(', ') || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={getConfidenceColor(request.confidenceLevel)}>
                          {request.confidence}%
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatTimeAgo(request.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReject(request.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
