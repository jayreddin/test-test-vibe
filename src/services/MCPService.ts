import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

export interface MCPServer {
  name: string;
  url: string;
  description: string;
  active: boolean;
  models?: string[];
  tools?: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPConfig {
  version: string;
  servers: MCPServer[];
}

export class MCPService {
  private static client: Client | null = null;
  private static transport: StdioClientTransport | null = null;
  private static activeServer: MCPServer | null = null;

  // Initialize MCP client
  static async initClient(server: MCPServer): Promise<void> {
    try {
      console.log(`Initializing MCP client for server: ${server.name}`);
      
      // Close existing client if present
      if (MCPService.client) {
        await MCPService.client.close();
        MCPService.client = null;
        MCPService.transport = null;
      }
      
      // In a real implementation, this would connect to the actual MCP server
      // For now, we'll use a simulated client
      MCPService.activeServer = server;
      
      // Note: In a production implementation, we'd use the actual MCP client SDK
      // const transport = new StdioClientTransport({...});
      // const client = new Client({name: "vibe-code-client", version: "1.0.0"});
      // await client.connect(transport);
      
      console.log(`MCP client initialized for ${server.name}`);
    } catch (error) {
      console.error('Error initializing MCP client:', error);
      throw error;
    }
  }

  // Load MCP configuration from localStorage or defaults
  static async loadConfig(): Promise<MCPConfig> {
    try {
      const storedConfig = localStorage.getItem('mcpServers');
      if (storedConfig) {
        return {
          version: "1.0.0",
          servers: JSON.parse(storedConfig)
        };
      }
      
      // If no stored config, try to load from MCP.json
      const response = await fetch('/MCP.json');
      if (response.ok) {
        const mcpConfig = await response.json();
        
        // Save to localStorage
        localStorage.setItem('mcpServers', JSON.stringify(mcpConfig.servers || []));
        
        return {
          version: mcpConfig.version || "1.0.0",
          servers: mcpConfig.servers || []
        };
      }
      
      // Fall back to default config
      return {
        version: "1.0.0",
        servers: [
          {
            name: "Context7 Server",
            url: "https://api.context7.ai/v1",
            description: "Knowledge retrieval and document analysis tools",
            active: true,
            models: [
              "openrouter:anthropic/claude-3.5-sonnet",
              "openrouter:openai/gpt-4o",
              "openrouter:meta-llama/llama-3.1-8b-instruct"
            ]
          }
        ]
      };
    } catch (error) {
      console.error('Error loading MCP configuration:', error);
      return {
        version: "1.0.0",
        servers: []
      };
    }
  }

  // Save MCP configuration to localStorage
  static async saveConfig(config: MCPConfig): Promise<void> {
    try {
      localStorage.setItem('mcpServers', JSON.stringify(config.servers));
    } catch (error) {
      console.error('Error saving MCP configuration:', error);
      throw error;
    }
  }

  // Get active MCP server
  static async getActiveServer(): Promise<MCPServer | null> {
    const config = await MCPService.loadConfig();
    const activeServer = config.servers.find(server => server.active) || null;
    
    // Initialize client for active server if needed
    if (activeServer && (!MCPService.activeServer || MCPService.activeServer.name !== activeServer.name)) {
      await MCPService.initClient(activeServer);
    }
    
    return activeServer;
  }
  
  // Set active MCP server
  static async setActiveServer(serverName: string): Promise<void> {
    const config = await MCPService.loadConfig();
    
    // Update active status for all servers
    config.servers = config.servers.map(server => ({
      ...server,
      active: server.name === serverName
    }));
    
    await MCPService.saveConfig(config);
    
    // Initialize client for newly activated server
    const activeServer = config.servers.find(server => server.active);
    if (activeServer) {
      await MCPService.initClient(activeServer);
    }
  }
  
  // Add new MCP server
  static async addServer(server: MCPServer): Promise<void> {
    const config = await MCPService.loadConfig();
    
    // Check if server with same name already exists
    const existingServerIndex = config.servers.findIndex(s => s.name === server.name);
    
    if (existingServerIndex >= 0) {
      // Update existing server
      config.servers[existingServerIndex] = server;
    } else {
      // Add new server
      config.servers.push(server);
    }
    
    // If this server is set active, deactivate all others
    if (server.active) {
      config.servers = config.servers.map(s => ({
        ...s,
        active: s.name === server.name
      }));
    }
    
    await MCPService.saveConfig(config);
    
    // If this is the active server, initialize the client
    if (server.active) {
      await MCPService.initClient(server);
    }
  }
  
  // Remove MCP server
  static async removeServer(serverName: string): Promise<void> {
    const config = await MCPService.loadConfig();
    const serverToRemove = config.servers.find(server => server.name === serverName);
    const wasActive = serverToRemove?.active || false;
    
    // Remove the server
    config.servers = config.servers.filter(server => server.name !== serverName);
    
    // If the removed server was active, activate the first remaining server if any
    if (wasActive && config.servers.length > 0) {
      config.servers[0].active = true;
      
      // Initialize client for the newly activated server
      await MCPService.initClient(config.servers[0]);
    } else if (wasActive) {
      // If no servers remain, clear the client
      MCPService.client = null;
      MCPService.transport = null;
      MCPService.activeServer = null;
    }
    
    await MCPService.saveConfig(config);
  }
  
