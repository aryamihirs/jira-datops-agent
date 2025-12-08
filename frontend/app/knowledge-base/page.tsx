'use client';

import { useState, useEffect, Fragment } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Tab, Dialog, Transition } from '@headlessui/react';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function KnowledgeBasePage() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [jiraTickets, setJiraTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [viewModal, setViewModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });

    const loadKnowledgeBase = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/knowledge/list`);
            const data = await response.json();

            const docs = data.items.filter((item: any) => item.file_type === 'document');
            const tickets = data.items.filter((item: any) => item.file_type === 'jira_ticket');

            setDocuments(docs);
            setJiraTickets(tickets);
        } catch (error) {
            console.error('Failed to load knowledge base', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadKnowledgeBase();
    }, []);

    const handleDelete = async (fileType: string, id: string) => {
        if (!confirm(`Are you sure you want to delete ${id}?`)) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/knowledge/item/${fileType}/${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Delete failed');

            setUploadStatus(`Successfully deleted ${id}`);
            loadKnowledgeBase();
        } catch (error) {
            setUploadStatus(`Failed to delete ${id}`);
            console.error(error);
        }
    };

    const handleView = async (fileType: string, id: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/knowledge/item/${fileType}/${encodeURIComponent(id)}/content`);
            if (!response.ok) throw new Error('Failed to load content');

            const data = await response.json();
            setViewModal({ open: true, item: data });
        } catch (error) {
            console.error('Failed to load content', error);
            alert('Failed to load file content');
        }
    };

    const handleFileUpload = async (file: File) => {
        try {
            setIsUploading(true);
            setUploadStatus('Uploading...');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/knowledge/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            setUploadStatus(result.message);
            loadKnowledgeBase();
        } catch (error) {
            setUploadStatus(`Failed to upload ${file.name}`);
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const renderTable = (items: any[], type: 'document' | 'jira_ticket') => {
        if (isLoading) {
            return (
                <div className="text-center py-12 bg-white">
                    <p className="text-gray-500">Loading...</p>
                </div>
            );
        }

        if (items.length === 0) {
            return (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                        No {type === 'document' ? 'documents' : 'JIRA tickets'} uploaded yet.
                    </p>
                </div>
            );
        }

        return (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                {type === 'document' ? 'File Name' : 'Ticket ID'}
                            </th>
                            {type === 'jira_ticket' && (
                                <>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Type
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Status
                                    </th>
                                </>
                            )}
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Preview
                            </th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                    {type === 'document' && item.has_file ? (
                                        <a
                                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/knowledge/download/${encodeURIComponent(item.id)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                                        >
                                            {item.source || item.id}
                                        </a>
                                    ) : type === 'jira_ticket' ? (
                                        <button
                                            onClick={() => handleView(item.file_type, item.id)}
                                            className="font-medium text-indigo-600 hover:text-indigo-900 hover:underline text-left"
                                        >
                                            {item.id}
                                        </button>
                                    ) : (
                                        <span className="font-medium text-gray-900">{item.source || item.id}</span>
                                    )}
                                </td>
                                {type === 'jira_ticket' && (
                                    <>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                {item.issuetype}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                <td className="px-3 py-4 text-sm text-gray-500 max-w-md truncate">
                                    {item.preview}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <button
                                        onClick={() => handleView(item.file_type, item.id)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.file_type, item.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="p-8">
                <div className="sm:flex sm:items-center sm:justify-between">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
                        <p className="mt-2 text-sm text-gray-700">
                            Manage documents and JIRA history for RAG-powered request creation.
                        </p>
                    </div>
                    <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                        <label htmlFor="file-upload" className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer">
                            <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                            Upload File
                            <input
                                id="file-upload"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.txt,.md,.csv,.doc,.docx,.ppt,.pptx"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                </div>

                {uploadStatus && (
                    <div className={`mt-6 rounded-md p-4 ${uploadStatus.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                        <p className="text-sm font-medium">{uploadStatus}</p>
                    </div>
                )}

                <div className="mt-8">
                    <Tab.Group>
                        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 max-w-md">
                            {['Documents', 'JIRA History'].map((category) => (
                                <Tab
                                    key={category}
                                    className={({ selected }) =>
                                        classNames(
                                            'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                            'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                            selected
                                                ? 'bg-white text-blue-700 shadow'
                                                : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                                        )
                                    }
                                >
                                    {category} ({category === 'Documents' ? documents.length : jiraTickets.length})
                                </Tab>
                            ))}
                        </Tab.List>
                        <Tab.Panels className="mt-6">
                            <Tab.Panel>
                                {renderTable(documents, 'document')}
                            </Tab.Panel>
                            <Tab.Panel>
                                {renderTable(jiraTickets, 'jira_ticket')}
                            </Tab.Panel>
                        </Tab.Panels>
                    </Tab.Group>
                </div>
            </div>

            {/* View Modal */}
            <Transition appear show={viewModal.open} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setViewModal({ open: false, item: null })}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900 mb-4"
                                    >
                                        {viewModal.item?.source || viewModal.item?.id}
                                    </Dialog.Title>
                                    {viewModal.item?.type === 'jira_ticket' && (
                                        <div className="mb-4 flex gap-2">
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                {viewModal.item.issuetype}
                                            </span>
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                {viewModal.item.status}
                                            </span>
                                        </div>
                                    )}
                                    <div className="mt-2 max-h-96 overflow-y-auto">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                                            {viewModal.item?.content}
                                        </pre>
                                    </div>

                                    <div className="mt-6">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={() => setViewModal({ open: false, item: null })}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </MainLayout>
    );
}
