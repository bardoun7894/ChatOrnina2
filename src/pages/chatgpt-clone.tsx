import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { Message } from '@/types/chat';
import { MessageContent } from '@/components/message';
import { cn } from '@/lib/utils';
import {
  Menu,
  Search,
  Settings,
  Moon,
  Sun,
  Send,
  Mic,
  LogOut,
  ChevronDown,
  PenSquare,
  Sparkles,
  MoreHorizontal,
  MessageSquare,
  History,
  FileText,
  Bookmark,
  Users,
  HelpCircle
} from 'lucide-react';

export default function ChatGPTClone() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure dark mode by default
  useEffect(() => {
    if (mounted && !theme) {
      setTheme('dark');
    }
  }, [mounted, theme, setTheme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewConversation = () => {
    // Simply clear messages for new conversation
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to send message');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message || data.content,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Sidebar Content Component
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#f8f9fa] p-4">
      {/* Profile Section at Top */}
      <div className="mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-auto py-3 px-4 rounded-xl hover:bg-white/80 border-0 bg-transparent">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="rounded-xl bg-gray-900 text-white">
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <div className="text-sm font-semibold text-gray-900">
                    {session?.user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {session?.user?.email || 'user@ornina.ai'}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> : <Moon className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />}
              {theme === 'dark' ? t('settings.light') : t('settings.dark')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}>
              <ChevronDown className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {language === 'en' ? 'العربية' : 'English'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t('settings.title')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="w-full h-10 pl-10 pr-10 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-gray-900 placeholder:text-gray-400"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-500">
            /
          </kbd>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-1 flex-1">
        <Button
          onClick={createNewConversation}
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0 bg-blue-50 text-blue-600"
        >
          <MessageSquare className="h-5 w-5" />
          <span>New Chat</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0"
        >
          <History className="h-5 w-5 text-gray-500" />
          <span>History</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0"
        >
          <Bookmark className="h-5 w-5 text-gray-500" />
          <span>Saved</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0"
        >
          <FileText className="h-5 w-5 text-gray-500" />
          <span>Documents</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0"
        >
          <Users className="h-5 w-5 text-gray-500" />
          <span>Team</span>
        </Button>
      </nav>

      {/* Bottom Navigation */}
      <div className="space-y-1 pt-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0"
        >
          <Settings className="h-5 w-5 text-gray-500" />
          <span>Settings</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-4 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 border-0"
        >
          <HelpCircle className="h-5 w-5 text-gray-500" />
          <span>Help & Support</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main Content - Order 1 in RTL, Order 2 in LTR */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden",
        isRTL ? "order-1" : "order-2"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 rounded-lg hover:bg-gray-100 transition-all duration-200"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </Button>
            <span className="text-lg font-bold text-gray-900">OrninaChat</span>
          </div>

          <Button
            onClick={createNewConversation}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            <PenSquare className="h-5 w-5 text-gray-700" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 bg-white">
                <div className="w-full max-w-3xl mx-auto text-center space-y-8">
                  <h1 className="text-3xl font-normal text-gray-900">
                    What's on your mind today?
                  </h1>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 bg-white">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                      animationFillMode: 'both'
                    }}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-blue-500/20">
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          AI
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={cn(
                      "flex-1 max-w-3xl",
                      message.role === 'user' && 'flex justify-end'
                    )}>
                      <div className={cn(
                        "rounded-2xl px-4 py-3 transition-all duration-300",
                        message.role === 'user'
                          ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                          : 'bg-gray-100 text-gray-900'
                      )}>
                        {message.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <MessageContent content={message.content} />
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-blue-500/20">
                        <AvatarImage src={session?.user?.image || ''} />
                        <AvatarFallback className="text-xs bg-gray-900 text-white">
                          {session?.user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 justify-start animate-in fade-in duration-500">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center gap-2 bg-gray-100 rounded-3xl px-4 py-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/20">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything"
                className="flex-1 min-h-0 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-2 px-2 text-gray-900 placeholder:text-gray-500"
                rows={1}
                disabled={isLoading}
              />

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full transition-all duration-200 hover:bg-gray-200"
                >
                  <Mic className="h-4 w-4 text-gray-600" />
                </Button>

                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className={cn(
                    "h-4 w-4",
                    isLoading && "animate-pulse"
                  )} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Order 2 in RTL, Order 1 in LTR */}
      <div className={cn(
        "hidden md:flex md:w-64 bg-background flex-shrink-0",
        isRTL ? "border-l order-2" : "border-r order-1"
      )}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side={isRTL ? "right" : "left"} className="w-64 p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}
