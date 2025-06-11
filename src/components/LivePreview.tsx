import React, { useEffect, useState, useRef } from 'react';
import { Maximize2, RefreshCw, Smartphone, Tablet, Monitor, ExternalLink } from 'lucide-react';
import { FileData } from '../atoms';
import { useAtom } from 'jotai';
import { settingsAtom } from '../atoms';

interface LivePreviewProps {
  files: FileData[];
}

interface SelectedElement {
  element: HTMLElement;
  tagName: string;
  className: string;
  id: string;
  text?: string;
  attributes?: Record<string, any>;
}

const LivePreview: React.FC<LivePreviewProps> = ({ files }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [deviceSize, setDeviceSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [popOutWindow, setPopOutWindow] = useState<Window | null>(null);
  const [settings] = useAtom(settingsAtom);
  const [popoutSelectedElement, setPopoutSelectedElement] = useState<any>(null);
  const [popoutElementContent, setPopoutElementContent] = useState('');
  const [popoutElementStyles, setPopoutElementStyles] = useState<Record<string, string>>({});
  const [popoutAIModifyPrompt, setPopoutAIModifyPrompt] = useState('');
  
  // Create a reference to store the interval ID
  const syncIntervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Create HTML preview
    const htmlFile = files.find(file => file.name.endsWith('.html'));
    if (htmlFile) {
      let content = htmlFile.content;
      
      // Inject other files
      files.forEach(file => {
        if (file.name.endsWith('.js')) {
          content = content.replace(
            `<script src="${file.name}"></script>`,
            `<script>${file.content}</script>`
          );
        }
        if (file.name.endsWith('.css')) {
          content = content.replace(
            `<link rel="stylesheet" href="${file.name}">`,
            `<style>${file.content}</style>`
          );
        }
      });

      // Add highlight functionality if enabled
      if (highlightEnabled) {
        // Add custom script to handle element selection in iframe
        const highlightScript = `
          <script>
            document.body.addEventListener('mouseover', function(e) {
              const target = e.target;
              if (target !== document.body && target !== document.documentElement) {
                target.style.outline = '2px solid #3b82f6';
                target.style.outlineOffset = '2px';
                e.stopPropagation();
              }
            });

            document.body.addEventListener('mouseout', function(e) {
              const target = e.target;
              if (target !== document.body && target !== document.documentElement) {
                target.style.outline = '';
                target.style.outlineOffset = '';
              }
            });

            document.body.addEventListener('click', function(e) {
              if (e.target !== document.body && e.target !== document.documentElement) {
                const target = e.target;
                const elementInfo = {
                  tagName: target.tagName.toLowerCase(),
                  className: target.className,
                  id: target.id,
                  text: target.textContent,
                  attributes: {}
                };
                
                // Get all attributes
                Array.from(target.attributes).forEach(attr => {
                  elementInfo.attributes[attr.name] = attr.value;
                });
                
                // Get computed styles for element properties
                const computedStyle = window.getComputedStyle(target);
                elementInfo.attributes.style = '';
                
                // Add key styles to attributes
                const styleProperties = [
                  'color', 'backgroundColor', 'width', 'height', 
                  'padding', 'margin', 'position', 'display', 
                  'border', 'borderColor', 'borderRadius', 
                  'textAlign', 'alignItems', 'fontFamily', 
                  'fontWeight', 'opacity'
                ];
                
                styleProperties.forEach(prop => {
                  if (computedStyle[prop]) {
                    if (elementInfo.attributes.style) {
                      elementInfo.attributes.style += '; ';
                    }
                    // Convert camelCase to kebab-case for CSS properties
                    const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                    elementInfo.attributes.style += cssProp + ': ' + computedStyle[prop];
                  }
                });
                
                // Send message to parent window
                window.parent.postMessage({
                  type: 'elementSelected',
                  element: elementInfo
                }, '*');
                
                e.preventDefault();
                e.stopPropagation();
              }
            }, true);

            // Listen for messages from parent to update elements
            window.addEventListener('message', function(event) {
              if (event.data.type === 'updateElement') {
                let element = null;
                
                // Try finding by ID first
                if (event.data.elementId) {
                  element = document.getElementById(event.data.elementId);
                }
                
                // If no element found by ID, try by class or tag
                if (!element && event.data.className) {
                  element = document.querySelector('.' + event.data.className.split(' ')[0]);
                }
                
                if (!element && event.data.tagName) {
                  element = document.querySelector(event.data.tagName);
                }
                
                if (element) {
                  // Update content if provided
                  if (event.data.content !== undefined) {
                    element.textContent = event.data.content;
                  }
                  
                  // Update styles if provided
                  if (event.data.styles) {
                    Object.entries(event.data.styles).forEach(([key, value]) => {
                      if (value) {
                        element.style[key] = value;
                      }
                    });
                  }
                }
              }
              
              // Toggle selection mode
              if (event.data.type === 'toggleSelection') {
                const selectionEnabled = event.data.enabled;
                
                // Only set up listeners when selection is enabled
                if (selectionEnabled) {
                  // Event listeners are already set up in this script
                  console.log('Selection mode enabled');
                } else {
                  // Remove all outlines when disabling selection mode
                  document.querySelectorAll('*').forEach(el => {
                    el.style.outline = '';
                    el.style.outlineOffset = '';
                  });
                  console.log('Selection mode disabled');
                }
              }
              
              // Update menu order
              if (event.data.type === 'updateMenuOrder') {
                const menuElement = document.getElementById(event.data.elementId) || 
                                    document.querySelector(event.data.tagName);
                                    
                if (menuElement && menuElement.children && menuElement.children.length > 0) {
                  // Simple simulation of menu reordering
                  const items = Array.from(menuElement.children);
                  for (let i = 0; i < items.length && i < event.data.menuItems.length; i++) {
                    const newText = event.data.menuItems[i].text;
                    if (items[i].textContent !== newText) {
                      items[i].textContent = newText;
                    }
                  }
                }
              }
            });
          </script>
        `;
        
        // Insert the script right before the closing body tag
        content = content.replace('</body>', `${highlightScript}</body>`);
      } else {
        // If highlight is disabled, make sure any previously added script is removed
        // and all outlines are cleared in the iframe
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            doc.querySelectorAll('*').forEach((el: Element) => {
              (el as HTMLElement).style.outline = '';
              (el as HTMLElement).style.outlineOffset = '';
            });
          }
        }
      }
      
      setHtmlContent(content);
      
      // If pop-out window exists, update its content
      if (popOutWindow && !popOutWindow.closed) {
        const popOutDoc = popOutWindow.document;
        popOutDoc.open();
        popOutDoc.write(content);
        popOutDoc.close();
      }
    }
  }, [files, highlightEnabled]);

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'elementSelected') {
        console.log('Element selected:', event.data.element);
        // Handle the selected element
        setSelectedElement(event.data.element);
        
        // Also update the popout element if it's from the popout
        if (event.source === popOutWindow) {
          setPopoutSelectedElement(event.data.element);
          setPopoutElementContent(event.data.element.text || '');
          
          // Initialize element styles
          const newStyles: Record<string, string> = {
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
          };
          
          // Extract styles from style attribute if available
          if (event.data.element.attributes?.style) {
            const styleString = event.data.element.attributes.style;
            const styleProps = styleString.split(';');
            
            styleProps.forEach((prop: string) => {
              const [key, value] = prop.split(':').map(item => item.trim());
              if (key && value) {
                // Convert camelCase to kebab-case
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                newStyles[cssKey] = value;
                
                // Also set specific properties directly
                if (key === 'color' || key === 'backgroundColor' || 
                    key === 'width' || key === 'height' || 
                    key === 'padding' || key === 'margin' || 
                    key === 'position' || key === 'display' || 
                    key === 'border' || key === 'borderColor' || 
                    key === 'borderRadius' || key === 'textAlign' || 
                    key === 'alignItems' || key === 'fontFamily' || 
                    key === 'fontWeight' || key === 'opacity') {
                  newStyles[key] = value;
                }
              }
            });
          }
          
          setPopoutElementStyles(newStyles);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [popOutWindow]);
  
  // Listen for external toggle events
  useEffect(() => {
    const handleToggleElementSelection = (event: CustomEvent) => {
      setHighlightEnabled(event.detail.enabled);
    };

    window.addEventListener('toggleElementSelection', handleToggleElementSelection as EventListener);
    return () => {
      window.removeEventListener('toggleElementSelection', handleToggleElementSelection as EventListener);
    };
  }, []);
  
  const getDeviceClass = () => {
    switch (deviceSize) {
      case 'mobile': return 'w-[320px] mx-auto';
      case 'tablet': return 'w-[768px] mx-auto';
      case 'desktop': return 'w-full';
      default: return 'w-full';
    }
  };
  
  const refreshPreview = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = 'about:blank';
      setTimeout(() => {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
        }
      }, 50);
    }
    
    // Also refresh pop-out window if it exists
    if (popOutWindow && !popOutWindow.closed) {
      popOutWindow.document.open();
      popOutWindow.document.write(htmlContent);
      popOutWindow.document.close();
    }
  };

  const toggleElementSelection = () => {
    const newState = !highlightEnabled;
    setHighlightEnabled(newState);
    
    // Dispatch event to AITools component to sync the toggle state
    window.dispatchEvent(new CustomEvent('livePreviewToggleSelection', { 
      detail: { enabled: newState } 
    }));
    
    // When disabling highlight mode, clear any selected element
    if (highlightEnabled) {
      setSelectedElement(null);
    }
    
    // Refresh the preview to apply the changes
    setTimeout(refreshPreview, 50);
  };

  const applyPopoutElementChanges = () => {
    // Apply element changes from popout window
    if (popOutWindow && popoutSelectedElement) {
      popOutWindow.postMessage({
        type: 'updateElement',
        elementId: popoutSelectedElement.id,
        tagName: popoutSelectedElement.tagName,
        className: popoutSelectedElement.className,
        content: popoutElementContent,
        styles: popoutElementStyles
      }, '*');
    }
  };

  const applyPopoutAIElementChanges = async () => {
    if (!popoutAIModifyPrompt.trim() || !popoutSelectedElement) return;
    
    // In a real implementation, this would call the AI service
    try {
      const modifiedStyles = await window.parent.AIService.modifyElementStyles(
        popoutSelectedElement, 
        popoutAIModifyPrompt, 
        'gpt-4o-mini'
      );
      
      setPopoutElementStyles({
        ...popoutElementStyles,
        ...modifiedStyles
      });
      
      applyPopoutElementChanges();
    } catch (error) {
      console.error("Error in pop-out window:", error);
      
      // Fallback styling
      setPopoutElementStyles({
        ...popoutElementStyles,
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '10px',
        borderRadius: '5px'
      });
      
      applyPopoutElementChanges();
    }
  };
  
  const openPopOutWindow = () => {
    // Close any existing pop-out window
    if (popOutWindow && !popOutWindow.closed) {
      popOutWindow.close();
    }
    
    // Open new pop-out window
    const newWindow = window.open('', 'LivePreview', 'width=800,height=600,resizable=yes');
    if (newWindow) {
      setPopOutWindow(newWindow);
      
      // Add content and styles to the pop-out window
      newWindow.document.open();
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Live Preview - Vibe Code Project</title>
          <style>
            body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
            .controls { background: #1f2937; color: white; padding: 8px; display: flex; justify-content: space-between; align-items: center; }
            .controls button { background: #374151; border: none; color: white; padding: 6px 10px; margin: 0 4px; border-radius: 4px; cursor: pointer; }
            .controls button:hover { background: #4b5563; }
            .controls .device-controls button.active { background: #3b82f6; }
            .preview-container { height: calc(100vh - 40px); background: white; overflow: auto; }
            .toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; }
            .toggle-switch input { opacity: 0; width: 0; height: 0; }
            .toggle-switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #374151; transition: .4s; border-radius: 34px; }
            .toggle-switch .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
            .toggle-switch input:checked + .slider { background-color: #3b82f6; }
            .toggle-switch input:checked + .slider:before { transform: translateX(20px); }
            .element-editor { background: #1f2937; padding: 10px; color: white; display: none; border-top: 1px solid #374151; max-height: 300px; overflow-y: auto; }
            .element-editor h3 { font-size: 14px; margin-bottom: 10px; }
            .element-editor .element-form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .element-editor .element-form label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 4px; }
            .element-editor .element-form input, .element-editor .element-form select { width: 100%; padding: 6px; background: #374151; border: 1px solid #4b5563; color: white; border-radius: 4px; font-size: 12px; }
            .element-editor .element-form button { background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px; }
            .element-editor .element-form button:hover { background: #2563eb; }
            .element-editor .full-width { grid-column: span 2; }
            .color-picker { position: absolute; background: #1f2937; border: 1px solid #374151; border-radius: 4px; padding: 8px; z-index: 100; width: 200px; }
            .color-picker input[type="color"] { width: 100%; height: 30px; border: none; }
            .color-picker input[type="range"] { width: 100%; }
            .color-swatch { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 8px; }
            .color-swatch div { height: 20px; border-radius: 2px; cursor: pointer; border: 1px solid #4b5563; }
          </style>
        </head>
        <body>
          <div class="controls">
            <div class="left-controls">
              <label class="toggle-switch">
                <input type="checkbox" id="element-selection" ${highlightEnabled ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <span style="font-size: 12px; margin-left: 8px;">Select Elements</span>
            </div>
            <div class="device-controls">
              <button id="mobile-view" ${deviceSize === 'mobile' ? 'class="active"' : ''}>Mobile</button>
              <button id="tablet-view" ${deviceSize === 'tablet' ? 'class="active"' : ''}>Tablet</button>
              <button id="desktop-view" ${deviceSize === 'desktop' ? 'class="active"' : ''}>Desktop</button>
              <button id="refresh-preview">Refresh</button>
            </div>
          </div>
          <div id="preview-container" class="${getDeviceClass()} preview-container">
            ${htmlContent}
          </div>
          
          <div id="element-editor" class="element-editor">
            <h3>3. Edit Element</h3>
            <div class="element-info" style="margin-bottom: 10px; font-size: 12px;"></div>
            
            <div class="element-form">
              <div class="full-width">
                <label for="element-content">Text Content:</label>
                <input type="text" id="element-content" placeholder="Element text content">
              </div>
              
              <div>
                <label for="text-color">Text Color:</label>
                <input type="text" id="text-color" placeholder="#ffffff">
              </div>
              
              <div>
                <label for="bg-color">Background Color:</label>
                <input type="text" id="bg-color" placeholder="#333333">
              </div>
              
              <div>
                <label for="element-width">Width:</label>
                <input type="text" id="element-width" placeholder="100px">
              </div>
              
              <div>
                <label for="element-height">Height:</label>
                <input type="text" id="element-height" placeholder="100px">
              </div>
              
              <div>
                <label for="element-padding">Padding:</label>
                <input type="text" id="element-padding" placeholder="10px">
              </div>
              
              <div>
                <label for="element-margin">Margin:</label>
                <input type="text" id="element-margin" placeholder="10px">
              </div>
              
              <div>
                <label for="element-border">Border:</label>
                <input type="text" id="element-border" placeholder="1px solid black">
              </div>
              
              <div>
                <label for="border-radius">Border Radius:</label>
                <input type="text" id="border-radius" placeholder="5px">
              </div>
              
              <div>
                <label for="text-align">Text Alignment:</label>
                <select id="text-align">
                  <option value="">Default</option>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
              
              <div>
                <label for="font-family">Font:</label>
                <select id="font-family">
                  <option value="">Default</option>
                  <option value="'Arial', sans-serif">Arial</option>
                  <option value="'Helvetica', sans-serif">Helvetica</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Georgia', serif">Georgia</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>
              
              <div class="full-width">
                <button id="apply-changes" class="full-width">Apply Changes</button>
              </div>
              
              <div class="full-width">
                <label for="ai-prompt">Describe changes with AI:</label>
                <input type="text" id="ai-prompt" placeholder="make this button rounded with a blue border">
                <button id="apply-ai-changes">Apply AI Changes</button>
              </div>
            </div>
          </div>
          
          <script>
            // Element selection toggle
            const elementSelection = document.getElementById('element-selection');
            const elementEditor = document.getElementById('element-editor');
            let selectedElement = null;
            
            elementSelection.addEventListener('change', function() {
              window.opener.postMessage({
                type: 'popoutToggleSelection',
                enabled: this.checked
              }, '*');
              
              if (!this.checked) {
                elementEditor.style.display = 'none';
                selectedElement = null;
                document.querySelector('.element-info').textContent = '';
              }
            });
            
            // Device view buttons
            document.getElementById('mobile-view').addEventListener('click', function() {
              window.opener.postMessage({
                type: 'popoutChangeDevice',
                device: 'mobile'
              }, '*');
              
              // Update local preview
              document.getElementById('preview-container').className = 'w-[320px] mx-auto preview-container';
              
              // Update active button
              document.querySelectorAll('.device-controls button').forEach(btn => btn.classList.remove('active'));
              this.classList.add('active');
            });
            
            document.getElementById('tablet-view').addEventListener('click', function() {
              window.opener.postMessage({
                type: 'popoutChangeDevice',
                device: 'tablet'
              }, '*');
              
              // Update local preview
              document.getElementById('preview-container').className = 'w-[768px] mx-auto preview-container';
              
              // Update active button
              document.querySelectorAll('.device-controls button').forEach(btn => btn.classList.remove('active'));
              this.classList.add('active');
            });
            
            document.getElementById('desktop-view').addEventListener('click', function() {
              window.opener.postMessage({
                type: 'popoutChangeDevice',
                device: 'desktop'
              }, '*');
              
              // Update local preview
              document.getElementById('preview-container').className = 'w-full preview-container';
              
              // Update active button
              document.querySelectorAll('.device-controls button').forEach(btn => btn.classList.remove('active'));
              this.classList.add('active');
            });
            
            // Refresh button
            document.getElementById('refresh-preview').addEventListener('click', function() {
              window.opener.postMessage({
                type: 'popoutRefresh'
              }, '*');
            });
            
            // Listen for window close to notify parent
            window.addEventListener('beforeunload', function() {
              window.opener.postMessage({
                type: 'popoutClosed'
              }, '*');
            });
            
            // Form handlers
            const contentInput = document.getElementById('element-content');
            const textColorInput = document.getElementById('text-color');
            const bgColorInput = document.getElementById('bg-color');
            const widthInput = document.getElementById('element-width');
            const heightInput = document.getElementById('element-height');
            const paddingInput = document.getElementById('element-padding');
            const marginInput = document.getElementById('element-margin');
            const borderInput = document.getElementById('element-border');
            const borderRadiusInput = document.getElementById('border-radius');
            const textAlignInput = document.getElementById('text-align');
            const fontFamilyInput = document.getElementById('font-family');
            const applyButton = document.getElementById('apply-changes');
            const aiPromptInput = document.getElementById('ai-prompt');
            const applyAiButton = document.getElementById('apply-ai-changes');
            
            // Handle element selection from preview
            document.addEventListener('click', function(e) {
              if (elementSelection.checked && 
                  e.target.closest('#preview-container') && 
                  e.target !== document.getElementById('preview-container')) {
                
                // Get the selected element
                selectedElement = e.target;
                
                // Show the element editor
                elementEditor.style.display = 'block';
                
                // Update element info
                const tagName = selectedElement.tagName.toLowerCase();
                const className = selectedElement.className ? '.' + selectedElement.className.split(' ')[0] : '';
                const id = selectedElement.id ? '#' + selectedElement.id : '';
                document.querySelector('.element-info').textContent = 'Editing: ' + tagName + className + id;
                
                // Get computed styles for the element
                const computedStyle = window.getComputedStyle(selectedElement);
                
                // Update form values with actual computed styles
                contentInput.value = selectedElement.textContent || '';
                textColorInput.value = computedStyle.color || '';
                bgColorInput.value = computedStyle.backgroundColor || '';
                widthInput.value = computedStyle.width || '';
                heightInput.value = computedStyle.height || '';
                paddingInput.value = computedStyle.padding || '';
                marginInput.value = computedStyle.margin || '';
                borderInput.value = computedStyle.border || '';
                borderRadiusInput.value = computedStyle.borderRadius || '';
                textAlignInput.value = computedStyle.textAlign || '';
                fontFamilyInput.value = computedStyle.fontFamily || '';
                
                // Send element info to parent window
                window.opener.postMessage({
                  type: 'elementSelected',
                  element: {
                    tagName,
                    className: selectedElement.className,
                    id: selectedElement.id,
                    text: selectedElement.textContent,
                    attributes: {
                      style: selectedElement.getAttribute('style') || '',
                      computedStyle: {
                        color: computedStyle.color,
                        backgroundColor: computedStyle.backgroundColor,
                        width: computedStyle.width,
                        height: computedStyle.height,
                        padding: computedStyle.padding,
                        margin: computedStyle.margin,
                        border: computedStyle.border,
                        borderRadius: computedStyle.borderRadius,
                        textAlign: computedStyle.textAlign,
                        fontFamily: computedStyle.fontFamily,
                        fontWeight: computedStyle.fontWeight,
                        position: computedStyle.position,
                        display: computedStyle.display
                      }
                    }
                  }
                }, '*');
              }
            });
            
            // Apply Changes button
            applyButton.addEventListener('click', function() {
              if (!selectedElement) return;
              
              // Update the element
              if (contentInput.value) {
                selectedElement.textContent = contentInput.value;
              }
              
              // Update styles
              if (textColorInput.value) selectedElement.style.color = textColorInput.value;
              if (bgColorInput.value) selectedElement.style.backgroundColor = bgColorInput.value;
              if (widthInput.value) selectedElement.style.width = widthInput.value;
              if (heightInput.value) selectedElement.style.height = heightInput.value;
              if (paddingInput.value) selectedElement.style.padding = paddingInput.value;
              if (marginInput.value) selectedElement.style.margin = marginInput.value;
              if (borderInput.value) selectedElement.style.border = borderInput.value;
              if (borderRadiusInput.value) selectedElement.style.borderRadius = borderRadiusInput.value;
              if (textAlignInput.value) selectedElement.style.textAlign = textAlignInput.value;
              if (fontFamilyInput.value) selectedElement.style.fontFamily = fontFamilyInput.value;
              
              // Notify parent of changes
              window.opener.postMessage({
                type: 'elementUpdated',
                element: {
                  tagName: selectedElement.tagName.toLowerCase(),
                  className: selectedElement.className,
                  id: selectedElement.id,
                  text: selectedElement.textContent,
                  styles: {
                    color: textColorInput.value,
                    backgroundColor: bgColorInput.value,
                    width: widthInput.value,
                    height: heightInput.value,
                    padding: paddingInput.value,
                    margin: marginInput.value,
                    border: borderInput.value,
                    borderRadius: borderRadiusInput.value,
                    textAlign: textAlignInput.value,
                    fontFamily: fontFamilyInput.value
                  }
                }
              }, '*');
            });
            
            // Apply AI Changes button
            applyAiButton.addEventListener('click', function() {
              if (!selectedElement || !aiPromptInput.value) return;
              
              // Send the AI prompt to parent window
              window.opener.postMessage({
                type: 'applyAiChanges',
                element: {
                  tagName: selectedElement.tagName.toLowerCase(),
                  className: selectedElement.className,
                  id: selectedElement.id
                },
                prompt: aiPromptInput.value
              }, '*');
            });
            
            // Listen for element updates from parent
            window.addEventListener('message', function(event) {
              if (event.data.type === 'updateElementFromParent') {
                const { styles, content } = event.data;
                
                // Find element
                let element = null;
                if (event.data.elementId) {
                  element = document.getElementById(event.data.elementId);
                } else if (event.data.selector) {
                  element = document.querySelector(event.data.selector);
                } else if (selectedElement) {
                  element = selectedElement;
                }
                
                if (element) {
                  // Update content
                  if (content) {
                    element.textContent = content;
                    contentInput.value = content;
                  }
                  
                  // Update styles
                  if (styles) {
                    Object.entries(styles).forEach(([key, value]) => {
                      if (value) {
                        element.style[key] = value;
                      }
                    });
                    
                    // Update form values
                    if (styles.color) textColorInput.value = styles.color;
                    if (styles.backgroundColor) bgColorInput.value = styles.backgroundColor;
                    if (styles.width) widthInput.value = styles.width;
                    if (styles.height) heightInput.value = styles.height;
                    if (styles.padding) paddingInput.value = styles.padding;
                    if (styles.margin) marginInput.value = styles.margin;
                    if (styles.border) borderInput.value = styles.border;
                    if (styles.borderRadius) borderRadiusInput.value = styles.borderRadius;
                    if (styles.textAlign) textAlignInput.value = styles.textAlign;
                    if (styles.fontFamily) fontFamilyInput.value = styles.fontFamily;
                  }
                }
              }
            });
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
      
      // Set up message listener from pop-out window
      window.addEventListener('message', handlePopoutMessage);
      
      // Set up a sync interval to keep the pop-out window updated
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
      
      syncIntervalRef.current = window.setInterval(() => {
        if (newWindow && !newWindow.closed) {
          // Check if HTML content has changed
          const currentContent = newWindow.document.getElementById('preview-container');
          if (currentContent && currentContent.innerHTML !== htmlContent) {
            newWindow.document.getElementById('preview-container').innerHTML = htmlContent;
          }
        } else {
          // Clear interval if window is closed
          if (syncIntervalRef.current) {
            window.clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
          }
          setPopOutWindow(null);
        }
      }, 1000);
    }
  };
  
  const handlePopoutMessage = (event: MessageEvent) => {
    if (event.data) {
      // Handle toggle selection message from pop-out window
      if (event.data.type === 'popoutToggleSelection') {
        setHighlightEnabled(event.data.enabled);
        
        // Sync with AITools component
        window.dispatchEvent(new CustomEvent('livePreviewToggleSelection', { 
          detail: { enabled: event.data.enabled } 
        }));
        
        setTimeout(refreshPreview, 50);
      }
      
      // Handle device change message from pop-out window
      else if (event.data.type === 'popoutChangeDevice') {
        setDeviceSize(event.data.device);
      }
      
      // Handle refresh message from pop-out window
      else if (event.data.type === 'popoutRefresh') {
        refreshPreview();
      }
      
      // Handle pop-out window closed message
      else if (event.data.type === 'popoutClosed') {
        setPopOutWindow(null);
        if (syncIntervalRef.current) {
          window.clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      }
      
      // Handle element selected from pop-out window
      else if (event.data.type === 'elementSelected') {
        // This will be handled by the useEffect that listens for elementSelected messages
      }
      
      // Handle AI changes request from pop-out
      else if (event.data.type === 'applyAiChanges') {
        const { element, prompt } = event.data;
        
        // Call AI service to get style changes
        if (window.AIService && typeof window.AIService.modifyElementStyles === 'function') {
          window.AIService.modifyElementStyles(element, prompt, 'gpt-4o-mini')
            .then(styles => {
              // Send styles back to pop-out window
              if (popOutWindow && !popOutWindow.closed) {
                popOutWindow.postMessage({
                  type: 'updateElementFromParent',
                  elementId: element.id,
                  selector: element.className ? `.${element.className.split(' ')[0]}` : element.tagName,
                  styles
                }, '*');
              }
            })
            .catch(error => {
              console.error('Error applying AI styles:', error);
            });
        } else {
          console.log('Using fallback style generation for pop-out window');
          
          // Fallback styling based on prompt
          const styles: Record<string, string> = {};
          
          if (prompt.includes('blue')) {
            styles.color = 'white';
            styles.backgroundColor = '#3b82f6';
          } else if (prompt.includes('green')) {
            styles.color = 'white';
            styles.backgroundColor = '#10b981';
          }
          
          if (prompt.includes('round')) {
            styles.borderRadius = '20px';
          }
          
          if (prompt.includes('border')) {
            styles.border = '2px solid #3b82f6';
          }
          
          if (popOutWindow && !popOutWindow.closed) {
            popOutWindow.postMessage({
              type: 'updateElementFromParent',
              elementId: element.id,
              selector: element.className ? `.${element.className.split(' ')[0]}` : element.tagName,
              styles
            }, '*');
          }
        }
      }
    }
  };
  
  // Cleanup function to remove interval and event listener on component unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
      window.removeEventListener('message', handlePopoutMessage);
      
      // Close pop-out window if component unmounts
      if (popOutWindow && !popOutWindow.closed) {
        popOutWindow.close();
      }
    };
  }, []);

  // Make AIService available to popout window
  useEffect(() => {
    // Expose AIService to window for pop-out window to access
    (window as any).AIService = {
      modifyElementStyles: async (element: any, prompt: string, model: string) => {
        return await fetch('/api/modify-styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ element, prompt, model }),
        }).then(res => res.json());
      }
    };
  }, []);
  
  return (
    <div className={`h-full flex flex-col bg-gray-900 ${isExpanded ? 'fixed inset-0 z-50' : ''}`}>
      <div className="border-b border-gray-700 bg-gray-800 p-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Live Preview</h3>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setDeviceSize('mobile')}
            className={`p-1 rounded ${deviceSize === 'mobile' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            title="Mobile view"
          >
            <Smartphone size={16} />
          </button>
          <button 
            onClick={() => setDeviceSize('tablet')}
            className={`p-1 rounded ${deviceSize === 'tablet' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            title="Tablet view"
          >
            <Tablet size={16} />
          </button>
          <button 
            onClick={() => setDeviceSize('desktop')}
            className={`p-1 rounded ${deviceSize === 'desktop' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            title="Desktop view"
          >
            <Monitor size={16} />
          </button>
          <button 
            onClick={refreshPreview}
            className="p-1 rounded hover:bg-gray-700"
            title="Refresh preview"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={openPopOutWindow}
            className="p-1 rounded hover:bg-gray-700"
            title="Pop-out preview"
          >
            <ExternalLink size={16} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-700"
            title="Expand preview"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-white overflow-hidden">
        {selectedElement && (
          <div className="bg-gray-800 border-b border-gray-700 p-2 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span>
                Selected: <span className="text-blue-400">{selectedElement.tagName}</span>
                {selectedElement.className && <span className="text-green-400"> .{selectedElement.className.split(' ')[0]}</span>}
                {selectedElement.id && <span className="text-yellow-400"> #{selectedElement.id}</span>}
              </span>
              <button 
                className="text-gray-400 hover:text-white text-xs"
                onClick={() => setSelectedElement(null)}
              >
                Clear
              </button>
            </div>
            <div className="flex space-x-2">
              <button className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
                Edit Style
              </button>
              <button className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
                Edit Content
              </button>
              <button className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded">
                Edit Attributes
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-gray-800 border-b border-gray-700 p-1 flex justify-between items-center">
          <label className="inline-flex items-center cursor-pointer text-xs">
            <input 
              type="checkbox" 
              checked={highlightEnabled}
              onChange={toggleElementSelection}
              className="sr-only peer" 
            />
            <div className="relative w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-2 text-sm text-gray-300">Select Elements</span>
          </label>
          
          <span className="text-xs text-gray-400">
            {highlightEnabled ? "Hover and click on elements to select them" : "Enable element selection to edit"}
          </span>
        </div>
        
        <div className={`h-full ${getDeviceClass()} overflow-hidden`}>
          <iframe 
            id="preview-iframe"
            ref={iframeRef}
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0 bg-white"
            srcDoc={htmlContent}
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default LivePreview;