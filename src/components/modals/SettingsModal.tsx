import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Eye, Download, Upload, Server } from 'lucide-react';
import { useAtom } from 'jotai';
import { settingsAtom, aiModelsAtom, selectedModelAtom, knowledgeDocsAtom, geminiModelsAtom, KnowledgeDoc } from '../../atoms';
import { MCPService, MCPServer } from '../../services/MCPService';
import MCPSettingsModal from './MCPSettingsModal';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useAtom(settingsAtom);
  const [aiModels, setAiModels] = useAtom(aiModelsAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [geminiModels] = useAtom(geminiModelsAtom);
  const [knowledgeDocs, setKnowledgeDocs] = useAtom(knowledgeDocsAtom);
  const [activeTab, setActiveTab] = useState('settings');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [testApiStatus, setTestApiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [openRouterModels, setOpenRouterModels] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load knowledge docs from localStorage on component mount
    const savedDocs = localStorage.getItem('knowledgeDocs');
    if (savedDocs) {
      setKnowledgeDocs(JSON.parse(savedDocs));
    }
    
    // Load Gemini API key from localStorage
    const savedGeminiKey = localStorage.getItem('geminiApiKey');
    if (savedGeminiKey) {
      setGeminiApiKey(savedGeminiKey);
    }
    
    // Load OpenRouter models from localStorage
    const savedOpenRouterModels = localStorage.getItem('openRouterModels');
    if (savedOpenRouterModels) {
      setOpenRouterModels(JSON.parse(savedOpenRouterModels));
    } else {
      // Set default OpenRouter models
      const defaultModels = [
        { id: 'openrouter:anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic (via OpenRouter)', enabled: true },
        { id: 'openrouter:anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic (via OpenRouter)', enabled: true },
        { id: 'openrouter:meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta (via OpenRouter)', enabled: true },
        { id: 'openrouter:meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta (via OpenRouter)', enabled: true },
        { id: 'openrouter:openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI (via OpenRouter)', enabled: true },
        { id: 'openrouter:google/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google (via OpenRouter)', enabled: false },
        { id: 'openrouter:mistralai/mistral-large-2311', name: 'Mistral Large', provider: 'Mistral AI (via OpenRouter)', enabled: false }
      ];
      setOpenRouterModels(defaultModels);
      localStorage.setItem('openRouterModels', JSON.stringify(defaultModels));
    }
    
    // Load MCP servers from localStorage or MCP.json
    const loadMcpServers = async () => {
      try {
        const mcpConfig = await MCPService.loadConfig();
        setMcpServers(mcpConfig.servers);
      } catch (error) {
        console.error('Failed to load MCP servers:', error);
      }
    };
    loadMcpServers();
  }, []);

  const handleSave = () => {
    // Save settings to localStorage
    const updatedSettings = {
      ...settings,
      geminiApiKey: geminiApiKey
    };
    
    localStorage.setItem('settings', JSON.stringify(updatedSettings));
    localStorage.setItem('aiModels', JSON.stringify(aiModels));
    localStorage.setItem('selectedModel', selectedModel);
    localStorage.setItem('knowledgeDocs', JSON.stringify(knowledgeDocs));
    localStorage.setItem('geminiApiKey', geminiApiKey);
    localStorage.setItem('openRouterModels', JSON.stringify(openRouterModels));
    
    setSettings(updatedSettings);
    onClose();
  };

  const toggleModelEnabled = (modelId: string, isOpenRouterModel: boolean = false) => {
    if (isOpenRouterModel) {
      setOpenRouterModels(openRouterModels.map(model => 
        model.id === modelId ? { ...model, enabled: !model.enabled } : model
      ));
    } else {
      setAiModels(aiModels.map(model => 
        model.id === modelId ? { ...model, enabled: !model.enabled } : model
      ));
    }
  };

  const handleTestGeminiKey = () => {
    // Set key in local storage before testing
    localStorage.setItem('geminiApiKey', geminiApiKey);
    
    setTestApiStatus('testing');
    
    // In a real implementation, this would test the Gemini API key
    // For now, we'll just simulate a test with a delay
    setTimeout(() => {
      if (geminiApiKey.length > 10) {
        // Key is at least 10 chars, consider it a success
        setTestApiStatus('success');
        
        // Update the settings state
        setSettings({
          ...settings,
          geminiApiKey: geminiApiKey
        });
      } else {
        // Otherwise, it's an error
        setTestApiStatus('error');
      }
    }, 1500);
  };

  const toggleGeminiApi = () => {
    const newValue = !settings.geminiApiEnabled;
    
    // If enabling Gemini API, switch to a Gemini model
    if (newValue && !selectedModel.includes('gemini')) {
      setSelectedModel('gemini-2.0-flash');
    } 
    // If disabling Gemini API and current model is Gemini, switch to default Puter model
    else if (!newValue && selectedModel.includes('gemini')) {
      setSelectedModel(settings.defaultModel);
    }
    
    setSettings({
      ...settings,
      geminiApiEnabled: newValue
    });
  };

  const handleAddDocument = () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      alert('Please enter both a title and content for the document');
      return;
    }
    
    const newDoc: KnowledgeDoc = {
      id: Date.now().toString(),
      title: newDocTitle,
      content: newDocContent,
      dateAdded: new Date().toISOString()
    };
    
    const updatedDocs = [...knowledgeDocs, newDoc];
    setKnowledgeDocs(updatedDocs);
    localStorage.setItem('knowledgeDocs', JSON.stringify(updatedDocs));
    
    setNewDocTitle('');
    setNewDocContent('');
    setShowAddDocForm(false);
  };

  const handleDeleteDocument = (id: string) => {
    const updatedDocs = knowledgeDocs.filter(doc => doc.id !== id);
    setKnowledgeDocs(updatedDocs);
    localStorage.setItem('knowledgeDocs', JSON.stringify(updatedDocs));
  };
  
  const handleUploadDoc = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Create new document with file contents
      const newDoc: KnowledgeDoc = {
        id: Date.now().toString(),
        title: file.name,
        content: content,
        dateAdded: new Date().toISOString()
      };
      
      const updatedDocs = [...knowledgeDocs, newDoc];
      setKnowledgeDocs(updatedDocs);
      localStorage.setItem('knowledgeDocs', JSON.stringify(updatedDocs));
    };
    
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleMcpSettings = () => {
    setShowMcpModal(true);
  };
  
  const handleMcpModalClose = async () => {
    setShowMcpModal(false);
    
    // Reload MCP servers after modal is closed
    try {
      const mcpConfig = await MCPService.loadConfig();
      setMcpServers(mcpConfig.servers);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-3xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-700">
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'settings' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'ui' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('ui')}
          >
            UI
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'models' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'mcp' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('mcp')}
          >
            MCP
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'docs' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('docs')}
          >
            Docs
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'general' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`px-4 py-2 text-sm ${activeTab === 'about' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'settings' && (
            <div>
              <h3 className="font-medium mb-4">Editor Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Font Size</label>
                  <div className="flex items-center">
                    <input 
                      type="range" 
                      min="10" 
                      max="24" 
                      value={settings.fontSize}
                      onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                      className="mr-2"
                    />
                    <span className="w-8 text-center">{settings.fontSize}px</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm">Tab Size</label>
                  <select 
                    value={settings.tabSize}
                    onChange={(e) => setSettings({...settings, tabSize: parseInt(e.target.value)})}
                    className="bg-gray-700 border border-gray-600 rounded p-1"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm">Word Wrap</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.wordWrap}
                      onChange={() => setSettings({...settings, wordWrap: !settings.wordWrap})}
                      className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm">Auto Save</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.autoSave}
                      onChange={() => setSettings({...settings, autoSave: !settings.autoSave})}
                      className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div>
              <div className="mb-4 border border-gray-700 p-4 rounded bg-gray-700/30">
                <h3 className="font-medium mb-2">Gemini API</h3>
                <p className="text-sm text-gray-300 mb-4">Use your own API key for additional models</p>
                
                <div className="flex space-x-2 mb-4">
                  <input 
                    type="password"
                    placeholder="Gemini API Key" 
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                  <button 
                    className={`px-3 py-1 ${
                      testApiStatus === 'idle' ? 'bg-blue-600 hover:bg-blue-700' : 
                      testApiStatus === 'testing' ? 'bg-yellow-600' : 
                      testApiStatus === 'success' ? 'bg-green-600' : 
                      'bg-red-600'
                    } rounded text-sm min-w-[100px] flex items-center justify-center`}
                    onClick={handleTestGeminiKey}
                    disabled={testApiStatus === 'testing' || !geminiApiKey.trim()}
                  >
                    {testApiStatus === 'idle' && 'Save & Test'}
                    {testApiStatus === 'testing' && 'Testing...'}
                    {testApiStatus === 'success' && 'Success!'}
                    {testApiStatus === 'error' && 'Invalid Key'}
                  </button>
                </div>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-2 bg-gray-700 border-gray-600 rounded"
                    checked={settings.geminiApiEnabled}
                    onChange={toggleGeminiApi}
                  />
                  <span className="text-sm text-gray-300">Enable Gemini API</span>
                </label>
              </div>

              <div className="mb-4 border border-gray-700 p-4 rounded bg-gray-700/30">
                <h3 className="font-medium mb-2">Puter AI Configuration</h3>
                <p className="text-sm text-gray-300 mb-4">Using Puter's built-in AI services</p>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm">
                  Save Puter Model Selection
                </button>
              </div>

              <h3 className="font-medium mb-3">Available Models</h3>
              <div className="max-h-60 overflow-y-auto pr-2">
                {/* Puter/Gemini Models */}
                <h4 className="font-medium text-sm text-gray-300 mb-2">Puter/Gemini Models</h4>
                {(settings.geminiApiEnabled 
                  ? geminiModels 
                  : aiModels
                ).map((model) => (
                  <div key={model.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                    <div>
                      <p className="text-sm font-medium">{model.name}</p>
                      <p className="text-xs text-gray-400">{model.provider}</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={model.enabled}
                        onChange={() => toggleModelEnabled(model.id)}
                        className="sr-only peer" 
                      />
                      <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
                
                {/* OpenRouter Models */}
                {openRouterModels.length > 0 && (
                  <>
                    <h4 className="font-medium text-sm text-gray-300 mt-6 mb-2">OpenRouter Models (via Puter)</h4>
                    <p className="text-xs text-gray-300 mb-2">
                      These models are accessed through Puter's API and don't require an API key.
                    </p>
                    {openRouterModels.map((model) => (
                      <div key={model.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                        <div>
                          <p className="text-sm font-medium">{model.name}</p>
                          <p className="text-xs text-gray-400">{model.provider}</p>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={model.enabled}
                            onChange={() => toggleModelEnabled(model.id, true)}
                            className="sr-only peer" 
                          />
                          <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'mcp' && (
            <div>
              <h3 className="font-medium mb-4">Model Context Protocol (MCP) Servers</h3>
              
              <p className="text-sm text-gray-300 mb-4">
                Configure MCP servers to access tools and context for AI models. 
                MCP servers provide specialized functions that AI models can use to perform tasks.
              </p>
              
              <button
                onClick={handleMcpSettings}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm flex items-center justify-center mb-4"
              >
                <Server size={16} className="mr-2" />
                Configure MCP Servers
              </button>
              
              <div className="border border-gray-700 rounded overflow-hidden">
                <div className="p-3 border-b border-gray-700 bg-gray-700/50 text-sm font-medium flex justify-between items-center">
                  <span>Configured Servers</span>
                  <span className="text-gray-400 text-xs">{mcpServers.length} server{mcpServers.length !== 1 ? 's' : ''}</span>
                </div>
                {mcpServers.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {mcpServers.map((server, index) => (
                      <div key={index} className={`p-3 ${server.active ? 'bg-purple-900/20' : ''}`}>
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium flex items-center">
                              {server.name}
                              {server.active && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">Active</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{server.description}</p>
                            <p className="text-xs text-gray-400 mt-1">Models: {server.models?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-400 text-center">
                    No MCP servers configured yet.
                  </div>
                )}
              </div>
              
              <div className="mt-6 bg-gray-700/30 border border-gray-700 rounded p-4">
                <h4 className="font-medium text-sm mb-2">What is MCP?</h4>
                <p className="text-xs text-gray-300 mb-3">
                  The Model Context Protocol (MCP) enables AI assistants to interact with tools, resources, and services 
                  through a standardized interface. With MCP, you can extend your AI's capabilities to:
                </p>
                <ul className="text-xs text-gray-300 list-disc list-inside space-y-1 mb-3">
                  <li>Access databases</li>
                  <li>Interact with file systems</li>
                  <li>Query external APIs</li>
                  <li>Execute specialized functions</li>
                  <li>Search the web</li>
                  <li>And much more...</li>
                </ul>
                <p className="text-xs text-gray-300">
                  MCP servers implement these capabilities as tools that can be used by AI models through this application.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'docs' && (
            <div>
              <h3 className="font-medium mb-4">Knowledge Base Documents</h3>
              
              <p className="text-sm text-gray-300 mb-4">
                Upload documentation to help the AI understand your project better.
              </p>
              
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center mb-4">
                <p className="text-sm text-gray-400 mb-2">Drag and drop files here or</p>
                <button 
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  onClick={handleUploadDoc}
                >
                  Browse Files
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".txt,.md,.json,.js,.ts,.html,.css"
                  onChange={handleFileUpload}
                />
              </div>
              
              {!showAddDocForm ? (
                <button 
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center justify-center mb-4"
                  onClick={() => setShowAddDocForm(true)}
                >
                  <Plus size={16} className="mr-2" /> Add Manual Document
                </button>
              ) : (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Create Manual Document</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Document Title</label>
                      <input
                        type="text"
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                        placeholder="Enter document title"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Document Content</label>
                      <textarea
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm h-32"
                        placeholder="Enter document content"
                        value={newDocContent}
                        onChange={(e) => setNewDocContent(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        onClick={handleAddDocument}
                      >
                        Add Document
                      </button>
                      <button 
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                        onClick={() => setShowAddDocForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border border-gray-700 rounded overflow-hidden mb-4">
                <div className="p-3 border-b border-gray-700 bg-gray-700/50 text-sm font-medium">
                  Uploaded Documents
                </div>
                {knowledgeDocs.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {knowledgeDocs.map(doc => (
                      <div key={doc.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-400">{new Date(doc.dateAdded).toLocaleString()}</p>
                        </div>
                        <div className="flex space-x-1">
                          <button 
                            className="p-1 text-gray-400 hover:text-white rounded"
                            title="View Document"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="p-1 text-gray-400 hover:text-white rounded"
                            title="Download Document"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            className="p-1 text-red-400 hover:text-red-500 rounded"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-400 text-center">
                    No documents uploaded yet
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'ui' && (
            <div>
              <h3 className="font-medium mb-4">UI Settings</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Panel Visibility</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-2 bg-gray-700 border-gray-600 rounded"
                          checked={true}
                        />
                        <span className="text-sm">AI Tools Panel</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-2 bg-gray-700 border-gray-600 rounded"
                          checked={true}
                        />
                        <span className="text-sm">Code Editor Panel</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="mr-2 bg-gray-700 border-gray-600 rounded"
                          checked={true}
                        />
                        <span className="text-sm">Preview Panel</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2">Layout Presets</label>
                    <div className="space-y-2">
                      <button className="w-full text-left text-sm bg-gray-700 hover:bg-gray-600 p-2 rounded">
                        Code Focus (Large Editor)
                      </button>
                      <button className="w-full text-left text-sm bg-gray-700 hover:bg-gray-600 p-2 rounded">
                        Preview Focus (Large Preview)
                      </button>
                      <button className="w-full text-left text-sm bg-gray-700 hover:bg-gray-600 p-2 rounded">
                        Equal Split
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm mb-2">Animation Speed</label>
                  <div className="flex items-center">
                    <span className="text-xs mr-2">Slow</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value="50"
                      className="flex-1"
                    />
                    <span className="text-xs ml-2">Fast</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'general' && (
            <div>
              <h3 className="font-medium mb-4">General Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Enable Checkpoints</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.checkpoints}
                      onChange={() => setSettings({...settings, checkpoints: !settings.checkpoints})}
                      className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">App Memory</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.appMemory}
                      onChange={() => setSettings({...settings, appMemory: !settings.appMemory})}
                      className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">File Context</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.fileContext}
                      onChange={() => setSettings({...settings, fileContext: !settings.fileContext})}
                      className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm">Welcome Screen</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.showWelcomeOnStartup}
                      onChange={() => setSettings({...settings, showWelcomeOnStartup: !settings.showWelcomeOnStartup})}
                      className="sr-only peer" 
                    />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">Theme</label>
                  <div className="flex">
                    <button 
                      className={`px-3 py-1 text-sm rounded-l ${settings.theme === 'light' ? 'bg-blue-600' : 'bg-gray-700'}`}
                      onClick={() => setSettings({...settings, theme: 'light'})}
                    >
                      Light
                    </button>
                    <button 
                      className={`px-3 py-1 text-sm rounded-r ${settings.theme === 'dark' ? 'bg-blue-600' : 'bg-gray-700'}`}
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'about' && (
            <div>
              <h3 className="font-medium mb-4">About Vibe Code Project</h3>
              
              <p className="text-sm text-gray-300 mb-4">
                Vibe Code Project is an AI-powered coding platform that helps you build web applications faster using natural language.
                Built with React and integrated with Puter.js for cloud storage and AI capabilities.
              </p>
              
              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Version</div>
                <div className="text-sm text-gray-400">0.1.0 (Beta)</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm font-medium mb-1">Created by</div>
                <div className="text-sm text-gray-400">jayreddin</div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">Powered by</div>
                <div className="text-sm text-gray-400">
                  <a href="https://js.puter.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Puter.js</a> - 
                  Cloud storage, authentication, and AI services
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded mr-2"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded"
          >
            Save
          </button>
        </div>
      </div>

      {/* MCP Modal */}
      {showMcpModal && <MCPSettingsModal onClose={handleMcpModalClose} />}
    </div>
  );
};

export default SettingsModal