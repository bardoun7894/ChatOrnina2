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
    <aside className="w-full lg:w-72 bg-[#F7F8FA] p-4 lg:p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 flex-shrink-0">
        <LogoIcon />
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-lg">{t('sidebar.name')}</p>
          <p className="text-sm text-gray-500">{t('sidebar.email')}</p>
        </div>
        <button
          onClick={toggleLanguage}
          className="hidden lg:block text-gray-500 hover:text-gray-800 text-xs font-medium px-2 py-1 rounded hover:bg-gray-200/50 transition-colors"
          title={t('language.switch')}
        >
          {t('language.switch')}
        </button>
        <button className="hidden lg:block text-gray-500 hover:text-gray-800">
          <ChevronUpDownIcon className="w-5 h-5" />
        </button>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-gray-800" aria-label={t('button.closeMenu')}>
            <XIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="relative my-6 flex-shrink-0">
        <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
          <SearchIcon className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={t('sidebar.search')}
          className={`w-full ${isRTL ? 'pr-10 pl-14' : 'pl-10 pr-14'} py-2.5 bg-gray-200/50 border border-gray-200/80 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300`}
        />
        <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}>
          <Kbd>/</Kbd>
        </div>
      </div>

      <button className="flex items-center justify-center gap-2 w-full px-4 py-3 mb-4 text-gray-700 font-semibold bg-white border border-gray-200/90 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0">
        <PlusIcon className="w-5 h-5" />
        <span>{t('sidebar.newChat')}</span>
      </button>

      <div className={`flex-1 overflow-y-auto ${isRTL ? '-ml-2 pl-2' : '-mr-2 pr-2'}`}>
        <nav>
          <p className="px-4 py-2 text-sm font-semibold text-gray-500">{t('sidebar.recentChats')}</p>
          <ul>
            {chatHistory.map((item) => (
              <li key={item.id}>
                <a
                  href="#"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 truncate ${
                    item.id === activeItem
                      ? 'bg-gray-200/60 font-semibold text-gray-900'
                      : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
                  }`}
                >
                  <MessageIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
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
