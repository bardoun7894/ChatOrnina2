import type { MessageAttachment } from '@/types/chat';

export type MessageContent =
  | { type: 'text'; text: string; images?: string[] } // Support text with attached images
  | { type: 'image'; status: 'loading' | 'done' | 'error'; url?: string; urls?: string[]; prompt?: string; requestId?: string; startedAt?: string }
  | { type: 'video'; status: 'loading' | 'done' | 'error'; url?: string; prompt?: string; requestId?: string; startedAt?: string }
  | { type: 'code'; code: string; image?: string; }
  | { type: 'c1_component'; data: any; }; // Thesys C1 component data

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'assistant';
  content: MessageContent;
  timestamp?: number;
  attachments?: MessageAttachment[];
}

export interface ChatHistoryItem {
  id: string;
  title: string;
}
