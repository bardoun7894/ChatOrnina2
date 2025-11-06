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
        // Verify the conversation exists before restoring it
        handleLoadConversation(lastConversationId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // loadConversations and handleLoadConversation are stable

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
    // No need to reload - state update will trigger re-render
  };

  const handleLoadConversation = async (conversationId: string) => {
    // First verify the conversation exists
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.status === 404) {
        // Conversation doesn't exist, remove from localStorage and don't set it
        localStorage.removeItem('lastActiveConversation');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setCurrentConversationId(conversationId);
      }
    } catch (error) {
      console.error('Error verifying conversation:', error);
      localStorage.removeItem('lastActiveConversation');
    }
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
        // Immediately update local state for instant UI feedback
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // If deleted conversation was active, start new chat
        if (conversationId === currentConversationId) {
          setCurrentConversationId(null);
          localStorage.removeItem('lastActiveConversation');
        }

        // Reload conversations from server to ensure sync
        await loadConversations();
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
      "bg-gradient-to-br from-[#F3F4F6] to-[#DFE2E8]"
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed top-0 h-full z-40 transition-transform duration-300 ease-in-out lg:hidden w-full max-w-xs sm:max-w-sm rtl-sidebar-mobile sidebar-no-inner-rounded",
          "galileo-glass-frosted",
          isRTL ? "right-0" : "left-0",
          isSidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
        )}
      >
        <Sidebar
          onClose={() => setIsSidebarOpen(false)}
          onNewChat={handleNewChat}
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
        "relative"
      )} style={{
        backgroundColor: 'var(--galileo-glass-bg)',
        backdropFilter: 'var(--galileo-glass-blur)',
        border: '1px solid var(--galileo-glass-border)',
        boxShadow: 'var(--galileo-glass-shadow)'
      }}>
        {/* Apple-style glassy divider on right side */}
        <div className={cn(
          "absolute top-0 bottom-0 w-px",
          isRTL ? "left-0" : "right-0"
        )} style={{
          background: 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.05), transparent)'
        }}></div>
        <Sidebar
          onNewChat={handleNewChat}
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
          conversationId={currentConversationId}
          userId={session.user.id}
          userName={session.user.name || session.user.email || undefined}
          onConversationSaved={loadConversations}
        />
      </div>
    </div>
  );
}
