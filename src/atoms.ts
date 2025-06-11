import { atom } from 'jotai';
import { MCPServer } from './services/MCPService';

export interface FileData {
  name: string;
  content: string;
  language: string;
  path?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  dateAdded: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  timestamp: string;
  files: FileData[];
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  showWelcomeOnStartup: boolean;
  checkpoints: boolean;
  appMemory: boolean;
  fileContext: boolean;
  defaultModel: string;
  geminiApiEnabled: boolean;
  geminiApiKey: string;
}

export const welcomeOpenAtom = atom<boolean>(false);
export const settingsOpenAtom = atom<boolean>(false);
export const filesAtom = atom<FileData[]>([]);
export const currentFileAtom = atom<FileData | null>(null);
export const projectNameAtom = atom<string>('Vibe Code Project');
export const knowledgeDocsAtom = atom<KnowledgeDoc[]>([]);
export const checkpointsModalOpenAtom = atom<boolean>(false);

export const aiModelsAtom = atom<AIModel[]>([
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', enabled: true },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', enabled: true },
  { id: 'o1-mini', name: 'O1 Mini', provider: 'OpenAI', enabled: false },
  { id: 'o1', name: 'O1', provider: 'OpenAI', enabled: false },
  { id: 'o1-pro', name: 'O1 Pro', provider: 'OpenAI', enabled: false },
  { id: 'o3', name: 'O3', provider: 'OpenAI', enabled: false },
  { id: 'o3-mini', name: 'O3 Mini', provider: 'OpenAI', enabled: false },
  { id: 'o4-mini', name: 'O4 Mini', provider: 'OpenAI', enabled: false },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', enabled: false },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI', enabled: false },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI', enabled: false },
  { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', provider: 'OpenAI', enabled: false },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', enabled: true },
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', enabled: false },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', enabled: true },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', enabled: false },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', enabled: false },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'DeepSeek', enabled: false },
  { id: 'google/gemini-2.5-pro-exp-03-25:free', name: 'Gemini 2.5 Pro', provider: 'Google', enabled: false },
  { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash Preview', provider: 'Google', enabled: false },
  { id: 'google/gemini-2.5-flash-preview:thinking', name: 'Gemini 2.5 Flash Thinking', provider: 'Google', enabled: false },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', enabled: true },
  { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', provider: 'Google', enabled: false },
  { id: 'google/gemini-2.0-flash-thinking-exp-1219:free', name: 'Gemini 2.0 Flash Thinking', provider: 'Google', enabled: false },
  { id: 'google/gemini-2.0-pro-exp-02-05:free', name: 'Gemini 2.0 Pro', provider: 'Google', enabled: false },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', enabled: false },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', enabled: false },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', enabled: false },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', enabled: false },
  { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', provider: 'Meta', enabled: false },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo', provider: 'Meta', enabled: false },
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', provider: 'Meta', enabled: false },
  { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo', provider: 'Meta', enabled: false },
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral AI', enabled: false },
  { id: 'pixtral-large-latest', name: 'Pixtral Large', provider: 'Mistral AI', enabled: false },
  { id: 'codestral-latest', name: 'Codestral', provider: 'Mistral AI', enabled: false },
  { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', provider: 'Google', enabled: false },
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xAI', enabled: false },
  { id: 'x-ai/grok-3-beta', name: 'Grok 3 Beta', provider: 'xAI', enabled: false },
]);

export const geminiModelsAtom = atom<AIModel[]>([
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', enabled: true },
  { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini 2.0 Flash Lite', provider: 'Google', enabled: true },
  { id: 'google/gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview 04-17', provider: 'Google', enabled: true },
  { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview 05-20', provider: 'Google', enabled: true },
  { id: 'google/gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview 05-06', provider: 'Google', enabled: true },
]);

export const selectedModelAtom = atom<string>('google/gemini-2.0-flash-lite-001');
export const checkpointsAtom = atom<Checkpoint[]>([]);

export const settingsAtom = atom<AppSettings>({
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  autoSave: true,
  showWelcomeOnStartup: true,
  checkpoints: true,
  appMemory: true,
  fileContext: true,
  defaultModel: 'google/gemini-2.0-flash-lite-001',
  geminiApiEnabled: false,
  geminiApiKey: '',
});

// MCP-related atoms
export const mcpServersAtom = atom<MCPServer[]>([]);
export const activeMcpServerAtom = atom<MCPServer | null>(null);