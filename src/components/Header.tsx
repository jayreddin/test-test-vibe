import React, { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, FolderOpen, Save, FilePlus, MessageSquare, Image, Mic, MicOff, X, ChevronDown, Sparkles, Send, Server, Volume2, VolumeX } from 'lucide-react';
import { useAtom } from 'jotai';
import { selectedModelAtom, aiModelsAtom, settingsOpenAtom, projectNameAtom, settingsAtom, geminiModelsAtom, filesAtom, currentFileAtom } from '../atoms';
import { usePuter } from '../contexts/PuterContext';
import { FileSystem } from '../services/FileSystem';
import { AIService } from '../services/AIService';
import { ChatService } from '../services/ChatService';
import AIChat from './AIChat';

const Header = () => {
  const { isAuthenticated, signIn, signOut, username } = usePuter();
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [aiModels] = useAtom(aiModelsAtom);
  const [geminiModels] = useAtom(geminiModelsAtom);
  const [_, setSettingsOpen] = useAtom(settingsOpenAtom);
  const [projectName, setProjectName] = useAtom(projectNameAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [files, setFiles] = useAtom(filesAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Filter models based on whether Gemini API is enabled
  const availableModels = settings.geminiApiEnabled 
    ? geminiModels.filter(model => model.enabled)
    : aiModels.filter(model => model.enabled);

  // Update the default model based on settings
  useEffect(() => {
    if (settings.geminiApiEnabled && selectedModel !== 'google/gemini-2.0-flash-lite-001') {
      setSelectedModel('google/gemini-2.0-flash-lite-001');
      localStorage.setItem('selectedModel', 'google/gemini-2.0-flash-lite-001');
    } else if (!settings.geminiApiEnabled && selectedModel !== 'claude-sonnet-4') {
      setSelectedModel('claude-sonnet-4');
      localStorage.setItem('selectedModel', 'claude-sonnet-4');
    }
  }, [settings.geminiApiEnabled]);

  const startEditingName = () => {
    setIsEditingName(true);
    setTempProjectName(projectName);
  };

  const saveProjectName = () => {
    if (tempProjectName.trim()) {
      setProjectName(tempProjectName);
      localStorage.setItem('projectName', tempProjectName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveProjectName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setTempProjectName(projectName);
    }
  };

  const handleNewProject = () => {
    // Implementation would open welcome modal or a new project creation modal
    setShowNewProjectModal(true);
  };

  const handleOpenFile = async () => {
    // If using Puter, use Puter file system to open a file
    if (!settings.geminiApiEnabled && isAuthenticated) {
      try {
        // Use correct puter.ui.showOpenFilePicker with proper options
        const selectedFile = await window.puter.ui.showOpenFilePicker({
          multiple: false,
          accept: ['.html', '.css', '.js', '.json', '.txt']
        });
        
        if (selectedFile && selectedFile.length > 0) {
          const file = selectedFile[0];
          const fileContent = await FileSystem.loadFile(file.path);
          const extension = file.name.split('.').pop() || '';
          
          let language = 'plaintext';
          if (extension === 'js') language = 'javascript';
          else if (extension === 'html') language = 'html';
          else if (extension === 'css') language = 'css';
          else if (extension === 'json') language = 'json';
          
          const newFile = {
            name: file.name,
            content: fileContent || '',
            language,
            path: file.path
          };
          
          // Add file if it doesn't already exist
          if (!files.find(f => f.name === file.name)) {
            setFiles([...files, newFile]);
          }
          
          setCurrentFile(newFile);
        }
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    } else {
      // In browser mode, use the file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.css,.js,.json,.txt';
      
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const content = event.target?.result as string;
            const extension = file.name.split('.').pop() || '';
            
            let language = 'plaintext';
            if (extension === 'js') language = 'javascript';
            else if (extension === 'html') language = 'html';
            else if (extension === 'css') language = 'css';
            else if (extension === 'json') language = 'json';
            
            const newFile = {
              name: file.name,
              content: content,
              language,
              path: file.name
            };
            
            // Add file if it doesn't already exist
            if (!files.find(f => f.name === file.name)) {
              setFiles([...files, newFile]);
            }
            
            setCurrentFile(newFile);
          };
          
          reader.readAsText(file);
        }
      };
      
      input.click();
    }
  };

  const handleSaveFile = async () => {
    if (!currentFile) return;
    
    // If using Puter, save to Puter file system
    if (!settings.geminiApiEnabled && isAuthenticated) {
      await FileSystem.saveFile(currentFile.path || currentFile.name, currentFile.content);
      console.log('File saved to Puter:', currentFile.path || currentFile.name);
    } else {
      // In browser mode, download the file
      const blob = new Blob([currentFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Load project name from localStorage on first render
  useEffect(() => {
    const savedName = localStorage.getItem('projectName');
    if (savedName) {
      setProjectName(savedName);
    }
  }, []);

  return (
    <div className="bg-gray-900 text-white p-2 border-b border-gray-700 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center">
        {isEditingName ? (
          <input
            type="text"
            className="text-xl bg-gray-800 border border-gray-700 rounded px-2 py-1 mr-4"
            value={tempProjectName}
            onChange={(e) => setTempProjectName(e.target.value)}
            onBlur={saveProjectName}
            onKeyDown={handleNameKeyDown}
            autoFocus
          />
        ) : (
          <h1 
            className="text-xl font-bold mr-4 cursor-pointer hover:text-blue-400"
            onClick={startEditingName}
            title="Click to edit project name"
          >
            {projectName}
          </h1>
        )}
        
        <button 
          onClick={handleNewProject} 
          className="text-sm px-3 py-1 mr-4 bg-blue-600 rounded hover:bg-blue-700 flex items-center"
          title="Create new project"
        >
          <FilePlus size={14} className="mr-1" />
          New Project
        </button>
        
        {/* Only show Puter login/username if Gemini API is not enabled */}
        {!settings.geminiApiEnabled && (
          <>
            {isAuthenticated && username && (
              <span className="text-sm text-gray-300 mr-4">{username}</span>
            )}
            {isAuthenticated ? (
              <button 
                onClick={signOut} 
                className="text-sm px-2 py-1 text-gray-300 hover:text-white flex items-center"
              >
                <LogOut size={14} className="mr-1" />
                Logout
              </button>
            ) : (
              <button 
                onClick={signIn} 
                className="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
              >
                Login
              </button>
            )}
          </>
        )}
        
        {/* Show Gemini indicator if it's enabled */}
        {settings.geminiApiEnabled && (
          <span className="text-sm px-2 py-1 bg-green-700 rounded mr-2 flex items-center">
            <span className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Gemini API
          </span>
        )}
      </div>

      {/* Center section */}
      <div className="flex items-center">
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-sm"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right section */}
      <div className="flex items-center">
        <button 
          onClick={() => setShowChatModal(true)} 
          className="p-1 mx-1 text-gray-300 hover:text-white rounded"
          title="Chat with AI"
        >
          <MessageSquare size={18} />
        </button>
        <button 
          onClick={handleOpenFile} 
          className="p-1 mx-1 text-gray-300 hover:text-white rounded"
          title="Open File"
        >
          <FolderOpen size={18} />
        </button>
        <button 
          onClick={handleSaveFile} 
          className="p-1 mx-1 text-gray-300 hover:text-white rounded"
          title="Save"
        >
          <Save size={18} />
        </button>
        <button 
          onClick={() => setSettingsOpen(true)} 
          className="p-1 ml-1 text-gray-300 hover:text-white rounded"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
      
      {/* New Project Modal would go here */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNewProjectModal(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <p className="text-gray-300 mb-4">
              Creating a new project will close your current project. Make sure you've saved your changes.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewProjectModal(false)} 
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // Reset files and reload
                  setFiles([]);
                  setCurrentFile(null);
                  setShowNewProjectModal(false);
                  window.location.reload();
                }} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Create New Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && <AIChat isOpen={showChatModal} onClose={() => setShowChatModal(false)} />}
    </div>
  );
};

export default Header;