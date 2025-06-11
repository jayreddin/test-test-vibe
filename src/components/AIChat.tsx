import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Copy, Trash2, Edit, RefreshCw, 
  MessageSquare, Sparkles, Image, Maximize2, Minimize2, List, MessageCircleMore, Wand, 
  FileText, BrainCircuit, X, ChevronDown, ArrowDown, Download, Plus
} from 'lucide-react';
import { useAtom } from 'jotai';
import { settingsAtom, selectedModelAtom, aiModelsAtom, geminiModelsAtom } from '../atoms';
import { ChatService, ChatMessage } from '../services/ChatService';
import { AIService } from '../services/AIService';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [settings] = useAtom(settingsAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [aiModels] = useAtom(aiModelsAtom);
  const [geminiModels] = useAtom(geminiModelsAtom);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageGenMode, setIsImageGenMode] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [expandedImageIndex, setExpandedImageIndex] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [activeToolbar, setActiveToolbar] = useState<string | null>(null);
  const [chatSize, setChatSize] = useState({ width: 400, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const resizeStartPosRef = useRef({ x: 0, y: 0 });

  // Get available models
  const availableModels = settings.geminiApiEnabled 
    ? geminiModels.filter(model => model.enabled)
    : aiModels.filter(model => model.enabled);
    
  // Get OpenRouter models from localStorage
  const openRouterModels = JSON.parse(localStorage.getItem('openRouterModels') || '[]')
    .filter((model: any) => model.enabled);
    
  // Combined model list  
  const allModels = [...availableModels, ...openRouterModels];

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // @ts-ignore - TypeScript doesn't recognize webkitSpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInputMessage(prevInput => prevInput + ' ' + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        setErrorMessage(`Microphone error: ${event.error}`);
      };
      
      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start();
        }
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  // Load messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    }
    
    // Load saved chat size
    const savedSize = localStorage.getItem('chatSize');
    if (savedSize) {
      try {
        setChatSize(JSON.parse(savedSize));
      } catch (error) {
        console.error('Error loading chat size:', error);
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);
  
  // Save chat size when it changes
  useEffect(() => {
    localStorage.setItem('chatSize', JSON.stringify(chatSize));
  }, [chatSize]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dismiss error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Stop speaking when the chat is closed
  useEffect(() => {
    if (!isOpen && isSpeaking) {
      handleToggleSpeech();
    }
  }, [isOpen, isSpeaking]);
  
  // Setup resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - resizeStartPosRef.current.x;
      const deltaY = e.clientY - resizeStartPosRef.current.y;
      
      setChatSize(prev => ({
        width: Math.max(300, prev.width + deltaX),
        height: Math.max(300, prev.height + deltaY)
      }));
      
      resizeStartPosRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  // Handle starting resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Toggle speech recognition
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setErrorMessage('Speech recognition is not supported in this browser');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setErrorMessage('Failed to access microphone');
      }
    }
  };

  // Toggle text-to-speech
  const handleToggleSpeech = async () => {
    if (isSpeaking) {
      ChatService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      if (messages.length === 0) {
        setErrorMessage('No messages to speak');
        return;
      }
      
      const lastAssistantMessage = [...messages].reverse().find(msg => msg.role === 'assistant');
      if (lastAssistantMessage) {
        try {
          setIsSpeaking(true);
          await ChatService.speakResponse(lastAssistantMessage.content);
          // After speaking is complete
          setIsSpeaking(false);
        } catch (error: any) {
          setErrorMessage(error.message);
          setIsSpeaking(false);
        }
      } else {
        setErrorMessage('No assistant messages to speak');
      }
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      content: inputMessage,
      role: 'user',
      timestamp: ChatService.getTimestamp(),
      id: Date.now().toString()
    };

    // Add to messages
    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Handle image generation mode
      if (isImageGenMode) {
        setGeneratedImageUrl(null);
        const imageUrl = await ChatService.generateImage(inputMessage, selectedModel);
        setGeneratedImageUrl(imageUrl);
        
        // Add assistant message with the image
        const assistantMessage: ChatMessage = {
          content: `![Generated image for: "${inputMessage}"](${imageUrl})`,
          role: 'assistant',
          timestamp: ChatService.getTimestamp(),
          id: (Date.now() + 1).toString()
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      } 
      // Normal chat mode
      else {
        // Determine which model to use based on Deep Think mode
        let effectiveModel = selectedModel;
        if (isDeepThink) {
          // Override with a deep thinking model based on provider preference
          if (selectedModel.includes('claude')) {
            effectiveModel = 'claude-opus-4';
          } else if (selectedModel.includes('gpt')) {
            effectiveModel = 'gpt-4o';
          } else if (selectedModel.includes('gemini')) {
            effectiveModel = 'google/gemini-2.5-pro-preview-05-06';
          } else if (selectedModel.includes('mistral')) {
            effectiveModel = 'mistral-large-latest';
          } else if (selectedModel.includes('llama')) {
            effectiveModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
          } else {
            // Default deep thinking model
            effectiveModel = 'openrouter:anthropic/claude-3.5-sonnet';
          }
        }
        
        // Get response from AI
        const assistantMessage = await ChatService.sendMessage(
          messages,
          inputMessage,
          effectiveModel,
          isStreaming
        );
        
        // Add to messages
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        
        // If TTS is active, speak the response
        if (isSpeaking) {
          await ChatService.speakResponse(assistantMessage.content);
        }
      }
    } catch (error: any) {
      console.error('Error in chat:', error);
      setErrorMessage(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle enter key in chat input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message content to clipboard
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setErrorMessage('Copied to clipboard');
  };

  // Edit a message
  const handleEditMessage = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditingContent(content);
  };

  // Delete a message
  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
  };

  // Resend a message
  const handleResendMessage = (content: string) => {
    setInputMessage(content);
  };

  // Save edited message
  const handleSaveEdit = () => {
    if (editingMessageId) {
      setMessages(messages.map(msg => 
        msg.id === editingMessageId 
          ? {...msg, content: editingContent}
          : msg
      ));
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  // Toggle full screen chat
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Toggle toolbar sections
  const toggleToolbar = (name: string) => {
    if (activeToolbar === name) {
      setActiveToolbar(null);
    } else {
      setActiveToolbar(name);
    }
  };

  // Apply a prompt template
  const applyPromptTemplate = (template: string) => {
    setInputMessage(template);
    setActiveToolbar(null);
  };

  // Get model name for display
  const getModelDisplayName = () => {
    const model = allModels.find(m => m.id === selectedModel);
    return model ? model.name : selectedModel;
  };
  
  // Download generated image
  const handleDownloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Add image to chat as a new message
  const handleAddImageToChat = (url: string) => {
    const userMessage: ChatMessage = {
      content: "I'd like to discuss this image",
      role: 'user',
      timestamp: ChatService.getTimestamp(),
      id: Date.now().toString()
    };
    
    const imageMessage: ChatMessage = {
      content: `![Generated image](${url})`,
      role: 'assistant',
      timestamp: ChatService.getTimestamp(),
      id: (Date.now() + 1).toString()
    };
    
    setMessages([...messages, userMessage, imageMessage]);
    setExpandedImageIndex(null);
  };

  return (
    <div 
      ref={chatContainerRef}
      className={`fixed ${isFullscreen ? 'inset-0' : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
      } bg-gray-800 rounded-lg shadow-xl border border-gray-700 flex flex-col overflow-hidden z-50 transition-all duration-200`}
      style={{
        width: isFullscreen ? '100%' : `${chatSize.width}px`,
        height: isFullscreen ? '100%' : `${chatSize.height}px`
      }}
    >
      <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-800 cursor-move"
        onMouseDown={(e) => {
          if (!isFullscreen && e.target === e.currentTarget) {
            const startX = e.clientX;
            const startY = e.clientY;
            const chatRect = chatContainerRef.current?.getBoundingClientRect();
            if (!chatRect) return;
            
            const startLeft = chatRect.left;
            const startTop = chatRect.top;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              if (chatContainerRef.current) {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                chatContainerRef.current.style.right = 'auto';
                chatContainerRef.current.style.bottom = 'auto';
                chatContainerRef.current.style.left = `${startLeft + deltaX}px`;
                chatContainerRef.current.style.top = `${startTop + deltaY}px`;
              }
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }
        }}
      >
        <div className="flex items-center">
          <MessageSquare size={18} className="mr-2 text-blue-400" />
          <h2 className="text-lg font-medium">Chat</h2>
          
          <div className="ml-3 relative">
            <button 
              className="text-xs flex items-center bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
            >
              <span className="mr-1 truncate max-w-24">{getModelDisplayName()}</span>
              <ChevronDown size={14} />
            </button>
            
            {showModelDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded shadow-lg z-10 w-64 max-h-60 overflow-y-auto">
                {allModels.length > 0 ? (
                  <div>
                    {settings.geminiApiEnabled ? (
                      <div className="p-2 border-b border-gray-600">
                        <div className="text-xs font-medium text-gray-300 mb-1">Gemini Models</div>
                        {geminiModels.filter(model => model.enabled).map(model => (
                          <button
                            key={model.id}
                            className={`block w-full text-left px-3 py-1.5 text-sm rounded ${selectedModel === model.id ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setShowModelDropdown(false);
                            }}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 border-b border-gray-600">
                        <div className="text-xs font-medium text-gray-300 mb-1">Puter Models</div>
                        {aiModels.filter(model => model.enabled).map(model => (
                          <button
                            key={model.id}
                            className={`block w-full text-left px-3 py-1.5 text-sm rounded ${selectedModel === model.id ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setShowModelDropdown(false);
                            }}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {openRouterModels.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-300 mb-1">OpenRouter Models</div>
                        {openRouterModels.map((model: any) => (
                          <button
                            key={model.id}
                            className={`block w-full text-left px-3 py-1.5 text-sm rounded ${selectedModel === model.id ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setShowModelDropdown(false);
                            }}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-center text-gray-400 text-sm">
                    No models available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Text to Speech toggle */}
          <button
            onClick={handleToggleSpeech}
            className={`p-1 mr-1 rounded ${isSpeaking ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title={isSpeaking ? "Stop speaking" : "Speak responses"}
          >
            {isSpeaking ? (
              <VolumeX size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
          
          {/* Streaming toggle */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`p-1 mr-1 rounded ${isStreaming ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title={isStreaming ? "Disable streaming" : "Enable streaming"}
          >
            <List size={16} />
          </button>
          
          {/* Deep Think toggle */}
          <button
            onClick={() => setIsDeepThink(!isDeepThink)}
            className={`p-1 mr-1 rounded ${isDeepThink ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title={isDeepThink ? "Disable deep thinking" : "Enable deep thinking"}
          >
            <BrainCircuit size={16} />
          </button>
          
          {/* Image generation toggle */}
          <button
            onClick={() => setIsImageGenMode(!isImageGenMode)}
            className={`p-1 mr-1 rounded ${isImageGenMode ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            title={isImageGenMode ? "Switch to chat mode" : "Switch to image generation"}
          >
            <Image size={16} />
          </button>
          
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1 mr-1 text-gray-400 hover:text-white rounded"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        {/* Chat messages */}
        <div className="h-full overflow-y-auto p-3 bg-gray-900 chat-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-center">
              <div>
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a conversation</p>
                {isImageGenMode && (
                  <p className="text-xs mt-1 text-blue-400">Image generation mode is active</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="max-w-[90%] bg-gray-800 p-2 rounded-lg">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white mb-2"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <div 
                        className={`max-w-full rounded-lg p-3 ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white ml-12' 
                            : 'bg-gray-700 text-gray-100 mr-12'
                        }`}
                      >
                        {/* Message header with name and timestamp */}
                        <div className={`flex items-center text-xs mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <span className={`font-medium ${msg.role === 'user' ? 'text-blue-200' : 'text-green-200'}`}>
                            {msg.role === 'user' ? 'You' : getModelDisplayName()}
                          </span>
                          <span className="mx-1">·</span>
                          <span className="opacity-70">{msg.timestamp}</span>
                        </div>
                        
                        {/* Message content */}
                        <div className="message-content">
                          {msg.content.includes('![Generated image') ? (
                            <div>
                              <p className="mb-2 text-sm">{msg.content.split('![')[0]}</p>
                              <div className="relative">
                                <img 
                                  src={msg.content.match(/\((.*?)\)/)?.[1] || ''} 
                                  alt="Generated image" 
                                  className="rounded cursor-pointer max-w-full"
                                  onClick={() => setExpandedImageIndex(expandedImageIndex === msg.id ? null : msg.id)}
                                />
                                {expandedImageIndex === msg.id && (
                                  <div className="absolute left-0 bottom-0 right-0 bg-black bg-opacity-70 p-2 rounded-b flex justify-center space-x-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadImage(msg.content.match(/\((.*?)\)/)?.[1] || '');
                                      }}
                                      className="p-1 bg-blue-600 rounded text-white"
                                      title="Download image"
                                    >
                                      <Download size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddImageToChat(msg.content.match(/\((.*?)\)/)?.[1] || '');
                                      }}
                                      className="p-1 bg-green-600 rounded text-white"
                                      title="Add to chat"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedImageIndex(null);
                                      }}
                                      className="p-1 bg-red-600 rounded text-white"
                                      title="Close"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            msg.content.split('\n').map((line, i) => (
                              <React.Fragment key={i}>
                                {line}
                                {i < msg.content.split('\n').length - 1 && <br />}
                              </React.Fragment>
                            ))
                          )}
                        </div>
                      </div>
                      
                      {/* Message actions */}
                      <div 
                        className={`absolute bottom-0 ${
                          msg.role === 'user' ? 'left-0 transform -translate-x-full' : 'right-0 transform translate-x-full'
                        } bg-gray-800 rounded-md shadow-md p-1 flex opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <button 
                          onClick={() => handleCopyMessage(msg.content)} 
                          className="p-1 text-gray-400 hover:text-white rounded"
                          title="Copy"
                        >
                          <Copy size={14} />
                        </button>
                        {msg.role === 'user' && (
                          <button 
                            onClick={() => handleEditMessage(msg.id, msg.content)} 
                            className="p-1 text-gray-400 hover:text-white rounded"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleResendMessage(msg.role === 'user' ? msg.content : `Regarding: "${msg.content.substring(0, 30)}..."`)} 
                          className="p-1 text-gray-400 hover:text-white rounded"
                          title="Resend/Follow up"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)} 
                          className="p-1 text-red-400 hover:text-red-300 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg p-3 bg-gray-700 text-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-blink"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-blink" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-blink" style={{ animationDelay: '0.4s' }}></div>
                      <span className="text-xs text-gray-400 ml-1">
                        {isDeepThink ? 'Thinking deeply...' : isImageGenMode ? 'Generating image...' : 'Typing...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef}></div>
            </div>
          )}
        </div>
        
        {/* Image generation mode display for expanded view */}
        {isImageGenMode && generatedImageUrl && !isProcessing && expandedImageIndex === 'fullscreen' && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex flex-col items-center justify-center p-4 z-10">
            <div className="relative max-w-full max-h-full overflow-hidden rounded">
              <img 
                src={generatedImageUrl}
                alt="Generated image"
                className="max-w-full max-h-[70vh] object-contain"
              />
              <div className="absolute top-0 right-0 m-2 flex space-x-2">
                <button
                  onClick={() => handleDownloadImage(generatedImageUrl)}
                  className="p-2 bg-blue-600 rounded text-white"
                  title="Download image"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleAddImageToChat(generatedImageUrl)}
                  className="p-2 bg-green-600 rounded text-white"
                  title="Add to chat"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  onClick={() => setExpandedImageIndex(null)}
                  className="p-2 bg-red-600 rounded text-white"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error notification */}
        {errorMessage && (
          <div className="absolute top-2 right-2 left-2 bg-red-500 text-white p-2 rounded text-sm flex justify-between items-center app-notification">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      
      {/* Toolbar */}
      <div className="px-3 py-1 border-t border-gray-700 flex justify-between overflow-x-auto hide-scrollbar">
        <button 
          className={`px-2 py-1 text-xs rounded ${activeToolbar === 'prompts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => toggleToolbar('prompts')}
        >
          <MessageCircleMore size={14} className="inline-block mr-1" /> Prompt
        </button>
        <button 
          className={`px-2 py-1 text-xs rounded ${activeToolbar === 'story' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => toggleToolbar('story')}
        >
          <FileText size={14} className="inline-block mr-1" /> Story
        </button>
        <button 
          className={`px-2 py-1 text-xs rounded ${activeToolbar === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => toggleToolbar('summary')}
        >
          <List size={14} className="inline-block mr-1" /> Summarize
        </button>
        <button 
          className={`px-2 py-1 text-xs rounded ${activeToolbar === 'improve' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          onClick={() => toggleToolbar('improve')}
        >
          <Wand size={14} className="inline-block mr-1" /> Improve
        </button>
      </div>
      
      {/* Active toolbar content */}
      {activeToolbar && (
        <div className="px-3 py-2 border-t border-gray-700 bg-gray-800 max-h-40 overflow-y-auto">
          {activeToolbar === 'prompts' && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Prompt Templates</h4>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Explain this concept to me like I'm 5 years old: ")}
                >
                  Explain like I'm 5
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Write a detailed technical explanation about: ")}
                >
                  Technical explanation
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Compare and contrast the following: ")}
                >
                  Compare & Contrast
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Provide step-by-step instructions for: ")}
                >
                  Step-by-step guide
                </button>
              </div>
            </div>
          )}
          
          {activeToolbar === 'story' && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Story Generators</h4>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Write a short story about: ")}
                >
                  Short story
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Write a creative scenario where: ")}
                >
                  Creative scenario
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Continue this story: ")}
                >
                  Continue story
                </button>
              </div>
            </div>
          )}
          
          {activeToolbar === 'summary' && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Summarization</h4>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Summarize this text in 3 bullet points: ")}
                >
                  Bullet point summary
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Create a one-paragraph summary of: ")}
                >
                  Paragraph summary
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Explain the key concepts from: ")}
                >
                  Key concepts
                </button>
              </div>
            </div>
          )}
          
          {activeToolbar === 'improve' && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Improvement Tools</h4>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Improve this writing for clarity and conciseness: ")}
                >
                  Improve writing
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Check this text for errors and suggest improvements: ")}
                >
                  Check for errors
                </button>
                <button 
                  className="text-xs p-2 bg-gray-700 hover:bg-gray-600 rounded text-left" 
                  onClick={() => applyPromptTemplate("Rewrite this to be more engaging and persuasive: ")}
                >
                  Make more engaging
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Input area */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center">
          <button
            className={`p-2 rounded-full mr-2 ${isSpeaking ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            onClick={handleToggleSpeech}
            title={isSpeaking ? "Stop speaking" : "Speak responses"}
          >
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            className={`p-2 rounded-full mr-2 ${isRecording ? 'bg-red-500 mic-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Record voice input"}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <div className="flex-1 flex">
            <textarea
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={isImageGenMode ? "Describe the image you want to generate..." : "Type your message..."}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            ></textarea>
            <button 
              className={`${isProcessing ? 'bg-gray-600' : isImageGenMode ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 rounded-r-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
            >
              {isProcessing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
        
        <div className="flex mt-2 justify-between items-center">
          <div className="flex items-center space-x-2">
            {isStreaming && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Streaming</span>
            )}
            {isDeepThink && (
              <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">Deep Think</span>
            )}
          </div>
          
          {isImageGenMode && (
            <span className="text-xs bg-pink-600 text-white px-1.5 py-0.5 rounded">Image Generation</span>
          )}
        </div>
      </div>
      
      {/* Resize handle */}
      {!isFullscreen && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-end justify-end"
          onMouseDown={handleResizeStart}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400">
            <path d="M0 10L10 10L10 0" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default AIChat