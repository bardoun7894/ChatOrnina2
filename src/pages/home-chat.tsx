import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/HomeChat/Sidebar';
import Chat from '@/components/HomeChat/Chat';
import { cn } from '@/lib/utils';

export default function HomeChat() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const { isRTL } = useLanguage();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Load user conversations and restore last active conversation
  useEffect(() => {
    if (session?.user?.id) {
      loadConversations();

      // Restore last active conversation from localStorage
      const lastConversationId = localStorage.getItem('lastActiveConversation');
      if (lastConversationId) {
        setCurrentConversationId(lastConversationId);
      }
    }
  }, [session?.user?.id]);

  // Save current conversation ID to localStorage whenever it changes
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('lastActiveConversation', currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/conversations?userId=${session.user.id}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleNewChat = async () => {
    setCurrentConversationId(null);
    // Clear last active conversation from localStorage
    localStorage.removeItem('lastActiveConversation');
    // Refresh the page to start a new chat
    window.location.reload();
  };

  const handleLoadConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (response.ok) {
        // Reload conversations
        await loadConversations();
        // If deleted conversation was active, start new chat
        if (conversationId === currentConversationId) {
          setCurrentConversationId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors rtl-container relative",
      isDarkMode ? "bg-gray-950" : "bg-white"
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed top-0 h-full z-40 transition-transform duration-300 ease-in-out lg:hidden w-full max-w-xs sm:max-w-sm rtl-sidebar-mobile",
          isDarkMode ? "bg-gray-900" : "bg-[#F7F8FA]",
          isRTL ? "right-0" : "left-0",
          isSidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
        )}
      >
        <Sidebar
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={handleNewChat}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onLoadConversation={handleLoadConversation}
          onDeleteConversation={handleDeleteConversation}
          user={session.user}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:w-64 flex-shrink-0 transition-colors rtl-sidebar-desktop",
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-[#F7F8FA] border-gray-200",
        isRTL ? "border-l" : "border-r"
      )}>
        <Sidebar
          onNewChat={handleNewChat}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onLoadConversation={handleLoadConversation}
          onDeleteConversation={handleDeleteConversation}
          user={session.user}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden"
      )}>
        <Chat
          onMenuClick={() => setIsSidebarOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          conversationId={currentConversationId}
          userId={session.user.id}
          userName={session.user.name || session.user.email}
          onConversationSaved={loadConversations}
        />
      </div>
    </div>
  );
}
