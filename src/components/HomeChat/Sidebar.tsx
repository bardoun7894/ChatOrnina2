import React, { useState } from 'react';
import {
  ChevronUpDownIcon,
  SearchIcon,
  MessageIcon,
  PlusIcon,
  XIcon,
  LogoIcon,
  LogoutIcon
} from './icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface KbdProps {
  children: React.ReactNode;
}

const Kbd: React.FC<KbdProps> = ({ children }) => (
  <kbd className={cn(
    "px-2 py-1 text-xs font-medium rounded-md",
    "galileo-glass-subtle",
    "galileo-text-tertiary"
  )}>
    {children}
  </kbd>
);

interface SidebarProps {
  onClose?: () => void;
  onNewChat?: () => void;
  conversations?: any[];
  currentConversationId?: string | null;
  onLoadConversation?: (conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  user?: any;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  onNewChat,
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  user
}) => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const filteredConversations = conversations?.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <aside className={cn(
      "w-full lg:w-64 p-3 lg:p-4 flex flex-col h-full transition-colors"
    )}>
      <div className="flex items-center gap-2 flex-shrink-0 mb-3 relative">
        <LogoIcon />
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-sm truncate", "galileo-text-primary")}>
            {user?.name || 'User'}
          </p>
          <p className={cn("text-xs truncate", "galileo-text-tertiary")}>
            {user?.email || 'user@ornina.ai'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn("hidden lg:block hover:opacity-80", "galileo-text-tertiary")}
        >
          <ChevronUpDownIcon className="w-4 h-4" />
        </button>
        {onClose && (
          <button onClick={onClose} className={cn("lg:hidden p-1 hover:opacity-80", "galileo-text-tertiary")} aria-label="Close menu">
            <XIcon className="w-5 h-5" />
          </button>
        )}

        {/* Settings Dropdown */}
        {showSettings && (
          <div
            className={cn(
              "absolute top-full left-0 right-0 mt-1 p-2 z-50",
              "bg-white/90 backdrop-blur-2xl border border-white/30 shadow-xl rounded-xl",
              "overflow-hidden"
            )}
          >
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  toggleLanguage();
                  setShowSettings(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  "text-gray-800 hover:bg-white/50"
                )}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span>{language === 'en' ? 'العربية' : 'English'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative mb-3 flex-shrink-0">
        <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-2.5' : 'left-0 pl-2.5'} flex items-center pointer-events-none`}>
          <SearchIcon className={cn("w-4 h-4", "galileo-text-tertiary")} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('navigation.search')}
          className={cn(
            "w-full py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 transition-colors",
            "bg-white/60 backdrop-blur-xl border border-white/30 text-gray-800 placeholder-gray-500 focus:bg-white/80 focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
          )}
          style={{
            paddingInlineStart: '2.25rem',
            paddingInlineEnd: '3rem'
          }}
        />
        <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-2.5' : 'right-0 pr-2.5'} flex items-center`}>
          <Kbd>/</Kbd>
        </div>
      </div>

      <button
        onClick={onNewChat}
        className={cn(
          "flex items-center justify-center gap-2 w-full px-3 py-2.5 mb-3 text-sm font-medium rounded-lg transition-all duration-200 flex-shrink-0",
          "bg-white/60 backdrop-blur-xl border border-white/30 text-gray-800 hover:bg-white/80 hover:border-gray-300 hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99]"
        )}
      >
        <PlusIcon className="w-4 h-4" />
        <span>{t('homechat.newChat')}</span>
      </button>

      <div className={`flex-1 overflow-y-auto ${isRTL ? '-ml-2 pl-2' : '-mr-2 pr-2'}`}>
        <nav>
          <p className={cn("px-3 py-1.5 text-xs font-semibold uppercase tracking-wide", "galileo-text-tertiary")}>
            {t('homechat.recentChats')}
          </p>
          <ul>
            {filteredConversations.length === 0 ? (
              <li className={cn("px-3 py-2 text-sm text-center", "galileo-text-tertiary")}>
                {conversations?.length === 0 ? t('homechat.no_conversations') || 'No conversations yet' : 'No results'}
              </li>
            ) : (
              filteredConversations.map((conv) => (
                <li
                  key={conv.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredItemId(conv.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <button
                    onClick={() => onLoadConversation?.(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 truncate text-sm",
                      conv.id === currentConversationId 
                        ? "bg-white/80 backdrop-blur-xl border border-gray-300 font-medium text-gray-800 shadow-sm" 
                        : "text-gray-600 hover:bg-white/50 hover:border-white/40"
                    )}
                  >
                    <MessageIcon className={cn("w-4 h-4 flex-shrink-0", "galileo-text-tertiary")} />
                    <span className="truncate flex-1 text-left">{conv.title || 'Untitled'}</span>
                  </button>
                  {hoveredItemId === conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation?.(conv.id);
                      }}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200",
                        isRTL ? 'left-2' : 'right-2',
                        "text-red-500 hover:bg-red-500/20 hover:backdrop-blur-sm"
                      )}
                      aria-label="Delete conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </nav>
      </div>
      
      {/* Logout Button at Bottom */}
      <div className="flex-shrink-0 mt-3 pt-3 border-t border-white/20">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
            "text-red-600 hover:bg-red-50/80 hover:text-red-700 hover:backdrop-blur-sm"
          )}
        >
          <LogoutIcon className="w-4 h-4" />
          <span>{t('navigation.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
