import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Server, Power, Check, RefreshCw } from 'lucide-react';
import { MCPServer, MCPService } from '../../services/MCPService';

interface MCPSettingsModalProps {
  onClose: () => void;
}

const MCPSettingsModal: React.FC<MCPSettingsModalProps> = ({ onClose }) => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [newServer, setNewServer] = useState<MCPServer>({
    name: '',
    url: '',
    description: '',
    active: false,
    models: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [newModelInput, setNewModelInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  // Load servers on mount
  useEffect(() => {
    const loadServers = async () => {
      try {
        const config = await MCPService.loadConfig();
        setMcpServers(config.servers);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading MCP servers:', error);
        setErrorMessage('Failed to load MCP servers');
        setIsLoading(false);
      }
    };
    
    loadServers();
  }, []);

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.url) {
      setErrorMessage('Server name and URL are required');
      return;
    }
    
    try {
      // Clean the models array to remove any empty strings
      const cleanedModels = newServer.models?.filter(model => model.trim() !== '') || [];
      const serverToAdd = { ...newServer, models: cleanedModels };
      
      // If this is the only server, make it active
      if (mcpServers.length === 0) {
        serverToAdd.active = true;
      }
      // If this server is set as active, deactivate all others
      else if (serverToAdd.active) {
        await MCPService.setActiveServer(serverToAdd.name);
      }
      
      await MCPService.addServer(serverToAdd);
      const updatedConfig = await MCPService.loadConfig();
      setMcpServers(updatedConfig.servers);
      
      // Reset form
      setNewServer({
        name: '',
        url: '',
        description: '',
        active: false,
        models: []
      });
      setShowAddServerForm(false);
      setIsEditing(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Error adding MCP server:', error);
      setErrorMessage('Failed to add server');
    }
  };

  const handleEditServer = (server: MCPServer) => {
    setNewServer({ ...server });
    setShowAddServerForm(true);
    setIsEditing(true);
  };

  const handleRemoveServer = async (serverName: string) => {
    if (window.confirm(`Are you sure you want to remove the server "${serverName}"?`)) {
      try {
        await MCPService.removeServer(serverName);
        const updatedConfig = await MCPService.loadConfig();
        setMcpServers(updatedConfig.servers);
      } catch (error) {
        console.error('Error removing MCP server:', error);
        setErrorMessage('Failed to remove server');
      }
    }
  };

  const handleSetActiveServer = async (serverName: string) => {
    try {
      await MCPService.setActiveServer(serverName);
      const updatedConfig = await MCPService.loadConfig();
      setMcpServers(updatedConfig.servers);
    } catch (error) {
      console.error('Error setting active MCP server:', error);
      setErrorMessage('Failed to set active server');
    }
  };

  const addModel = () => {
    if (newModelInput.trim()) {
      setNewServer({
        ...newServer,
        models: [...(newServer.models || []), newModelInput.trim()]
      });
      setNewModelInput('');
    }
  };

  const removeModel = (index: number) => {
    const updatedModels = [...(newServer.models || [])];
    updatedModels.splice(index, 1);
    setNewServer({
      ...newServer,
      models: updatedModels
    });
  };

  const handleModelInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addModel();
    }
  };

  const handleTestConnection = async () => {
    if (!newServer.url) {
      setErrorMessage('Server URL is required');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Test connection to the MCP server
      const result = await MCPService.testConnection(newServer);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center">
            <Server size={20} className="mr-2 text-purple-400" />
            <h2 className="text-xl font-semibold">MCP Server Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <p className="text-gray-300 mb-6">
            Configure Model Context Protocol (MCP) servers to extend the application with additional tools and capabilities.
          </p>
          
          {errorMessage && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded mb-4">
              {errorMessage}
              <button 
                className="float-right text-red-300 hover:text-white" 
                onClick={() => setErrorMessage('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Servers list */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Available Servers</h3>
                  <button 
                    onClick={() => {
                      setShowAddServerForm(true);
                      setIsEditing(false);
                      setNewServer({
                        name: '',
                        url: '',
                        description: '',
                        active: false,
                        models: []
                      });
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Add Server
                  </button>
                </div>
                
                {mcpServers.length === 0 ? (
                  <div className="bg-gray-700/30 rounded-lg p-6 text-center">
                    <Server size={40} className="mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-400">No MCP servers configured</p>
                    <button 
                      onClick={() => setShowAddServerForm(true)}
                      className="mt-3 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                    >
                      Add Your First Server
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mcpServers.map((server, index) => (
                      <div 
                        key={index} 
                        className={`rounded-lg border ${server.active ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800'} p-4`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <h4 className="text-lg font-medium">{server.name}</h4>
                              {server.active && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded">Active</span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm mt-1">{server.description}</p>
                            <div className="text-gray-400 text-xs mt-2 flex items-center">
                              <span className="mr-3">URL: {server.url}</span>
                              <span>{server.models?.length || 0} models available</span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            {!server.active && (
                              <button 
                                onClick={() => handleSetActiveServer(server.name)}
                                className="p-1 text-green-500 hover:bg-green-900/30 rounded"
                                title="Set as active server"
                              >
                                <Power size={18} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleEditServer(server)}
                              className="p-1 text-blue-500 hover:bg-blue-900/30 rounded"
                              title="Edit server"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleRemoveServer(server.name)}
                              className="p-1 text-red-500 hover:bg-red-900/30 rounded"
                              title="Remove server"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        {server.models && server.models.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-gray-400 mb-1 block">Available Models:</span>
                            <div className="flex flex-wrap gap-2">
                              {server.models.map((model, modelIndex) => (
                                <span 
                                  key={modelIndex}
                                  className="px-2 py-1 bg-gray-700 rounded-full text-xs"
                                >
                                  {model}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add/Edit Server Form */}
              {showAddServerForm && (
                <div className="bg-gray-700/30 border border-gray-700 rounded-lg p-4 mt-6">
                  <h3 className="text-lg font-medium mb-4">{isEditing ? 'Edit Server' : 'Add New Server'}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Server Name</label>
                      <input
                        type="text"
                        value={newServer.name}
                        onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="e.g., My MCP Server"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Server URL</label>
                      <input
                        type="text"
                        value={newServer.url}
                        onChange={(e) => setNewServer({...newServer, url: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="e.g., https://api.my-mcp-server.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={newServer.description}
                        onChange={(e) => setNewServer({...newServer, description: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
                        placeholder="Describe this MCP server..."
                        rows={2}
                      ></textarea>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1">Models</label>
                      <p className="text-xs text-gray-400 mb-2">Add model IDs that this server supports. For example: openrouter:anthropic/claude-3.5-sonnet</p>
                      
                      {/* Add model input */}
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={newModelInput}
                          onChange={(e) => setNewModelInput(e.target.value)}
                          onKeyDown={handleModelInputKeyDown}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l text-white"
                          placeholder="e.g., openrouter:anthropic/claude-3.5-sonnet"
                        />
                        <button
                          onClick={addModel}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-r"
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Model list */}
                      <div className="space-y-2 mt-3">
                        {newServer.models?.map((model, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded">
                            <span className="text-sm">{model}</span>
                            <button
                              onClick={() => removeModel(index)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {(newServer.models?.length ?? 0) === 0 && (
                        <p className="text-gray-400 text-xs italic">No models added yet</p>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="active-server"
                        checked={newServer.active}
                        onChange={(e) => setNewServer({...newServer, active: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="active-server" className="text-sm">Set as active server</label>
                    </div>
                    
                    <div>
                      <button
                        onClick={handleTestConnection}
                        className={`px-3 py-2 ${isTesting ? 'bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'} rounded text-sm flex items-center`}
                        disabled={isTesting || !newServer.url}
                      >
                        {isTesting ? (
                          <>
                            <RefreshCw size={16} className="mr-2 animate-spin" />
                            Testing Connection...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </button>
                      
                      {testResult && (
                        <div className={`mt-2 text-xs p-2 rounded ${testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6 space-x-3">
                    <button
                      onClick={() => {
                        setShowAddServerForm(false);
                        setTestResult(null);
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddServer}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center"
                      disabled={!newServer.name || !newServer.url}
                    >
                      <Check size={16} className="mr-1" />
                      {isEditing ? 'Update Server' : 'Add Server'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* MCP Information */}
              <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">About Model Context Protocol (MCP)</h3>
                <p className="text-gray-300 text-sm">
                  MCP is a protocol that enables AI assistants to use tools and access resources via standardized APIs. 
                  It facilitates interactions with databases, file systems, and external services, enhancing 
                  your application's capabilities through specialized tools.
                </p>
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <h4 className="font-medium text-sm mb-1">Common MCP Tools:</h4>
                  <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                    <li>Database access and queries</li>
                    <li>File system operations</li>
                    <li>Web searches and content retrieval</li>
                    <li>API integrations</li>
                    <li>Weather data retrieval</li>
                    <li>Code analysis and generation</li>
                  </ul>
                </div>
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <h4 className="font-medium text-sm mb-1">MCP Implementation:</h4>
                  <p className="text-sm text-gray-300">
                    This application implements the client side of the MCP protocol, allowing AI models
                    to make use of tools provided by MCP servers through a standardized interface.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCPSettingsModal;