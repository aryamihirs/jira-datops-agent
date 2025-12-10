'use client';

import { useState, useEffect, Fragment } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { api } from '@/lib/api/client';
import { PlusIcon, CheckCircleIcon, XCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, Tab } from '@headlessui/react';

interface Connection {
  id: number;
  name: string;
  type: string;
  status: string;
  jira_url?: string;
  jira_email?: string;
  jira_project_key?: string;
  field_config?: any;
  has_api_token?: boolean;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  // Add connection form
  const [newConnectionType, setNewConnectionType] = useState('jira');
  const [newConnectionName, setNewConnectionName] = useState('');

  // Configure connection form
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [fieldConfig, setFieldConfig] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeIssueType, setActiveIssueType] = useState<string>('');

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const data = await api.getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Failed to fetch connections', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (testResult?.success) {
      const timer = setTimeout(() => {
        setTestResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [testResult]);

  const handleAddConnection = async () => {
    try {
      await api.createConnection({ name: newConnectionName, type: newConnectionType as 'jira' | 'email' | 'slack' | 'confluence' | 'file_system' });
      setAddModalOpen(false);
      setNewConnectionName('');
      setNewConnectionType('jira');
      loadConnections();
    } catch (error) {
      console.error('Failed to create connection', error);
      alert('Failed to create connection');
    }
  };

  const handleConfigure = (connection: Connection) => {
    setSelectedConnection(connection);
    setJiraUrl(connection.jira_url || '');
    setJiraEmail(connection.jira_email || '');
    setJiraApiToken(connection.has_api_token ? '********' : '');
    setJiraProjectKey(connection.jira_project_key || '');
    setFieldConfig(connection.field_config);
    if (connection.field_config) {
      const issueTypes = Object.keys(connection.field_config);
      if (issueTypes.length > 0) setActiveIssueType(issueTypes[0]);
    }
    setTestResult(null);
    setProjects([]);
    setConfigModalOpen(true);
  };

  const handleTestConnection = async () => {
    if (!selectedConnection) return;

    try {
      // First update the connection
      const updateData: any = {
        jira_url: jiraUrl,
        jira_email: jiraEmail,
      };

      // Only send token if it's not the masked value
      if (jiraApiToken !== '********') {
        updateData.jira_api_token = jiraApiToken;
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/connections/${selectedConnection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Then test
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/connections/${selectedConnection.id}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        // Load projects
        const projectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/connections/${selectedConnection.id}/projects`);
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Test failed', error);
      setTestResult({ success: false, error: 'Connection test failed' });
    }
  };

  const handleSaveConfiguration = async () => {
    if (!selectedConnection) return;

    try {
      const updateData: any = {
        jira_url: jiraUrl,
        jira_email: jiraEmail,
        jira_project_key: jiraProjectKey,
        field_config: fieldConfig,
      };

      // Only send token if it's not the masked value
      if (jiraApiToken !== '********') {
        updateData.jira_api_token = jiraApiToken;
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/connections/${selectedConnection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      // Fetch field configuration if project changed and no config exists, or just refresh
      if (jiraProjectKey && !fieldConfig) {
        const fieldConfigResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/connections/${selectedConnection.id}/field-config`);
        const fieldConfigData = await fieldConfigResponse.json();
        setFieldConfig(fieldConfigData);
        const issueTypes = Object.keys(fieldConfigData);
        if (issueTypes.length > 0) setActiveIssueType(issueTypes[0]);
      }

      alert('Configuration saved successfully!');
      setConfigModalOpen(false);
      loadConnections();
    } catch (error) {
      console.error('Save failed', error);
      alert('Failed to save configuration');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/connections/${id}`, {
        method: 'DELETE',
      });
      loadConnections();
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete connection');
    }
  };

  const toggleFieldIncluded = (issueType: string, fieldKey: string, included: boolean) => {
    setFieldConfig((prev: any) => ({
      ...prev,
      [issueType]: {
        ...prev[issueType],
        fields: {
          ...prev[issueType].fields,
          [fieldKey]: {
            ...prev[issueType].fields[fieldKey],
            included: included,
          },
        },
      },
    }));
  };

  const toggleFieldRequired = (issueType: string, fieldKey: string, required: boolean) => {
    setFieldConfig((prev: any) => ({
      ...prev,
      [issueType]: {
        ...prev[issueType],
        fields: {
          ...prev[issueType].fields,
          [fieldKey]: {
            ...prev[issueType].fields[fieldKey],
            custom_required: required,
          },
        },
      },
    }));
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-x-1.5 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          <CheckCircleIcon className="h-4 w-4" />
          Active
        </span>
      );
    } else if (status === 'error') {
      return (
        <span className="inline-flex items-center gap-x-1.5 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          <XCircleIcon className="h-4 w-4" />
          Error
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
          Inactive
        </span>
      );
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
            <p className="mt-2 text-sm text-gray-700">
              Configure integrations with JIRA and other data sources.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <PlusIcon className="-ml-0.5 h-5 w-5" />
              Add Connection
            </button>
          </div>
        </div>

        {/* Connections Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No connections yet. Click "Add Connection" to get started.</p>
            </div>
          ) : (
            connections.map((connection) => (
              <div key={connection.id} className="divide-y divide-gray-200 rounded-lg bg-white shadow">
                <div className="flex w-full items-center justify-between space-x-6 p-6">
                  <div className="flex-1 truncate">
                    <div className="flex items-center space-x-3">
                      <h3 className="truncate text-sm font-medium text-gray-900">{connection.name}</h3>
                      {getStatusBadge(connection.status)}
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-500 capitalize">{connection.type}</p>
                    {connection.jira_project_key && (
                      <p className="mt-1 truncate text-xs text-gray-400">Project: {connection.jira_project_key}</p>
                    )}
                  </div>
                </div>
                <div className="-mt-px flex divide-x divide-gray-200">
                  <div className="flex w-0 flex-1">
                    <button
                      onClick={() => handleConfigure(connection)}
                      className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-900 hover:text-indigo-600"
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                      Configure
                    </button>
                  </div>
                  <div className="-ml-px flex w-0 flex-1">
                    <button
                      onClick={() => handleDelete(connection.id)}
                      className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-900 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Connection Modal */}
      <Transition appear show={addModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setAddModalOpen(false)}>
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
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Add New Connection
                  </Dialog.Title>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium leading-6 text-gray-900">Connection Name</label>
                      <input
                        type="text"
                        value={newConnectionName}
                        onChange={(e) => setNewConnectionName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 text-gray-900"
                        placeholder="My JIRA Connection"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium leading-6 text-gray-900">Source Type</label>
                      <select
                        value={newConnectionType}
                        onChange={(e) => setNewConnectionType(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 text-gray-900"
                      >
                        <option value="jira">JIRA / Atlassian</option>
                        <option value="email">Email</option>
                        <option value="slack">Slack</option>
                        <option value="teams">Microsoft Teams</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleAddConnection}
                      disabled={!newConnectionName}
                      className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:bg-gray-300"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setAddModalOpen(false)}
                      className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Configure Connection Modal */}
      <Transition appear show={configModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setConfigModalOpen(false)}>
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
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                    Configure {selectedConnection?.name}
                  </Dialog.Title>

                  <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
                      <Tab
                        className={({ selected }) =>
                          `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${selected
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                          }`
                        }
                      >
                        Connection Settings
                      </Tab>
                      <Tab
                        className={({ selected }) =>
                          `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${selected
                            ? 'bg-white text-blue-700 shadow'
                            : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                          }`
                        }
                      >
                        Field Configuration
                      </Tab>
                    </Tab.List>
                    <Tab.Panels>
                      <Tab.Panel>
                        <div className="space-y-4">
                          {selectedConnection?.type === 'jira' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">JIRA URL</label>
                                <input
                                  type="url"
                                  value={jiraUrl}
                                  onChange={(e) => setJiraUrl(e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-gray-900"
                                  placeholder="https://yourcompany.atlassian.net"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                  type="email"
                                  value={jiraEmail}
                                  onChange={(e) => setJiraEmail(e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-gray-900"
                                  placeholder="your-email@company.com"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">API Token</label>
                                <input
                                  type="password"
                                  value={jiraApiToken}
                                  onChange={(e) => setJiraApiToken(e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-gray-900"
                                  placeholder="Generate at id.atlassian.com"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Generate at: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">id.atlassian.com/manage-profile/security/api-tokens</a>
                                </p>
                              </div>

                              <button
                                onClick={handleTestConnection}
                                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                              >
                                Test Connection
                              </button>

                              {testResult && (
                                <div className={`rounded-md p-4 ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                  <p className="text-sm font-medium">
                                    {testResult.success ? `✓ Connected as ${testResult.user?.displayName}` : `✗ ${testResult.error}`}
                                  </p>
                                </div>
                              )}

                              {projects.length > 0 && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Project</label>
                                  <select
                                    value={jiraProjectKey}
                                    onChange={(e) => setJiraProjectKey(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border text-gray-900"
                                  >
                                    <option value="">Select a project</option>
                                    {projects.map((project) => (
                                      <option key={project.key} value={project.key}>
                                        {project.name} ({project.key})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </Tab.Panel>
                      <Tab.Panel>
                        {fieldConfig ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-medium text-gray-900">Field Configuration</h4>

                              {/* Issue Type Dropdown */}
                              <div className="flex items-center gap-2">
                                <label htmlFor="issueType" className="text-sm font-medium text-gray-700">Issue Type:</label>
                                <select
                                  id="issueType"
                                  value={activeIssueType}
                                  onChange={(e) => setActiveIssueType(e.target.value)}
                                  className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1.5 text-gray-900"
                                >
                                  {Object.keys(fieldConfig).map((issueType) => (
                                    <option key={issueType} value={issueType}>
                                      {issueType}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Fields Table */}
                            {activeIssueType && fieldConfig[activeIssueType] && (
                              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg max-h-96 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-300">
                                  <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-3/4">Field Name</th>
                                      <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 w-1/4">Include</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 bg-white">
                                    {Object.entries(fieldConfig[activeIssueType].fields)
                                      .sort(([, a]: [string, any], [, b]: [string, any]) => {
                                        // Sort by required (descending), then by name (ascending)
                                        if (a.required !== b.required) return a.required ? -1 : 1;
                                        return a.name.localeCompare(b.name);
                                      })
                                      .map(([fieldKey, field]: [string, any]) => {
                                        const isMandatory = field.required;
                                        const isIncluded = field.included !== false; // Default to true if undefined

                                        return (
                                          <tr key={fieldKey} className={isMandatory ? 'bg-gray-50' : ''}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                              <div className="flex flex-col">
                                                <span>{field.name}</span>
                                                <span className="text-xs text-gray-500 font-normal">{fieldKey}</span>
                                              </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                              <input
                                                type="checkbox"
                                                checked={isMandatory || isIncluded}
                                                disabled={isMandatory}
                                                onChange={(e) => toggleFieldIncluded(activeIssueType, fieldKey, e.target.checked)}
                                                className={`h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 ${isMandatory ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <p className="text-gray-500">
                              Please configure and test your connection first to load field configurations.
                            </p>
                          </div>
                        )}
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={handleSaveConfiguration}
                      className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      Save Configuration
                    </button>
                    <button
                      onClick={() => setConfigModalOpen(false)}
                      className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cancel
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
