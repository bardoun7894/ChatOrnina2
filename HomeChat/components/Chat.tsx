import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { SparklesIcon, UserIcon, PaperAirplaneIcon, MenuIcon, PhotoIcon, VideoCameraIcon, CodeBracketIcon, ClipboardIcon, MicrophoneIcon, SoundWaveIcon } from './icons';
import type { Message } from '../types';
import CodeBlock from './CodeBlock';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatProps {
  onMenuClick: () => void;
}

let openai: OpenAI | null = null;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
    dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
  });
} catch (e) {
  console.error('Failed to initialize OpenAI:', e);
}

const Chat: React.FC<ChatProps> = ({ onMenuClick }) => {
  const { t, isRTL } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openai) {
      setError('Failed to initialize OpenAI. Please check the API key.');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  const updateMessage = (id: string, newContent: { status: 'done' | 'error'; url?: string }) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === id && (msg.content.type === 'image' || msg.content.type === 'video')) {
          return { ...msg, content: { ...msg.content, ...newContent } };
        }
        return msg;
      })
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || !openai) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: { type: 'text', text: trimmedInput },
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const aiMessageId = (Date.now() + 1).toString();

    try {
        if (trimmedInput.startsWith('/image')) {
            // DALL-E 3 Image Generation
            const prompt = trimmedInput.replace('/image', '').trim();
            setMessages(prev => [...prev, { id: aiMessageId, sender: 'ai', content: { type: 'image', status: 'loading' } }]);
            const response = await openai.images.generate({
              model: "dall-e-3",
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            });
            const imageUrl = response.data[0]?.url;
            if (imageUrl) {
              updateMessage(aiMessageId, { status: 'done', url: imageUrl });
            } else {
              throw new Error("Image generation failed.");
            }
        } else if (trimmedInput.startsWith('/code')) {
            // Code generation with GPT-4
            const prompt = trimmedInput.replace('/code', '').trim();
            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "You are a helpful coding assistant. Provide only code blocks without extra explanation." },
                { role: "user", content: `Provide only the code block for the following request: ${prompt}` }
              ],
              temperature: 0.7,
            });
            const responseText = completion.choices[0]?.message?.content || '';
            const codeMatch = responseText.match(/```(?:\w+\n)?([\s\S]*?)```/);
            const code = codeMatch ? codeMatch[1].trim() : responseText;
            const aiMessage: Message = { id: aiMessageId, sender: 'ai', content: { type: 'code', code } };
            setMessages(prev => [...prev, aiMessage]);
        } else {
            // Regular chat with GPT-4
            const chatMessages = messages
              .filter(m => m.content.type === 'text')
              .map(m => ({
                role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: m.content.type === 'text' ? m.content.text : ''
              }));

            chatMessages.push({ role: 'user', content: trimmedInput });

            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: chatMessages,
              temperature: 0.7,
              max_tokens: 2000,
            });

            const responseText = completion.choices[0]?.message?.content || 'No response';
            const aiMessage: Message = {
                id: aiMessageId,
                content: { type: 'text', text: responseText },
                sender: 'ai',
            };
            setMessages(prev => [...prev, aiMessage]);
        }
    } catch (e: any) {
        console.error(e);
        const errorMessage = e?.message || 'Sorry, something went wrong. Please try again.';
        setError(errorMessage);
        // Check if there's a pending media message to update its status to error
        const pendingMessage = messages.find(m => m.id === aiMessageId);
        if (pendingMessage && (pendingMessage.content.type === 'image' || pendingMessage.content.type === 'video')) {
            updateMessage(aiMessageId, { status: 'error' });
        } else {
             // Add a new error message if no pending message exists
            setMessages(prev => [...prev.filter(m => m.id !== aiMessageId), { id: aiMessageId, sender: 'ai', content: { type: 'text', text: errorMessage }}]);
        }
    } finally {
        setIsLoading(false);
    }
  };

  const renderMessageContent = (message: Message) => {
    switch (message.content.type) {
      case 'text':
        return <p className="whitespace-pre-wrap">{message.content.text}</p>;
      case 'image':
        if (message.content.status === 'loading') {
          return <div className="flex flex-col items-center justify-center bg-gray-200/50 w-64 h-64 rounded-xl animate-pulse"><PhotoIcon className="w-12 h-12 text-gray-400" /><p className="mt-2 text-sm text-gray-500">{t('chat.generatingImage')}</p></div>;
        }
        if (message.content.status === 'done' && message.content.url) {
          return <img src={message.content.url} alt="Generated content" className="rounded-xl max-w-sm" />;
        }
        return <div className="text-red-500">{t('chat.imageError')}</div>;
      case 'video':
        if (message.content.status === 'loading') {
          return <div className="flex flex-col items-center justify-center bg-gray-200/50 w-64 h-48 rounded-xl animate-pulse"><VideoCameraIcon className="w-12 h-12 text-gray-400" /><p className="mt-2 text-sm text-gray-500">{t('chat.generatingVideo')}</p></div>;
        }
        if (message.content.status === 'done' && message.content.url) {
          return <video src={message.content.url} controls className="rounded-xl max-w-sm" />;
        }
        return <div className="text-red-500">{t('chat.videoError')}</div>;
       case 'code':
            return <CodeBlock code={message.content.code} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex lg:hidden items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
        <button onClick={onMenuClick} className="text-gray-600 hover:text-gray-900" aria-label={t('button.openMenu')}>
          <MenuIcon className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-semibold text-gray-800">{t('chat.title')}</h1>
        <button className="text-gray-600 hover:text-gray-900" aria-label={t('chat.aiCall')}>
            <SoundWaveIcon className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden">
        <header className="hidden lg:flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('chat.greeting')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('chat.subtitle')}</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors" aria-label={t('chat.aiCall')}>
            <SoundWaveIcon className="w-4 h-4" />
            <span className="font-medium">{t('chat.aiCall')}</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center flex-1 flex flex-col justify-center items-center h-full">
              <SparklesIcon className="w-12 h-12" />
              <h2 className="text-lg font-semibold text-gray-800 mt-3">{t('chat.helpText')}</h2>
              <p className="text-sm text-gray-500 mt-2">{t('chat.commandsHelp')} <code className="bg-gray-200/70 px-1.5 py-0.5 rounded text-xs">/image</code>, <code className="bg-gray-200/70 px-1.5 py-0.5 rounded text-xs">/code</code>.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''} ${isRTL && msg.sender === 'user' ? 'flex-row-reverse' : ''} ${isRTL && msg.sender === 'ai' ? 'flex-row-reverse' : ''}`}>
              {msg.sender === 'ai' && <SparklesIcon />}
              <div className={` ${msg.content.type === 'text' ? `max-w-xl p-3 text-sm rounded-2xl ${msg.sender === 'user' ? `bg-gray-100 text-gray-800 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}` : `bg-white border border-gray-200/80 text-gray-800 ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`}` : ''}`}>
                {renderMessageContent(msg)}
              </div>
              {msg.sender === 'user' && <UserIcon />}
            </div>
          ))}
          {isLoading && !messages.some(m => (m.content.type === 'image' || m.content.type === 'video') && m.content.status === 'loading') && (
              <div className="flex items-start gap-3">
                  <SparklesIcon />
                  <div className="max-w-xl p-3 rounded-2xl bg-white border border-gray-200/80 text-gray-800 rounded-bl-none">
                      <div className="flex items-center space-x-1">
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      </div>
                  </div>
              </div>
          )}
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          <div ref={messagesEndRef} />
        </div>
        <div className="mt-auto pt-3">
          <form onSubmit={handleSendMessage} className="relative">
            <button
                type="button"
                className={`absolute top-1/2 ${isRTL ? 'right-2.5' : 'left-2.5'} -translate-y-1/2 text-gray-500 hover:text-gray-700`}
                aria-label={t('button.microphone')}
              >
                <MicrophoneIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className={`w-full ${isRTL ? 'pr-10 pl-12' : 'pl-10 pr-12'} py-3 text-sm bg-gray-100 border border-gray-200/80 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300`}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`absolute top-1/2 ${isRTL ? 'left-2.5' : 'right-2.5'} -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-gray-800 rounded-lg text-white hover:bg-gray-900 disabled:bg-gray-300 transition-colors`}
              disabled={isLoading || !input.trim()}
              aria-label={t('button.send')}
            >
              <PaperAirplaneIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;