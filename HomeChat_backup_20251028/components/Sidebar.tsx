import React from 'react';
import {
  LogoIcon,
  ChevronUpDownIcon,
  SearchIcon,
  MessageIcon,
  PlusIcon,
  XIcon
} from './icons';
import type { ChatHistoryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const chatHistory: ChatHistoryItem[] = [
  { id: '1', title: 'History of the Roman Empire' },
  { id: '2', title: 'Quantum Mechanics Explained' },
  { id: '3', title: 'Best Pasta Recipes' },
  { id: '4', title: 'Planning a Trip to Japan' },
];

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-md">
    {children}
  </kbd>
);

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const activeItem = '1';
  const { t, language, setLanguage, isRTL } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <aside className="w-full lg:w-64 bg-[#F7F8FA] p-3 lg:p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 flex-shrink-0 mb-3">
        <LogoIcon />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{t('sidebar.name')}</p>
          <p className="text-xs text-gray-500 truncate">{t('sidebar.email')}</p>
        </div>
        <button
          onClick={toggleLanguage}
          className="text-gray-500 hover:text-gray-800 text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-gray-200/50 transition-colors whitespace-nowrap"
          title={t('language.switch')}
        >
          {t('language.switch')}
        </button>
        <button className="hidden lg:block text-gray-500 hover:text-gray-800">
          <ChevronUpDownIcon className="w-4 h-4" />
        </button>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-gray-800" aria-label={t('button.closeMenu')}>
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="relative mb-3 flex-shrink-0">
        <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-2.5' : 'left-0 pl-2.5'} flex items-center pointer-events-none`}>
          <SearchIcon className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={t('sidebar.search')}
          className={`w-full ${isRTL ? 'pr-9 pl-12' : 'pl-9 pr-12'} py-2 text-sm bg-gray-200/50 border border-gray-200/80 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300`}
        />
        <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-2.5' : 'right-0 pr-2.5'} flex items-center`}>
          <Kbd>/</Kbd>
        </div>
      </div>

      <button className="flex items-center justify-center gap-2 w-full px-3 py-2 mb-3 text-sm text-gray-700 font-medium bg-white border border-gray-200/90 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0">
        <PlusIcon className="w-4 h-4" />
        <span>{t('sidebar.newChat')}</span>
      </button>

      <div className={`flex-1 overflow-y-auto ${isRTL ? '-ml-2 pl-2' : '-mr-2 pr-2'}`}>
        <nav>
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sidebar.recentChats')}</p>
          <ul>
            {chatHistory.map((item) => (
              <li key={item.id}>
                <a
                  href="#"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 truncate text-sm ${
                    item.id === activeItem
                      ? 'bg-gray-200/60 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
                  }`}
                >
                  <MessageIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
