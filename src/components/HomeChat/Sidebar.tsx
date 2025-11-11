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
  toggleSidebar?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  onNewChat,
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  user,
  toggleSidebar
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
        <div className="flex-1 min-w-0" />
        <button
          onClick={toggleSidebar}
          className="p-1 hover:opacity-80 galileo-text-tertiary block"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon" data-label-id="0" data-metatip="true" style={{height: "21px"}}>
            <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
          </svg>
        </button>
        

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
                {conversations?.length === 0 ? t('homechat.noConversations') || 'No conversations yet' : 'No results'}
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
      
      {/* User Profile & Logout Section */}
      <div className="flex-shrink-0 mt-auto pt-3 border-t border-white/20">
        {/* User Profile */}
        <div className="mb-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-semibold text-sm truncate", "galileo-text-primary")}>
                {user?.name || 'User'}
              </p>
              <p className={cn("text-xs truncate opacity-75", "galileo-text-tertiary")}>
                {user?.email || 'user@ornina.ai'}
              </p>
            </div>
            <button 
              className="p-1 hover:opacity-80 galileo-text-tertiary" 
              aria-label="Open settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={() => signOut({ callbackUrl: `${process.env.NEXTAUTH_URL || ''}/auth/login` })} 
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
