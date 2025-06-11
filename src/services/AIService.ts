import { FileData } from '../atoms';

export class AIService {
  static async getSettings() {
    // Retrieve settings from localStorage
    const geminiApiEnabled = localStorage.getItem('settings') 
      ? JSON.parse(localStorage.getItem('settings') || '{}').geminiApiEnabled 
      : false;
      
    const geminiApiKey = localStorage.getItem('geminiApiKey') || '';
    
    return {
      geminiApiEnabled,
      geminiApiKey
    };
  }
  
  static async callGeminiAPI(prompt: string, apiKey: string, model: string = 'gemini-2.0-flash') {
    try {
      // Using Gemini API directly
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error("Gemini API Error:", data.error);
        throw new Error(data.error.message);
      }
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Invalid response structure from Gemini API");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }

  static async generateCode(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    try {
      console.log(`Generating code with model: ${model} for prompt: ${prompt}`);
      
      const settings = await this.getSettings();
      
      // Use Gemini API if enabled
      if (settings.geminiApiEnabled && settings.geminiApiKey) {
        try {
          const geminiPrompt = `Generate HTML code for a web page based on this description: ${prompt}. 
             Provide only the complete HTML file with inline CSS and JavaScript.`;
          
          const geminiResponse = await this.callGeminiAPI(geminiPrompt, settings.geminiApiKey, model);
          
          // Extract code if it's in a code block
          const codePattern = /```(?:html|js|javascript)?([\s\S]*?)```/;
          const match = geminiResponse.match(codePattern);
          
          if (match && match[1]) {
            return match[1].trim();
          }
          
          return geminiResponse;
        } catch (e) {
          console.error("Error with Gemini API, falling back if applicable or throwing error:", e);
          // If Gemini fails, we will fall through to Puter or throw, no demo code here.
        }
      }
      
      // Try Puter.js built-in AI if Gemini is not used or failed
      if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
        try {
          // Use correct puter.ai.chat with proper parameters
          const response = await window.puter.ai.chat(
            `Generate HTML code for a web page based on this description: ${prompt}. 
             Provide only the complete HTML file with inline CSS and JavaScript.`,
            { model: model }
          );
          
          if (response && response.message && response.message.content) {
            // Extract code from AI response if it's in a code block
            const codePattern = /```(?:html|js|javascript)?([\s\S]*?)```/;
            const match = response.message.content.match(codePattern);
            
            if (match && match[1]) {
              return match[1].trim();
            }
            return response.message.content;
          }
        } catch (e) {
          console.error("Error with Puter AI:", e);
          // Extract specific error message from Puter AI response
          const errorMessage = e?.error?.message || e?.message || 'Unknown Puter AI error';
          throw new Error(`Puter AI error: ${errorMessage}`);
        }
      }
      
      // If all AI services fail or are not configured
      throw new Error('Failed to generate code. AI services unavailable or encountered an error.');

    } catch (error) {
      console.error('Error in generateCode:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Code generation failed: ${errorMessage}`);
    }
  }
  
  static async modifyCode(code: string, modificationPrompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    try {
      console.log(`Modifying code with model: ${model} for prompt: ${modificationPrompt}`);
      
      const settings = await this.getSettings();
      
      // Use Gemini API if enabled
      if (settings.geminiApiEnabled && settings.geminiApiKey) {
        try {
          const geminiPrompt = `Modify this code based on the following instruction: ${modificationPrompt}
             
             Here is the current code:
             \`\`\`
             ${code}
             \`\`\`
             
             Provide the complete modified code.`;
          
          const geminiResponse = await this.callGeminiAPI(geminiPrompt, settings.geminiApiKey, model);
          
          // Extract code from AI response if it's in a code block
          const codePattern = /```(?:html|js|javascript)?([\s\S]*?)```/;
          const match = geminiResponse.match(codePattern);
          
          if (match && match[1]) {
            return match[1].trim();
          }
          
          return geminiResponse;
        } catch (e) {
          console.error("Error with Gemini API, falling back if applicable or throwing error:", e);
        }
      }

      // Try Puter.js built-in AI if Gemini is not used or failed
      if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
        try {
          // Use correct puter.ai.chat with proper parameters
          const response = await window.puter.ai.chat(
            `Modify this code based on the following instruction: ${modificationPrompt}
             
             Here is the current code:
             \`\`\`
             ${code}
             \`\`\`
             
             Provide the complete modified code.`,
            { model: model }
          );
          
          if (response && response.message && response.message.content) {
            // Extract code from AI response
            const codePattern = /```(?:html|js|javascript)?([\s\S]*?)```/;
            const match = response.message.content.match(codePattern);
            
            if (match && match[1]) {
              return match[1].trim();
            }
            return response.message.content;
          }
        } catch (e) {
          console.error("Error with Puter AI:", e);
          // Extract specific error message from Puter AI response
          const errorMessage = e?.error?.message || e?.message || 'Unknown Puter AI error';
          throw new Error(`Puter AI error: ${errorMessage}`);
        }
      }
      
      throw new Error('Failed to modify code. AI services unavailable or encountered an error.');

    } catch (error) {
      console.error('Error modifying code:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Code modification failed: ${errorMessage}`);
    }
  }
  
  static async modifyElementStyles(element: any, aiPrompt: string, model: string = 'gpt-4o-mini'): Promise<Record<string, string>> {
    try {
      console.log(`Modifying element styles with model: ${model} for prompt: ${aiPrompt}`);
      
      const settings = await this.getSettings();
      
      // Use Gemini API if enabled
      if (settings.geminiApiEnabled && settings.geminiApiKey) {
        try {
          const elementDescription = `Element: ${element.tagName}${element.className ? ` with class "${element.className}"` : ''}${element.id ? ` with id "${element.id}"` : ''}`;
          
          const geminiPrompt = `I have a HTML element: ${elementDescription}. 
             The user wants to: "${aiPrompt}".
             
             Please generate only CSS styles as a JSON object with properties in camelCase format.
             Example: {"backgroundColor": "#ff0000", "color": "white", "borderRadius": "5px"}`;
          
          const geminiResponse = await this.callGeminiAPI(geminiPrompt, settings.geminiApiKey, model);
          
          // Extract JSON from AI response
          try {
            const jsonPattern = /{[\s\S]*?}/;
            const match = geminiResponse.match(jsonPattern);
            
            if (match && match[0]) {
              return JSON.parse(match[0]);
            }
          } catch (e) {
            console.error("Error parsing Gemini response:", e);
          }
        } catch (e) {
          console.error("Error with Gemini API:", e);
        }
      }

      // Try Puter.js built-in AI if Gemini is not used or failed
      if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
        try {
          const elementDescription = `Element: ${element.tagName}${element.className ? ` with class "${element.className}"` : ''}${element.id ? ` with id "${element.id}"` : ''}`;
          
          // Use correct puter.ai.chat with proper parameters
          const response = await window.puter.ai.chat(
            `I have a HTML element: ${elementDescription}. 
             The user wants to: "${aiPrompt}".
             
             Please generate only CSS styles as a JSON object with properties in camelCase format.
             Example: {"backgroundColor": "#ff0000", "color": "white", "borderRadius": "5px"}`,
            { model: model }
          );
          
          if (response && response.message && response.message.content) {
            // Extract JSON from AI response
            try {
              const jsonPattern = /{[\s\S]*?}/;
              const match = response.message.content.match(jsonPattern);
              
              if (match && match[0]) {
                return JSON.parse(match[0]);
              }
            } catch (e) {
              console.error("Error parsing AI response:", e);
            }
          }
        } catch (e) {
          console.error("Error with Puter AI:", e);
          // Extract specific error message from Puter AI response
          const errorMessage = e?.error?.message || e?.message || 'Unknown Puter AI error';
          throw new Error(`Puter AI error: ${errorMessage}`);
        }
      }
      
     throw new Error('Failed to modify element styles. AI services unavailable or encountered an error.');

    } catch (error) {
      console.error('Error modifying element styles:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Element style modification failed: ${errorMessage}`);
    }
  }
  
  static async generateMultipleFiles(prompt: string, model: string = 'gpt-4o-mini'): Promise<FileData[]> {
    try {
      console.log(`Generating multiple files with model: ${model} for prompt: ${prompt}`);
      
      const settings = await this.getSettings();
      let aiResponseText = null;
      
      // Use Gemini API if enabled
      if (settings.geminiApiEnabled && settings.geminiApiKey) {
        try {
          const geminiPrompt = `Generate a web application based on this description: ${prompt}.
             I need three separate files:
             1. An HTML file (index.html) with the basic structure
             2. A CSS file (styles.css) with all styling
             3. A JavaScript file (script.js) with all functionality
             
             Provide the complete code for each file, properly formatted.
             Start each file with a line specifying the filename, followed by the code block.
             Example:
             // index.html
             \`\`\`html
             ...
             \`\`\`
             // styles.css
             \`\`\`css
             ...
             \`\`\`
             // script.js
             \`\`\`javascript
             ...
             \`\`\`
             `;
          aiResponseText = await this.callGeminiAPI(geminiPrompt, settings.geminiApiKey, model);
        } catch (e) {
          console.error("Error with Gemini API, trying Puter AI:", e);
        }
      }
      
      // Try Puter.js built-in AI if Gemini is not used or failed
      if (!aiResponseText && window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
        try {
          // Use correct puter.ai.chat with proper parameters
          const puterResponse = await window.puter.ai.chat(
            `Generate a web application based on this description: ${prompt}.
             I need three separate files:
             1. An HTML file (index.html) with the basic structure
             2. A CSS file (styles.css) with all styling
             3. A JavaScript file (script.js) with all functionality
             
             Provide the complete code for each file, properly formatted.
             Start each file with a line specifying the filename, followed by the code block.
             Example:
             // index.html
             \`\`\`html
             ...
             \`\`\`
             // styles.css
             \`\`\`css
             ...
             \`\`\`
             // script.js
             \`\`\`javascript
             ...
             \`\`\`
             `,
            { model: model }
          );
          if (puterResponse && puterResponse.message && puterResponse.message.content) {
            aiResponseText = puterResponse.message.content;
          }
        } catch (e) {
          console.error("Error with Puter AI:", e);
          // Extract specific error message from Puter AI response
          const errorMessage = e?.error?.message || e?.message || 'Unknown Puter AI error';
          throw new Error(`Puter AI error: ${errorMessage}`);
        }
      }

      if (!aiResponseText) {
        throw new Error('AI services unavailable or encountered an error.');
      }
          
      // Try to extract the files from the response
      const fileContents: Record<string, string> = {
        'index.html': '',
        'styles.css': '',
        'script.js': ''
      };
      
      const filePatterns = [
        /(?:\/\/|<!--)\s*index\.html\s*(?:\/\/|-->)?\s*```html\s*([\s\S]*?)```/i,
        /(?:\/\/|\/\*)\s*styles\.css\s*(?:\*\/)?\s*```css\s*([\s\S]*?)```/i,
        /(?:\/\/)\s*script\.js\s*(?:\/\/)?\s*```(?:javascript|js)\s*([\s\S]*?)```/i,
      ];
      
      const fileNames = ['index.html', 'styles.css', 'script.js'];
      
      for (let i = 0; i < filePatterns.length; i++) {
        const match = aiResponseText.match(filePatterns[i]);
        if (match && match[1]) {
          fileContents[fileNames[i]] = match[1].trim();
        }
      }
      
      // If pattern matching failed, try to find code blocks in sequence
      if (!fileContents['index.html'] && !fileContents['styles.css'] && !fileContents['script.js']) {
        const codeBlocks = aiResponseText.match(/```(?:html|css|javascript|js)?([\s\S]*?)```/g);
        if (codeBlocks) {
            if (codeBlocks.length >= 1) fileContents['index.html'] = codeBlocks[0].replace(/```(?:html)?/, '').replace(/```$/, '').trim();
            if (codeBlocks.length >= 2) fileContents['styles.css'] = codeBlocks[1].replace(/```(?:css)?/, '').replace(/```$/, '').trim();
            if (codeBlocks.length >= 3) fileContents['script.js'] = codeBlocks[2].replace(/```(?:javascript|js)?/, '').replace(/```$/, '').trim();
        }
      }
      
      // Create file data objects
      const files: FileData[] = [
        {
          name: 'index.html',
          content: fileContents['index.html'] || `<!-- AI failed to generate index.html -->\n<p>Error generating content.</p>`,
          language: 'html',
          path: 'index.html'
        },
        {
          name: 'styles.css',
          content: fileContents['styles.css'] || `/* AI failed to generate styles.css */\nbody { color: red; }`,
          language: 'css',
          path: 'styles.css'
        },
        {
          name: 'script.js',
          content: fileContents['script.js'] || `// AI failed to generate script.js\nconsole.error("Error generating script.");`,
          language: 'javascript',
          path: 'script.js'
        }
      ];
      
      return files;

    } catch (error) {
      console.error('Error generating multiple files:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`File generation failed: ${errorMessage}`);
    }
  }

  // New methods for chat functionality
  static async chatWithAI(messages: Array<{role: string, content: string}>, model: string = 'claude-sonnet-4'): Promise<string> {
    try {
      console.log(`Chatting with model: ${model}`);
      
      const settings = await this.getSettings();
      
      // Use Gemini API if enabled
      if (settings.geminiApiEnabled && settings.geminiApiKey) {
        try {
          // Extract just the last user message for simplicity
          // In a real implementation, you'd want to handle the full conversation history
          const lastUserMessage = messages[messages.length - 1].content;
          
          const geminiResponse = await this.callGeminiAPI(lastUserMessage, settings.geminiApiKey, model);
          return geminiResponse;
        } catch (e) {
          console.error("Error with Gemini API:", e);
          throw e;
        }
      } else {
        // Check if this is an OpenRouter model via Puter
        if (model.startsWith('openrouter:') && window.puter && window.puter.ai) {
          try {
            const lastUserMessage = messages[messages.length - 1].content;
            // Use correct puter.ai.chat with proper parameters
            const response = await window.puter.ai.chat(lastUserMessage, { model: model });
            
            if (response && response.message && response.message.content) {
              return response.message.content;
            } else {
              return "I couldn't generate a response at this time.";
            }
          } catch (e) {
            console.error("Error with OpenRouter via Puter:", e);
            // Extract specific error message from Puter AI response
            const errorMessage = e?.error?.message || e?.message || 'Unknown OpenRouter error';
            throw new Error(`OpenRouter via Puter error: ${errorMessage}`);
          }
        }
        
        // Use Puter's built-in AI
        else if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
          try {
            const lastUserMessage = messages[messages.length - 1].content;
            // Use correct puter.ai.chat with proper parameters
            const response = await window.puter.ai.chat(lastUserMessage, { model: model });
            
            if (response && response.message && response.message.content) {
              return response.message.content;
            } else {
              return "I couldn't generate a response at this time.";
            }
          } catch (e) {
            console.error("Error with Puter AI:", e);
            // Extract specific error message from Puter AI response
            const errorMessage = e?.error?.message || e?.message || 'Unknown Puter AI error';
            throw new Error(`Puter AI error: ${errorMessage}`);
          }
        }
      }
      
      throw new Error('No AI service available or configured.');
    } catch (error) {
      console.error('Error in chat:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`AI chat failed: ${errorMessage}`);
    }
  }

  // Generate an image from a text prompt
  static async generateImage(prompt: string, model: string = 'default'): Promise<string> {
    try {
      console.log(`Generating image with model: ${model} for prompt: ${prompt}`);
      
      const settings = await this.getSettings();
      
      // Check if we can use Puter's built-in image generation
      if (window.puter && window.puter.ai && typeof window.puter.ai.txt2img === 'function') {
        try {
          // Use correct puter.ai.txt2img which returns an image element
          const imageElement = await window.puter.ai.txt2img(prompt);
          
          // Get the image URL from the element
          if (imageElement && imageElement.src) {
            return imageElement.src;
          }
        } catch (e) {
          console.error("Error with Puter image generation:", e);
          // Extract specific error message from Puter AI response
          const errorMessage = e?.error?.message || e?.message || 'Unknown Puter image generation error';
          throw new Error(`Puter image generation error: ${errorMessage}`);
        }
      }
      
      throw new Error('Image generation service unavailable.');
    } catch (error) {
      console.error('Error generating image:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Image generation failed: ${errorMessage}`);
    }
  }
  
  // Retrieve information from an MCP server
  static async retrieveFromMCP(prompt: string, server: any, model: string): Promise<string> {
    try {
      console.log(`Retrieving from MCP server: ${server.name} with model: ${model} and prompt: ${prompt}`);
      
      // Try to get available tools
      const tools = await window.MCP.listTools(server.url);
      
      // Find a relevant tool based on the prompt
      let toolName = '';
      if (prompt.toLowerCase().includes('weather')) {
        toolName = 'get_weather';
      } else if (prompt.toLowerCase().includes('search') || prompt.toLowerCase().includes('find')) {
        toolName = 'search_web';
      } else if (prompt.toLowerCase().includes('url') || prompt.toLowerCase().includes('website')) {
        toolName = 'fetch_url';
      } else if (prompt.toLowerCase().includes('api')) {
        toolName = 'fetch_api';
      } else if (prompt.toLowerCase().includes('document') || prompt.toLowerCase().includes('knowledge')) {
        toolName = 'retrieve';
      }
      
      // If we found a relevant tool, use it
      if (toolName && tools.includes(toolName)) {
        const args = { 
          query: prompt,
          location: prompt.includes('weather') ? prompt.replace('weather', '').trim() : '',
          url: prompt.includes('http') ? prompt.match(/(https?:\/\/[^\s]+)/)?.[0] || '' : ''
        };
        
        const result = await window.MCP.callTool(server.url, toolName, args);
        return result;
      }
      
      // If no tool matched or call failed, fall back to a generic response
      return `I processed your query about "${prompt}" with the MCP server "${server.name}" using the model "${model}". However, I couldn't find a relevant tool to handle this specific request. The server offers tools for: ${tools.join(', ')}.`;
    } catch (error) {
      console.error('Error retrieving from MCP:', error);
      // Preserve the original error message instead of generic one
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`MCP retrieval failed: ${errorMessage}`);
    }
  }
}

// Declare global types for MCP and Puter.js
declare global {
  interface Window {
    puter: any;
    MCP: {
      listTools: (serverUrl: string) => Promise<string[]>;
      callTool: (serverUrl: string, toolName: string, args: any) => Promise<string>;
    }
  }
}