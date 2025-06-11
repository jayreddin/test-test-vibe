import React, { useState, useRef, useEffect } from 'react';
import { FilePlus, FolderPlus, Download, Upload, RefreshCw, X, Settings, Sidebar, Search, Server, Code } from 'lucide-react';
import { useAtom } from 'jotai';
import { filesAtom, currentFileAtom, settingsAtom } from '../atoms';
import { FileSystem } from '../services/FileSystem';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language }) => {
  const [files, setFiles] = useAtom(filesAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [settings, setSettings] = useAtom(settingsAtom);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  React.useEffect(() => {
    // Set the first file as current file if none selected
    if (!currentFile && files.length > 0) {
      setCurrentFile(files[0]);
    }
  }, [files, currentFile, setCurrentFile]);
  
  // Handle changes to text content
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  
  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Insert appropriate number of spaces based on tab size setting
      const spaces = ' '.repeat(settings.tabSize || 2);
      const newText = target.value.substring(0, start) + spaces + target.value.substring(end);
      
      // Update text and selection
      onChange(newText);
      
      // Set cursor position after the inserted tab
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handleDeleteFile = (fileName: string) => {
    setShowConfirmDelete(fileName);
  };

  const confirmDeleteFile = (fileName: string) => {
    // Remove the file from the files array
    const updatedFiles = files.filter(file => file.name !== fileName);
    setFiles(updatedFiles);
    
    // If the deleted file was the current file, set the first file as current
    if (currentFile && currentFile.name === fileName) {
      if (updatedFiles.length > 0) {
        setCurrentFile(updatedFiles[0]);
      } else {
        setCurrentFile(null);
      }
    }
    
    setShowConfirmDelete(null);
  };

  const cancelDeleteFile = () => {
    setShowConfirmDelete(null);
  };

  const handleNewFile = () => {
    setShowNewFileModal(true);
  };

  const handleNewFolder = () => {
    setShowNewFolderModal(true);
  };

  const createNewFile = () => {
    if (!newFileName.trim()) {
      alert('Please enter a file name');
      return;
    }

    // Add extension if not provided
    let fileName = newFileName;
    if (!fileName.includes('.')) {
      fileName += getDefaultExtension(fileName);
    }

    // Check if file already exists
    if (files.some(file => file.name === fileName)) {
      alert(`File ${fileName} already exists`);
      return;
    }

    // Determine language based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    let language = 'plaintext';
    if (extension === 'js') language = 'javascript';
    else if (extension === 'html') language = 'html';
    else if (extension === 'css') language = 'css';
    else if (extension === 'json') language = 'json';
    else if (extension === 'ts') language = 'typescript';
    else if (extension === 'tsx' || extension === 'jsx') language = 'typescript';
    else if (extension === 'md') language = 'markdown';

    // Create new file
    const newFile = {
      name: fileName,
      content: '',
      language,
      path: fileName,
    };

    // Add to files array and set as current
    setFiles([...files, newFile]);
    setCurrentFile(newFile);
    setNewFileName('');
    setShowNewFileModal(false);
  };

  const createNewFolder = () => {
    // In a real implementation, this would create a folder in the file system
    // For now, we'll just simulate it
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    // Simulate folder creation - since we don't have a full file system
    // in the UI, we'll just log it and close the modal
    console.log(`Creating folder: ${newFolderName}`);
    
    // In a real implementation with a file browser, we would add this folder to the file tree
    setNewFolderName('');
    setShowNewFolderModal(false);

    // If we were using FileSystem service from Puter:
    // FileSystem.createFolder(newFolderName);
  };

  const handleDownload = () => {
    if (!currentFile) return;

    // Create a blob with the current file content
    const blob = new Blob([currentFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    // Process each uploaded file
    Array.from(uploadedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) return;
        
        const content = event.target.result as string;
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        let language = 'plaintext';
        if (extension === 'js') language = 'javascript';
        else if (extension === 'html') language = 'html';
        else if (extension === 'css') language = 'css';
        else if (extension === 'json') language = 'json';
        else if (extension === 'ts') language = 'typescript';
        else if (extension === 'tsx' || extension === 'jsx') language = 'typescript';
        else if (extension === 'md') language = 'markdown';

        const newFile = {
          name: file.name,
          content,
          language,
          path: file.name,
        };

        // Check if file with same name exists
        const existingFileIndex = files.findIndex(f => f.name === file.name);
        if (existingFileIndex >= 0) {
          // Replace existing file
          const updatedFiles = [...files];
          updatedFiles[existingFileIndex] = newFile;
          setFiles(updatedFiles);
        } else {
          // Add new file
          setFiles([...files, newFile]);
        }
        
        // Set as current file
        setCurrentFile(newFile);
      };
      
      reader.readAsText(file);
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefresh = () => {
    // Reload the file from disk (if path exists)
    if (currentFile?.path) {
      // If we were using FileSystem service from Puter:
      // const refreshedContent = await FileSystem.loadFile(currentFile.path);
      // if (refreshedContent) {
      //   const updatedFile = { ...currentFile, content: refreshedContent };
      //   setCurrentFile(updatedFile);
      //   
      //   // Also update in files array
      //   setFiles(files.map(file => 
      //     file.name === currentFile.name ? updatedFile : file
      //   ));
      // }
      
      // For now, we'll just log it
      console.log(`Refreshing file: ${currentFile.name}`);
    }
  };

  const getDefaultExtension = (fileName: string) => {
    // Map common file types to extensions
    if (fileName.toLowerCase().includes('html')) return '.html';
    if (fileName.toLowerCase().includes('style') || fileName.toLowerCase().includes('css')) return '.css';
    if (fileName.toLowerCase().includes('script') || fileName.toLowerCase().includes('js')) return '.js';
    return '.js'; // Default to JavaScript
  };
  
  const handleFind = () => {
    if (!textareaRef.current || !findText) return;
    
    const text = textareaRef.current.value;
    const startPos = textareaRef.current.selectionEnd || 0;
    const searchResult = text.indexOf(findText, startPos);
    
    if (searchResult !== -1) {
      // Found a match, select it
      setSelectionStart(searchResult);
      setSelectionEnd(searchResult + findText.length);
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(searchResult, searchResult + findText.length);
    } else {
      // Try from the beginning if not found from current position
      const fromStartResult = text.indexOf(findText);
      if (fromStartResult !== -1) {
        setSelectionStart(fromStartResult);
        setSelectionEnd(fromStartResult + findText.length);
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(fromStartResult, fromStartResult + findText.length);
      } else {
        alert(`No matches found for "${findText}"`);
      }
    }
  };
  
  const handleReplace = () => {
    if (!textareaRef.current || !findText) return;
    
    const text = textareaRef.current.value;
    const selection = {
      start: textareaRef.current.selectionStart || 0,
      end: textareaRef.current.selectionEnd || 0
    };
    
    // Check if the current selection matches the find text
    if (selection.end > selection.start && text.substring(selection.start, selection.end) === findText) {
      // Replace the current selection
      const newText = text.substring(0, selection.start) + replaceText + text.substring(selection.end);
      onChange(newText);
      
      // Update the selection to after the replaced text
      const newPosition = selection.start + replaceText.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          // Find the next occurrence
          const nextMatch = text.indexOf(findText, selection.end);
          if (nextMatch !== -1) {
            textareaRef.current.setSelectionRange(nextMatch, nextMatch + findText.length);
          }
        }
      }, 0);
    } else {
      // No matching selection, find next
      handleFind();
    }
  };
  
  const handleReplaceAll = () => {
    if (!textareaRef.current || !findText) return;
    
    const text = textareaRef.current.value;
    const newText = text.split(findText).join(replaceText);
    onChange(newText);
    
    // Count replacements
    const count = (text.split(findText).length - 1);
    if (count > 0) {
      alert(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
    } else {
      alert(`No matches found for "${findText}"`);
    }
  };

  // Auto-apply selection if provided
  useEffect(() => {
    if (textareaRef.current && selectionStart !== selectionEnd) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }
  }, [selectionStart, selectionEnd]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800">
        <div className="flex overflow-x-auto hide-scrollbar">
          {files.map((file) => (
            <div
              key={file.name}
              className={`px-3 py-2 flex items-center cursor-pointer text-sm relative ${
                currentFile?.name === file.name 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span onClick={() => setCurrentFile(file)} className="mr-2">{file.name}</span>
              <button 
                onClick={() => handleDeleteFile(file.name)} 
                className="text-gray-500 hover:text-gray-300 focus:outline-none"
                title="Delete file"
              >
                <X size={14} />
              </button>
              
              {showConfirmDelete === file.name && (
                <div className="absolute z-10 top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-2 text-sm min-w-40">
                  <p className="mb-2">Delete {file.name}?</p>
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={cancelDeleteFile} 
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => confirmDeleteFile(file.name)} 
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Secondary Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-800">
        <div>
          <button className="text-gray-400 hover:text-white p-1 rounded">
            <span className="text-xs flex items-center">
              <Sidebar size={14} className="mr-1" /> Files
            </span>
          </button>
        </div>
        <div className="flex space-x-1">
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="File Settings"
            onClick={() => setShowEditorSettings(!showEditorSettings)}
          >
            <Settings size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="Find & Replace"
            onClick={() => setShowFindReplace(!showFindReplace)}
          >
            <Search size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="New File"
            onClick={handleNewFile}
          >
            <FilePlus size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="New Folder"
            onClick={handleNewFolder}
          >
            <FolderPlus size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="Download"
            onClick={handleDownload}
          >
            <Download size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="Upload"
            onClick={handleUpload}
          >
            <Upload size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white p-1 rounded" 
            title="Refresh"
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Editor Settings */}
      {showEditorSettings && (
        <div className="p-2 bg-gray-800 border-b border-gray-700">
          <h4 className="text-sm font-medium mb-2">Editor Settings</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={showLineNumbers}
                  onChange={() => setShowLineNumbers(!showLineNumbers)}
                  className="mr-2" 
                />
                Show Line Numbers
              </label>
            </div>
            <div>
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={settings.wordWrap}
                  onChange={() => {
                    const newSettings = { ...settings, wordWrap: !settings.wordWrap };
                    setSettings(newSettings);
                  }}
                  className="mr-2" 
                />
                Word Wrap
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <span className="mr-2">Font Size:</span>
                <select
                  value={settings.fontSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    const newSettings = { ...settings, fontSize: newSize };
                    setSettings(newSettings);
                  }}
                  className="bg-gray-700 border border-gray-600 rounded p-1"
                >
                  {[10, 12, 14, 16, 18, 20, 22, 24].map(size => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <span className="mr-2">Tab Size:</span>
                <select
                  value={settings.tabSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    const newSettings = { ...settings, tabSize: newSize };
                    setSettings(newSettings);
                  }}
                  className="bg-gray-700 border border-gray-600 rounded p-1"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Find and Replace */}
      {showFindReplace && (
        <div className="p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Find & Replace</h4>
            <button 
              onClick={() => setShowFindReplace(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 mb-2">
            <div>
              <input
                type="text"
                placeholder="Find"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Replace"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleFind}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              disabled={!findText}
            >
              Find
            </button>
            <button
              onClick={handleReplace}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              disabled={!findText}
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              disabled={!findText}
            >
              Replace All
            </button>
          </div>
        </div>
      )}
      
      {/* Simple Text Editor */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-900 text-white flex">
          {/* Line numbers */}
          {showLineNumbers && (
            <div className="bg-gray-800 text-gray-500 select-none py-2 text-right pr-2">
              {code.split('\n').map((_, i) => (
                <div key={i} className="font-mono text-xs">{i + 1}</div>
              ))}
            </div>
          )}
          
          {/* Text editor */}
          <textarea
            ref={textareaRef}
            className="flex-1 bg-gray-900 text-white font-mono p-2 resize-none outline-none overflow-auto"
            value={code}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: `${settings.fontSize}px`,
              whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
              tabSize: settings.tabSize || 2
            }}
          ></textarea>
        </div>
      </div>

      {/* Hidden file input for upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload}
        multiple
      />

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50\" onClick={() => setShowNewFileModal(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Create New File</h2>
            <div className="mb-4">
              <label htmlFor="fileName" className="block text-sm font-medium mb-2">File Name</label>
              <input
                id="fileName"
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Enter file name (e.g. main.js)"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewFileModal(false)} 
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={createNewFile} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNewFolderModal(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Create New Folder</h2>
            <div className="mb-4">
              <label htmlFor="folderName" className="block text-sm font-medium mb-2">Folder Name</label>
              <input
                id="folderName"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewFolderModal(false)} 
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={createNewFolder} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;