  // Get available tools from active MCP server
  static async listTools(): Promise<MCPTool[]> {
    const activeServer = await MCPService.getActiveServer();
    if (!activeServer) {
      throw new Error('No active MCP server available');
    }
    
    try {
      // In a real implementation, this would use the MCP client SDK
      // const response = await MCPService.client.request(
      //   { method: "tools/list" },
      //   ListToolsResultSchema
      // );
      // return response.tools;
      
      // For now, return mock tools based on server name
      if (activeServer.name.includes('Context7')) {
        return [
          {
            name: 'retrieve',
            description: 'Retrieve information from embedded documents',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' }
              },
              required: ['query']
            }
          },
          {
            name: 'search_knowledge_base',
            description: 'Search the knowledge base for specific information',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                limit: { type: 'number' }
              },
              required: ['query']
            }
          }
        ];
      } else if (activeServer.name.includes('Fetch')) {
        return [
          {
            name: 'fetch_url',
            description: 'Retrieve content from a URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' }
              },
              required: ['url']
            }
          },
          {
            name: 'fetch_api',
            description: 'Make an API request and return the results',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                method: { type: 'string' },
                headers: { type: 'object' },
                body: { type: 'string' }
              },
              required: ['url']
            }
          }
        ];
      } else if (activeServer.name.includes('Firecrawl')) {
        return [
          {
            name: 'crawl_website',
            description: 'Crawl a website and extract information',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                depth: { type: 'number' }
              },
              required: ['url']
            }
          },
          {
            name: 'extract_data',
            description: 'Extract structured data from a webpage',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                selectors: { 
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    images: { type: 'string' }
                  }
                }
              },
              required: ['url']
            }
          },
          {
            name: 'search_web',
            description: 'Search the web for information',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                limit: { type: 'number' }
              },
              required: ['query']
            }
          }
        ];
      } else {
        // Default server tools
        return [
          {
            name: 'get_weather',
            description: 'Get current weather for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string' }
              },
              required: ['location']
            }
          },
          {
            name: 'search_web',
            description: 'Search the web for information',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                limit: { type: 'number' }
              },
              required: ['query']
            }
          }
        ];
      }
    } catch (error) {
      console.error('Error listing MCP tools:', error);
      throw error;
    }
  }
  
  // Call a specific tool on the active MCP server
  static async callTool(toolName: string, args: any): Promise<string> {
    const activeServer = await MCPService.getActiveServer();
    if (!activeServer) {
      throw new Error('No active MCP server available');
    }
    
    try {
      // In a real implementation, this would use the MCP client SDK
      // const response = await MCPService.client.request(
      //   {
      //     method: "tools/call",
      //     params: {
      //       name: toolName,
      //       arguments: args,
      //     },
      //   },
      //   CallToolResultSchema
      // );
      // return response.content[0].text;
      
      console.log(`Calling MCP tool: ${toolName} with args:`, args);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate tool execution with mock responses based on the tool name
      if (toolName === 'retrieve') {
        return `Retrieved information for query "${args.query}":\n\n• The React useState hook is used to add state to functional components.\n• It returns a stateful value and a function to update it.\n• The initial state is only used during the first render.\n• useState does not automatically merge update objects like class component setState does.`;
      } else if (toolName === 'search_knowledge_base') {
        return `Search results for "${args.query}":\n\n1. React Hooks API Reference\n2. Understanding useState in React\n3. State Management in React Applications\n4. Class vs Functional Components in React`;
      } else if (toolName === 'fetch_url') {
        return `Content fetched from ${args.url}:\n\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Example Page</title>\n</head>\n<body>\n  <h1>Example Content</h1>\n  <p>This is sample content from the requested URL.</p>\n</body>\n</html>`;
      } else if (toolName === 'fetch_api') {
        return `API Response from ${args.url}:\n\n{\n  "status": "success",\n  "data": {\n    "id": 123,\n    "name": "Example Item",\n    "description": "This is a sample API response"\n  }\n}`;
      } else if (toolName === 'crawl_website') {
        return `Crawl results for ${args.url} (depth: ${args.depth || 1}):\n\nFound 5 pages:\n• Homepage: 3 links, 2 images\n• About page: 1 link, 0 images\n• Products page: 7 links, 5 images\n• Contact page: 0 links, 1 image\n• Blog: 12 links, 8 images`;
      } else if (toolName === 'extract_data') {
        return `Extracted data from ${args.url}:\n\n{\n  "title": "Example Website - Home",\n  "content": "Welcome to our example website. We provide various services including web development, design, and digital marketing solutions.",\n  "images": [\n    "https://example.com/image1.jpg",\n    "https://example.com/image2.jpg"\n  ]\n}`;
      } else if (toolName === 'get_weather') {
        return `Weather for ${args.location}:\n\n• Current temperature: 72°F (22°C)\n• Condition: Partly Cloudy\n• Humidity: 45%\n• Wind: 5 mph NW\n• Forecast: Clear skies expected later today with temperatures dropping to 65°F overnight.`;
      } else if (toolName === 'search_web') {
        return `Search results for "${args.query}" (limit: ${args.limit || 3}):\n\n1. Example.com: This is a description of the first result that matches your search query...\n2. Another-site.org: Information related to your search query with additional details...\n3. Relevantinfo.net: More details about what you're looking for with specific examples and references...`;
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  }
  
  // Test connection to an MCP server
  static async testConnection(server: MCPServer): Promise<{success: boolean, message: string}> {
    try {
      // In a real implementation, this would attempt to connect to the server
      // and validate that it implements the MCP protocol
      
      // For now, simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Validate URL format
      if (!server.url.startsWith('http')) {
        return {
          success: false,
          message: 'Invalid URL format. URL must start with http:// or https://'
        };
      }
      
      // Pretend the connection was successful
      return {
        success: true,
        message: 'Connection successful. Server is responding and implements MCP.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}