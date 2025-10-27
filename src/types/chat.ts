export interface MessageAttachment {
  type: 'image' | 'video' | 'file';
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  thumbnail?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  conversationId: string;
  model?: string;
  tokens?: number;
  isEdited?: boolean;
  isDeleted?: boolean;
  attachments?: MessageAttachment[];
  contentType?: 'text' | 'markdown';
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  model?: string;
  isArchived?: boolean;
  isPinned?: boolean;
  tags?: string[];
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  selectedModel: string;
  availableModels: string[];
}

export interface ChatActions {
  createNewConversation: () => Promise<Conversation>;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateResponse: (messageId: string) => Promise<void>;
  setSelectedModel: (model: string) => void;
  exportConversation: (conversationId: string) => Promise<void>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: 'google' | 'github') => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface ThemeState {
  theme: 'light' | 'dark' | 'system';
}

export interface ThemeActions {
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export interface LanguageState {
  language: string;
}

export interface LanguageActions {
  changeLanguage: (language: string) => void;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatCompletionRequest {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ExportFormat {
  format: 'json' | 'txt' | 'markdown' | 'csv';
  includeMetadata: boolean;
  includeTimestamps: boolean;
}

export interface ConversationExport {
  conversation: Conversation;
  messages: Message[];
  exportDate: Date;
  format: ExportFormat;
}