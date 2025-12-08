import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Request, Connection } from '@/lib/types';
import { api } from '@/lib/api/client';

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: Request | null;
    onUpdate: () => void;
}

export function RequestModal({ isOpen, onClose, request, onUpdate }: RequestModalProps) {
    const [formData, setFormData] = useState<Partial<Request>>({});
    const [isCreating, setIsCreating] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
    const [selectedIssueType, setSelectedIssueType] = useState<string>('');
    const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showJiraDetails, setShowJiraDetails] = useState(false);

    useEffect(() => {
        const loadConnections = async () => {
            try {
                const data = await api.getConnections();
                setConnections(data);
                // Find active JIRA connection
                const jiraConn = data.find(c => c.type === 'jira' && c.status === 'active');
                if (jiraConn) {
                    setActiveConnection(jiraConn);
                    if (jiraConn.field_config) {
                        const issueTypes = Object.keys(jiraConn.field_config);
                        if (issueTypes.length > 0) {
                            setSelectedIssueType(issueTypes[0]);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load connections', error);
            }
        };
        loadConnections();
    }, [isOpen]);

    useEffect(() => {
        if (request) {
            setFormData(request);
            setIsCreating(false);
            setShowJiraDetails(true); // Always show details for existing requests
            // If editing, try to populate dynamic fields from source_content if available
            if (request.source_content && request.source_content.jira_fields) {
                setDynamicFields(request.source_content.jira_fields);
                if (request.source_content.issue_type) {
                    setSelectedIssueType(request.source_content.issue_type);
                }
            }
        } else {
            setFormData({
                source_tag: 'manual',
                status: 'Under Review'
            });
            setIsCreating(true);
            setShowJiraDetails(false); // Hide initially for new requests
            setDynamicFields({});
        }
    }, [request, isOpen]);

    // Helper to construct schema for AI
    const getJiraSchema = (issueType: string) => {
        if (!activeConnection?.field_config || !issueType) return null;

        const config = activeConnection.field_config[issueType];
        if (!config || !config.fields) return null;

        const schema: Record<string, string> = {};

        Object.entries(config.fields).forEach(([key, field]: [string, any]) => {
            if (field.included) {
                // Create a description for the AI based on field type and name
                let description = field.name;
                if (field.required) description += " (Required)";
                if (field.type === 'array') description += " (List of values)";

                schema[key] = description;
            }
        });

        return schema;
    };

    const handleAnalyze = async () => {
        if (!formData.description) return;

        setIsAnalyzing(true);
        try {
            // Determine issue type (default to first available if not set)
            let currentIssueType = selectedIssueType;
            if (!currentIssueType && activeConnection?.field_config) {
                const types = Object.keys(activeConnection.field_config);
                if (types.length > 0) {
                    currentIssueType = types[0];
                    setSelectedIssueType(currentIssueType);
                }
            }

            // Get current JIRA schema to guide the AI
            const jiraSchema = getJiraSchema(currentIssueType);
            console.log('Sending JIRA Schema to AI:', jiraSchema);

            // Call analyze endpoint with schema
            const result = await api.analyzeRequest(formData.description, undefined, jiraSchema || undefined);

            console.log('AI Analysis Result:', result);

            // Map fields directly since AI now uses our schema keys
            setDynamicFields(prev => ({ ...prev, ...result }));

            // Update main form data
            setFormData(prev => ({
                ...prev,
                summary: result.summary || prev.summary,
            }));

            // Switch to details tab
            setShowJiraDetails(true);
        } catch (error) {
            console.error('Failed to analyze request', error);
            alert('Failed to analyze request. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        try {
            console.log('Saving request...', formData);
            const dataToSave = {
                source_tag: 'manual', // Ensure default matches backend expectation
                ...formData,
                source_content: {
                    ...formData.source_content,
                    issue_type: selectedIssueType,
                    jira_fields: dynamicFields
                }
            };

            if (isCreating) {
                console.log('Creating request with data:', dataToSave);
                await api.createRequest(dataToSave);
            } else if (request) {
                console.log('Updating request with data:', dataToSave);
                await api.updateRequest(request.id, dataToSave);
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to save request', error);
            alert(`Failed to save request: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleApprove = async () => {
        if (!request) return;
        try {
            await api.approveRequest(request.id);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to approve request', error);
        }
    };

    const handleReject = async () => {
        if (!request) return;
        try {
            await api.rejectRequest(request.id);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to reject request', error);
        }
    };

    const renderDynamicField = (fieldKey: string, field: any) => {
        // Skip if not included
        if (field.included === false) return null;

        const isRequired = field.required || field.custom_required;
        const label = field.name;

        // Handle different field types
        // This is a basic implementation - can be expanded for specific JIRA types
        return (
            <div key={fieldKey} className="sm:col-span-6">
                <label className="block text-sm font-medium leading-6 text-gray-900">
                    {label} {isRequired && <span className="text-red-500">*</span>}
                </label>
                <div className="mt-2">
                    <input
                        type="text"
                        required={isRequired}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        value={dynamicFields[fieldKey] || ''}
                        onChange={(e) => setDynamicFields({ ...dynamicFields, [fieldKey]: e.target.value })}
                    />
                </div>
            </div>
        );
    };

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="sm:flex sm:items-start w-full">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            {isCreating ? 'New Request' : `Request Details: ${request?.summary}`}
                                        </Dialog.Title>

                                        {/* Tabs for Navigation */}
                                        <div className="mt-4 border-b border-gray-200">
                                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                                <button
                                                    onClick={() => setShowJiraDetails(false)}
                                                    className={`${!showJiraDetails
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                        } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                                                >
                                                    Context & Assets
                                                </button>
                                                <button
                                                    onClick={() => setShowJiraDetails(true)}
                                                    disabled={!activeConnection}
                                                    className={`${showJiraDetails
                                                        ? 'border-indigo-500 text-indigo-600'
                                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                        } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    JIRA Details
                                                </button>
                                            </nav>
                                        </div>

                                        <div className="mt-6">
                                            {/* Context & Assets Tab */}
                                            {!showJiraDetails && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                                    <div>
                                                        <label className="block text-sm font-medium leading-6 text-gray-900">
                                                            Request Context
                                                        </label>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Describe the task or request in detail. The AI agent will extract the necessary information.
                                                        </p>
                                                        <div className="mt-2">
                                                            <textarea
                                                                rows={6}
                                                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                                placeholder="e.g. Please create a JIRA ticket for fixing the login bug reported by Sarah. See attached screenshot..."
                                                                value={formData.description || ''}
                                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium leading-6 text-gray-900">
                                                            Assets
                                                        </label>
                                                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                                                            <div className="text-center">
                                                                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                                                    <label
                                                                        htmlFor="file-upload"
                                                                        className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                                                                    >
                                                                        <span>Upload files</span>
                                                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                                                                    </label>
                                                                    <p className="pl-1">or drag and drop</p>
                                                                </div>
                                                                <p className="text-xs leading-5 text-gray-600">Emails, Screenshots, Documents</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            disabled={isAnalyzing || !formData.description}
                                                            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={handleAnalyze}
                                                        >
                                                            {isAnalyzing ? (
                                                                <>
                                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                    Analyzing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Analyze & Generate Fields
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* JIRA Details Tab */}
                                            {showJiraDetails && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                                    {activeConnection ? (
                                                        <>
                                                            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">

                                                                {/* Issue Type Selector */}
                                                                <div className="sm:col-span-6">
                                                                    <label className="block text-sm font-medium leading-6 text-gray-900">
                                                                        Issue Type <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <div className="mt-2">
                                                                        <select
                                                                            value={selectedIssueType}
                                                                            onChange={(e) => setSelectedIssueType(e.target.value)}
                                                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                                                        >
                                                                            {activeConnection.field_config && Object.keys(activeConnection.field_config).map((type) => (
                                                                                <option key={type} value={type}>{type}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Dynamic Fields Grid */}
                                                                {selectedIssueType && activeConnection.field_config && activeConnection.field_config[selectedIssueType] ? (
                                                                    Object.entries(activeConnection.field_config[selectedIssueType].fields)
                                                                        .sort(([, a]: [string, any], [, b]: [string, any]) => {
                                                                            if (a.required !== b.required) return a.required ? -1 : 1;
                                                                            return a.name.localeCompare(b.name);
                                                                        })
                                                                        .map(([fieldKey, field]: [string, any]) => renderDynamicField(fieldKey, field))
                                                                ) : (
                                                                    <div className="sm:col-span-6 text-center text-gray-500 py-4">
                                                                        No fields configured for this issue type.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                            <p className="text-gray-500">No active JIRA connection found.</p>
                                                            <p className="text-sm text-gray-400 mt-1">Please configure a connection in settings.</p>
                                                        </div>
                                                    )}

                                                    {/* Source Content (Read Only) - Only show if present */}
                                                    {request?.source_content && (
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-sm font-medium leading-6 text-gray-900">Source Content</label>
                                                            <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700 max-h-40 overflow-y-auto">
                                                                <pre className="whitespace-pre-wrap font-sans">
                                                                    {JSON.stringify(request.source_content, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                    {!isCreating && (
                                        <>
                                            <button
                                                type="button"
                                                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                                                onClick={handleApprove}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                                                onClick={handleReject}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {/* Only show Save/Create if JIRA details are visible (meaning analysis is done or skipped) */}
                                    {showJiraDetails && (
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                                            onClick={handleSave}
                                        >
                                            {isCreating ? 'Create Request' : 'Save Changes'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
