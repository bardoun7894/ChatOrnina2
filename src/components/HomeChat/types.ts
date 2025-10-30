import { GenerateContentResponse } from "@google/genai";

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; status: 'loading' | 'done' | 'error'; url?: string; prompt?: string; requestId?: string; startedAt?: string }
  | { type: 'video'; status: 'loading' | 'done' | 'error'; url?: string; prompt?: string; requestId?: string; startedAt?: string }
  | { type: 'code'; code: string; };

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: MessageContent;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
}
