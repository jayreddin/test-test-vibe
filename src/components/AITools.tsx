
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Save, Code, Wand2, Brush, Type, Settings, Move, AlignLeft, AlignCenter, AlignRight, AlignJustify, Volume2 } from 'lucide-react';
import { useAtom } from 'jotai';
import { checkpointsAtom, selectedModelAtom, filesAtom, currentFileAtom, checkpointsModalOpenAtom, Checkpoint, settingsAtom } from '../atoms';
import { AIService } from '../services/AIService';
import { ChatService } from '../services/ChatService';

interface AIToolsProps {
  onGenerateCode: (generatedCode: string) => void;
  showModifyTools: boolean;
}

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose }) => {
  const [selectedColor, setSelectedColor] = useState(color || '#ffffff');
  const [opacity, setOpacity] = useState(100);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Parse opacity from rgba color if present
  useEffect(() => {
    if (color && color.startsWith('rgba')) {
      const match = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
      if (match && match[1]) {
        setOpacity(Math.round(parseFloat(match[1]) * 100));
      }
    }
  }, [color]);

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(e.target.value);
    if (opacity < 100) {
      onChange(hexToRgba(e.target.value, opacity));
    } else {
      onChange(e.target.value);
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseInt(e.target.value);
    setOpacity(newOpacity);
    if (newOpacity < 100) {
      onChange(hexToRgba(selectedColor, newOpacity));
    } else {
      onChange(selectedColor);
    }
  };

  // Common colors palette
  const commonColors = [
    '#000000', '#ffffff', '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', 
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={pickerRef} className="absolute z-10 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-3 w-56">
      <div className="mb-3">
        <input 
          type="color" 
          value={selectedColor} 
          onChange={handleColorChange} 
          className="w-full h-10 cursor-pointer rounded border border-gray-700"
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Opacity: {opacity}%</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={opacity} 
          onChange={handleOpacityChange}
          className="w-full" 
        />
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Common Colors:</label>
        <div className="grid grid-cols-6 gap-1">
          {commonColors.map((color, index) => (
            <div 
              key={index} 
              className="w-full aspect-square border border-gray-700 rounded cursor-pointer" 
              style={{ backgroundColor: color }}
              onClick={() => {
                setSelectedColor(color);
                if (opacity < 100) {
                  onChange(hexToRgba(color, opacity));
                } else {
                  onChange(color);
                }
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <input 
          type="text"
          value={selectedColor}
          onChange={e => {
            setSelectedColor(e.target.value);
            onChange(e.target.value);
          }}
          className="flex-1 p-1 text-xs bg-gray-700 border border-gray-600 rounded"
        />
        <button 
          className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const AITools: React.FC<AIToolsProps> = ({ onGenerateCode, showModifyTools }) => {
  const [prompt, setPrompt] = useState('');
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [checkpoints, setCheckpoints] = useAtom(checkpointsAtom);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel] = useAtom(selectedModelAtom);
  const [settings] = useAtom(settingsAtom);
  const [files] = useAtom(filesAtom);
  const [currentFile, setCurrentFile] = useAtom(currentFileAtom);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [elementContent, setElementContent] = useState('');
  const [elementStyles, setElementStyles] = useState<Record<string, string>>({
    color: '',
    backgroundColor: '',
    width: '',
    height: '',
    padding: '',
    margin: '',
    position: '',
    display: '',
    border: '',
    borderColor: '',
    borderRadius: '',
    textAlign: '',
    alignItems: '',
    fontFamily: '',
    fontWeight: '',
    opacity: ''
  });
  const [generatedFiles, setGeneratedFiles] = useState<{
    html: string;
    css: string;
    js: string;
  }>({
    html: '',
    css: '',
    js: ''
  });
  const [_, setCheckpointsModalOpen] = useAtom(checkpointsModalOpenAtom);
  const [aiModifyPrompt, setAiModifyPrompt] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [isReorderingMenu, setIsReorderingMenu] = useState(false);
  const [menuItems, setMenuItems] = useState<{id: string, text: string}[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [showSection, setShowSection] = useState<'generate' | 'modify' | 'edit' | 'checkpoints'>('generate');

  return (
    <div className="h-full bg-gray-800 p-4 overflow-y-auto flex flex-col" ref={containerRef}>
      {/* Component JSX content */}
    </div>
  );
};

export default AITools