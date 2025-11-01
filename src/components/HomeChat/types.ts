export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; status: 'loading' | 'done' | 'error'; url?: string; urls?: string[]; prompt?: string; requestId?: string; startedAt?: string }
  | { type: 'video'; status: 'loading' | 'done' | 'error'; url?: string; prompt?: string; requestId?: string; startedAt?: string }
  | { type: 'code'; code: string; };

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'assistant';
  content: MessageContent;
  timestamp?: number;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
}
