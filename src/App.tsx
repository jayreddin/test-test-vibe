import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Header from './components/Header';
import AITools from './components/AITools';
import CodeEditor from './components/CodeEditor';
import LivePreview from './components/LivePreview';
import { usePuter } from './contexts/PuterContext';
import WelcomeModal from './components/modals/WelcomeModal';
import SettingsModal from './components/modals/SettingsModal';
import CheckpointsModal from './components/modals/CheckpointsModal';
import { useAtom } from 'jotai';
import { settingsOpenAtom, welcomeOpenAtom, currentFileAtom, filesAtom, checkpointsModalOpenAtom, settingsAtom, checkpointsAtom, selectedModelAtom } from './atoms';
import { FileSystem } from './services/FileSystem';

const App = () => {
  const { puter, isAuthenticated } = usePuter();
  const [isWelcomeModalOpen, setWelcomeModalOpen] = useAtom(welcomeOpenAtom);
  const [isSettingsModalOpen, setSettingsModalOpen] = useAtom(settingsOpenAtom);
  const [isCheckpointsModalOpen, setCheckpointsModalOpen] = useAtom(checkpointsModalOpenAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [files, setFiles] = useAtom(filesAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [checkpoints, setCheckpoints] = useAtom(checkpointsAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [generatedCode, setGeneratedCode] = useState(false);

  useEffect(() => {
    // On first load, check if we should show the welcome modal
    const shouldShowWelcome = localStorage.getItem('showWelcomeModal') !== 'false';
    if (shouldShowWelcome) {
      setWelcomeModalOpen(true);
    }

    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    }

    // Load saved model selection from localStorage
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }

    // Initialize Puter.js file system if authenticated and Gemini API is not enabled
    if (isAuthenticated && !settings.geminiApiEnabled) {
      FileSystem.initProjectDirectory();
    }
    
    // Load checkpoints from localStorage
    const savedCheckpoints = localStorage.getItem('checkpoints');
    if (savedCheckpoints) {
      setCheckpoints(JSON.parse(savedCheckpoints));
    }
    
    // Set up auto-save checkpoints if enabled
    if (settings.checkpoints && settings.autoSave) {
      const autoSaveInterval = setInterval(() => {
        createAutoSaveCheckpoint();
      }, 60000); // Auto-save every minute
      
      return () => clearInterval(autoSaveInterval);
    }
  }, [isAuthenticated, settings.checkpoints, settings.autoSave, settings.geminiApiEnabled, setSettings, setSelectedModel, setWelcomeModalOpen, setCheckpoints]);

  // Create an auto-save checkpoint
  const createAutoSaveCheckpoint = () => {
    if (files.length === 0) return;
    
    const existingCheckpoints = [...checkpoints];
    
    // Limit auto-save checkpoints to 10
    const autoSaveCheckpoints = existingCheckpoints.filter(cp => cp.name.startsWith('Auto-save'));
    if (autoSaveCheckpoints.length >= 10) {
      // Remove the oldest auto-save checkpoint
      const oldestCheckpointId = autoSaveCheckpoints[0].id;
      const filteredCheckpoints = existingCheckpoints.filter(cp => cp.id !== oldestCheckpointId);
      existingCheckpoints.splice(0, existingCheckpoints.length, ...filteredCheckpoints);
    }
    
    // Create new checkpoint
    const newCheckpoint = {
      id: 'auto-' + Date.now(),
      name: `Auto-save ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString(),
      files: [...files] // Ensure a copy is made
    };
    
    const updatedCheckpoints = [...existingCheckpoints, newCheckpoint];
    setCheckpoints(updatedCheckpoints);
    
    // Save to localStorage
    localStorage.setItem('checkpoints', JSON.stringify(updatedCheckpoints));
  };

  // Listen for element selection toggle from LivePreview
  useEffect(() => {
    const handleToggleElementSelection = (event: CustomEvent) => {
      // Update the AITools component or any other component that needs to know about the selection mode
      console.log('Element selection toggled:', event.detail.enabled);
    };

    window.addEventListener('toggleElementSelection', handleToggleElementSelection as EventListener);
    return () => {
      window.removeEventListener('toggleElementSelection', handleToggleElementSelection as EventListener);
    };
  }, []);

  const handleCodeChange = (newCode: string) => {
    // Update the current file's content
    if (currentFile) {
      setFiles(files.map(file => 
        file.name === currentFile.name 
          ? { ...file, content: newCode } 
          : file
      ));
      
      // Update the current file reference
      setCurrentFile({ ...currentFile, content: newCode });
      
      // Save to Puter cloud if authenticated and Gemini API is not enabled
      if (isAuthenticated && !settings.geminiApiEnabled && currentFile.path) {
        FileSystem.saveFile(currentFile.path, newCode);
      }
    }
  };

  const handleGenerateCode = (generatedCode: string) => {
    // Find the HTML file and update its content
    const htmlFile = files.find(file => file.name.endsWith('.html'));
    
    if (htmlFile) {
      const updatedFiles = files.map(file => 
        file.name === htmlFile.name 
          ? { ...file, content: generatedCode } 
          : file
      );
      
      setFiles(updatedFiles);
      
      // Set the HTML file as current
      setCurrentFile({ ...htmlFile, content: generatedCode });
      
      // Set flag that code has been generated
      setGeneratedCode(true);
      
      // Save to Puter cloud if authenticated and Gemini API is not enabled
      if (isAuthenticated && !settings.geminiApiEnabled && htmlFile.path) {
        FileSystem.saveFile(htmlFile.path, generatedCode);
      }
    } else {
      // If no HTML file exists, create one
      const newHtmlFile = {
        name: 'index.html',
        content: generatedCode,
        language: 'html',
        path: 'index.html'
      };
      
      setFiles([...files, newHtmlFile]);
      setCurrentFile(newHtmlFile);
      setGeneratedCode(true);
      
      // Save to Puter cloud if authenticated and Gemini API is not enabled
      if (isAuthenticated && !settings.geminiApiEnabled) {
        FileSystem.saveFile('index.html', generatedCode);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      
      <PanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - AI Tools */}
        <Panel defaultSize={25} minSize={15} className="bg-gray-800">
          <AITools 
            onGenerateCode={handleGenerateCode}
            showModifyTools={generatedCode}
          />
        </Panel>
        
        <PanelResizeHandle className="panel-resize-handle w-1" />
        
        {/* Center Panel - Code Editor */}
        <Panel defaultSize={40} minSize={20}>
          <CodeEditor 
            code={currentFile?.content || ''} 
            onChange={handleCodeChange} 
            language={currentFile?.language || 'javascript'}
          />
        </Panel>
        
        <PanelResizeHandle className="panel-resize-handle w-1" />
        
        {/* Right Panel - Live Preview */}
        <Panel defaultSize={35} minSize={20}>
          <LivePreview files={files} />
        </Panel>
      </PanelGroup>
      
      {/* Modals */}
      {isWelcomeModalOpen && <WelcomeModal onClose={() => setWelcomeModalOpen(false)} />}
      {isSettingsModalOpen && <SettingsModal onClose={() => setSettingsModalOpen(false)} />}
      {isCheckpointsModalOpen && <CheckpointsModal onClose={() => setCheckpointsModalOpen(false)} />}
    </div>
  );
};

export default App;
