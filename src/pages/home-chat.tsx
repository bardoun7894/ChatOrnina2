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
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('desktopSidebarVisible');
    return saved === null ? true : saved === 'true';
  });
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isToggling, setIsToggling] = useState(false);
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

  // Persist desktop sidebar visibility preference
  useEffect(() => {
    localStorage.setItem('desktopSidebarVisible', String(isDesktopSidebarVisible));
  }, [isDesktopSidebarVisible]);

  // Handle window resize to sync state across breakpoints
  useEffect(() => {
    const handleResize = () => {
      const mediaQuery = window.matchMedia('(min-width: 1024px)');
      const isDesktop = mediaQuery.matches;

      // Close mobile sidebar when resizing to desktop
      if (isDesktop && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

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

  const toggleSidebar = () => {
    // Prevent toggling during animation or rapid clicks
    if (isToggling) return;

    setIsToggling(true);

    // Use matchMedia to match Tailwind's breakpoint logic exactly
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const isDesktop = mediaQuery.matches;

    if (!isDesktop) {
      // For mobile, toggle the mobile sidebar
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      // For desktop, toggle the desktop sidebar
      setIsDesktopSidebarVisible(!isDesktopSidebarVisible);
    }

    // Re-enable toggling after animation duration (300ms)
    setTimeout(() => setIsToggling(false), 300);
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
      {isSidebarOpen && (
        <div
          className={cn(
            "fixed top-0 h-full z-40 transition-transform duration-300 ease-in-out lg:hidden w-full max-w-xs sm:max-w-sm rtl-sidebar-mobile sidebar-no-inner-rounded",
            "galileo-glass-frosted",
            isRTL ? "right-0" : "left-0",
            'translate-x-0'
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
            toggleSidebar={toggleSidebar}
          />
        </div>
      )}

      {/* Desktop Sidebar Toggle Button - Only visible when sidebar is hidden */}
      {!isDesktopSidebarVisible && (
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex fixed top-4 z-[60] w-10 h-10 rounded-full items-center justify-center transition-all duration-200 shadow-lg galileo-glass-glow text-gray-600 hover:text-gray-800"
          style={{
            [isRTL ? 'left' : 'right']: '16px',
            [isRTL ? 'right' : 'left']: 'auto'
          }}
          aria-label="Show sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon" data-label-id="0" data-metatip="true" style={{height: "21px"}}>
            <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
          </svg>
        </button>
      )}

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex w-64 flex-shrink-0 transition-colors rtl-sidebar-desktop",
        "relative",
        !isDesktopSidebarVisible && "lg:hidden"
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
          toggleSidebar={toggleSidebar}
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
