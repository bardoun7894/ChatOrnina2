import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: Translations = {
  // Sidebar
  'sidebar.search': { en: 'Search', ar: 'بحث' },
  'sidebar.newChat': { en: 'New Chat', ar: 'محادثة جديدة' },
  'sidebar.recentChats': { en: 'Recent Chats', ar: 'المحادثات الأخيرة' },
  'sidebar.name': { en: 'Kevin Dukkon', ar: 'كيفن دوكون' },
  'sidebar.email': { en: 'hey@kevdu.co', ar: 'hey@kevdu.co' },

  // Chat
  'chat.title': { en: 'Gemini Chat', ar: 'دردشة جيميني' },
  'chat.greeting': { en: 'Hey, Kevin!', ar: 'مرحباً، كيفن!' },
  'chat.subtitle': { en: "Let's start a new conversation.", ar: 'لنبدأ محادثة جديدة.' },
  'chat.aiCall': { en: 'AI Call', ar: 'مكالمة ذكية' },
  'chat.helpText': { en: 'How can I help you today?', ar: 'كيف يمكنني مساعدتك اليوم؟' },
  'chat.commandsHelp': { en: 'Try commands like', ar: 'جرب الأوامر مثل' },
  'chat.placeholder': { en: 'Type your message, or try /image, /video, /code...', ar: 'اكتب رسالتك، أو جرب /image, /video, /code...' },
  'chat.generating': { en: 'Generating', ar: 'جاري الإنشاء' },
  'chat.generatingImage': { en: 'Generating image...', ar: 'جاري إنشاء الصورة...' },
  'chat.generatingVideo': { en: 'Generating video... (this may take a minute)', ar: 'جاري إنشاء الفيديو... (قد يستغرق دقيقة)' },
  'chat.imageError': { en: 'Failed to load image.', ar: 'فشل تحميل الصورة.' },
  'chat.videoError': { en: 'Failed to load video.', ar: 'فشل تحميل الفيديو.' },
  'chat.error': { en: 'Sorry, something went wrong. Please try again.', ar: 'عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.' },

  // Buttons & Actions
  'button.send': { en: 'Send message', ar: 'إرسال رسالة' },
  'button.microphone': { en: 'Use microphone', ar: 'استخدام الميكروفون' },
  'button.openMenu': { en: 'Open menu', ar: 'فتح القائمة' },
  'button.closeMenu': { en: 'Close menu', ar: 'إغلاق القائمة' },
  'button.copy': { en: 'Copy code', ar: 'نسخ الكود' },
  'button.copied': { en: 'Copied!', ar: 'تم النسخ!' },

  // Language
  'language.switch': { en: 'العربية', ar: 'English' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language);

    // Update document direction and language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
