'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RequestModal } from '@/components/requests/RequestModal';
import { api } from '@/lib/api/client';
import { Request } from '@/lib/types';
import { PlusIcon, FunnelIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isReleasing, setIsReleasing] = useState(false);

  // Computed state for release button eligibility
  const selectedRequests = requests.filter(r => selectedIds.includes(r.id));
  const canRelease = selectedRequests.length > 0 && selectedRequests.every(r => r.status === 'Approved' && !r.jira_issue_key);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await api.getRequests(filterStatus ? { status: filterStatus } : undefined);
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    setSelectedIds([]); // Reset selection on filter change
  }, [filterStatus]);

  const handleRowClick = (request: Request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const toggleSelection = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(requests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleRelease = async () => {
    if (!canRelease) return;

    if (!confirm(`Are you sure you want to release ${selectedIds.length} request(s) to JIRA?`)) return;

    setIsReleasing(true);
    try {
      const result = await api.releaseRequests(selectedIds);
      alert(`Release Complete!\nSuccess: ${result.success}\nFailed: ${result.failed}\nSkipped: ${result.skipped}`);
      fetchRequests();
      setSelectedIds([]);
    } catch (error) {
      console.error('Release failed', error);
      alert('Failed to release requests to JIRA.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.exportRequestsCSV();
    } catch (error) {
      console.error('Failed to export CSV', error);
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage and review incoming JIRA requests from various channels.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
            <button
              type="button"
              onClick={handleRelease}
              disabled={!canRelease || isReleasing}
              className={`inline-flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${canRelease
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {canRelease ? (
                <LockOpenIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              ) : (
                <LockClosedIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              )}
              {isReleasing ? 'Releasing...' : 'Release to JIRA'}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="block rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              id="new-request-btn"
              onClick={() => {
                setSelectedRequest(null);
                setIsModalOpen(true);
              }}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <PlusIcon className="h-5 w-5 inline-block mr-1" />
              New Request
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">All Statuses</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Released">Released</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                        <input
                          type="checkbox"
                          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          checked={requests.length > 0 && selectedIds.length === requests.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Summary
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Source
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Requestor
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created At
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4">Loading...</td>
                      </tr>
                    ) : requests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-gray-500">No requests found</td>
                      </tr>
                    ) : (
                      requests.map((request) => {
                        const isReleased = !!request.jira_issue_key;
                        const rowClass = isReleased
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                          : 'hover:bg-gray-50 cursor-pointer';

                        return (
                          <tr
                            key={request.id}
                            className={rowClass}
                            onClick={() => !isReleased && handleRowClick(request)}
                          >
                            <td className="relative px-7 sm:w-12 sm:px-6">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                checked={selectedIds.includes(request.id)}
                                onClick={(e) => toggleSelection(e, request.id)}
                                disabled={isReleased}
                              />
                            </td>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
                              {request.summary}
                              {isReleased && <span className="ml-2 text-xs text-gray-400">({request.jira_issue_key})</span>}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${request.status === 'Approved' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                request.status === 'Rejected' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                  request.status === 'Released' ? 'bg-gray-100 text-gray-600 ring-gray-400/20' :
                                    'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                }`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">{request.source_tag}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">{request.requestor || '-'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {new Date(request.created_at).toLocaleDateString()}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              {!isReleased ? (
                                <button className="text-indigo-600 hover:text-indigo-900" onClick={(e) => { e.stopPropagation(); handleRowClick(request); }}>
                                  View<span className="sr-only">, {request.summary}</span>
                                </button>
                              ) : (
                                <span className="text-gray-400">View</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <RequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          request={selectedRequest}
          onUpdate={fetchRequests}
        />
      </div>
    </MainLayout>
  );
}
