import React, { useEffect, useState } from 'react';
import { X, Code, BookOpen, PenTool, Settings, LogIn, ToggleRight, FileText, Users } from 'lucide-react';
import { usePuter } from '../../contexts/PuterContext';
import { useAtom } from 'jotai';
import { settingsAtom, projectNameAtom, filesAtom, currentFileAtom } from '../../atoms';

interface WelcomeModalProps {
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [neverShow, setNeverShow] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState('');
  const { isAuthenticated, signIn, username } = usePuter();
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [projectName, setProjectName] = useAtom(projectNameAtom);
  const [, setFiles] = useAtom(filesAtom);
  const [, setCurrentFile] = useAtom(currentFileAtom);
  
  const handleClose = () => {
    if (neverShow) {
      localStorage.setItem('showWelcomeModal', 'false');
    }
    onClose();
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signIn();
      setLoginSuccess(true);
      // Reset loading after successful login animation
      setTimeout(() => {
        setLoginLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Login failed:', error);
      setLoginLoading(false);
    }
  };
  
  // Reset animation after it completes
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess]);

  // Toggle between Gemini API and Puter
  const toggleApiMode = () => {
    const newSettings = {
      ...settings,
      geminiApiEnabled: !settings.geminiApiEnabled
    };
    
    setSettings(newSettings);
    localStorage.setItem('settings', JSON.stringify(newSettings));
  };
  
  const createProject = () => {
    if (!selectedTemplate) return;
    
    // Save project name to localStorage and atom
    localStorage.setItem('projectName', projectName);
    
    // For all templates, start with an empty project
    setFiles([]);
    setCurrentFile(null);
        
    handleClose();
  };

  const templates = [
    { 
      name: 'Empty Project', 
      icon: <Code size={24} className="text-blue-500" />,
      description: 'Start from scratch with a blank project'
    },
    { 
      name: 'React App', 
      icon: <PenTool size={24} className="text-blue-500" />,
      description: 'Modern React application template (starts empty)'
    },
    { 
      name: 'Puter App', 
      icon: <Settings size={24} className="text-blue-500" />,
      description: 'Cloud-ready app using Puter.js (starts empty)'
    },
    { 
      name: 'Landing Page', 
      icon: <FileText size={24} className="text-blue-500" />,
      description: 'Simple HTML/CSS landing page (starts empty)'
    },
    { 
      name: 'Documentation', 
      icon: <BookOpen size={24} className="text-blue-500" />,
      description: 'Create documentation site (starts empty)'
    },
    { 
      name: 'Community', 
      icon: <Users size={24} className="text-blue-500" />,
      description: 'Coming soon (starts empty)'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Welcome to Vibe Code Project</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${!settings.geminiApiEnabled ? 'text-blue-400' : 'text-gray-400'}`}>
                Puter
              </span>
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.geminiApiEnabled}
                  onChange={toggleApiMode}
                  className="sr-only peer" 
                />
                <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className={`text-sm ${settings.geminiApiEnabled ? 'text-blue-400' : 'text-gray-400'}`}>
                Google
              </span>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium">Project Name</label>
            <input 
              type="text" 
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="My Awesome Project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)} 
            />
          </div>

          <div className="flex justify-between mb-6">
            <p className="text-gray-300">
              Create a new project or choose from one of our templates to get started.
            </p>

            {!settings.geminiApiEnabled && (
              <button 
                onClick={handleLogin}
                className={`${
                  isAuthenticated 
                    ? 'bg-green-600 text-white' 
                    : loginLoading 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                } text-sm px-4 py-1 rounded flex items-center transition-all duration-300 ${loginSuccess ? 'animate-pulse' : ''} ${loginLoading && !isAuthenticated ? 'animate-pulse' : ''}`}
                disabled={isAuthenticated || loginLoading}
              >
                {isAuthenticated ? (
                  <span>Signed in as {username}</span>
                ) : loginLoading ? (
                  <span>Logging in...</span>
                ) : (
                  <>
                    <LogIn size={14} className="mr-1" />
                    Login to Puter
                  </>
                )}
              </button>
            )}

            {settings.geminiApiEnabled && (
              <span className="text-sm px-4 py-1 bg-green-600 rounded flex items-center">
                <span className="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Using Gemini API
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 auto-rows-fr">
            {templates.map((template, index) => (
              <div 
                key={index} 
                className={`border ${
                  selectedTemplate === template.name 
                    ? 'border-blue-500 bg-gray-700/70' 
                    : 'border-gray-700 hover:bg-gray-700/50'
                } rounded-lg p-4 cursor-pointer transition-colors flex flex-col`}
                onClick={() => setSelectedTemplate(template.name)}
              >
                <div className="flex items-center mb-2">
                  {template.icon}
                  <span className="ml-2 font-medium">{template.name}</span>
                </div>
                <p className="text-sm text-gray-400 mt-auto">{template.description}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-300">
              <input 
                type="checkbox" 
                className="mr-2 bg-gray-700 border-gray-600 rounded"
                checked={neverShow}
                onChange={() => setNeverShow(!neverShow)}
              />
              Don't show this again
            </label>

            <div className="flex space-x-2">
              <button 
                onClick={handleClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={createProject}
                className={`px-4 py-2 ${
                  selectedTemplate ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/50 cursor-not-allowed'
                } rounded`}
                disabled={!selectedTemplate}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
