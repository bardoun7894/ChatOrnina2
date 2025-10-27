import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define supported languages
export type Language = 'en' | 'ar';

// Define translation type
export type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

// Translation data
const translations: Translations = {
  en: {
    // Navigation
    'nav.new_chat': 'New chat',
    'nav.search': 'Search',
    'nav.settings': 'Settings',
    'nav.help': 'Help',
    'nav.search_conversations': 'Search conversations...',
    'nav.delete': 'Delete',
    'nav.profile': 'Profile',
    'nav.ornina_chat': 'Ornina Chat',
    'nav.logout': 'Logout',
    
    // Chat interface
    'chat.type_message': 'Type a message...',
    'chat.send': 'Send',
    'chat.stop_generating': 'Stop generating',
    'chat.regenerate': 'Regenerate',
    'chat.copy': 'Copy',
    'chat.delete': 'Delete',
    'chat.edit': 'Edit',
    'chat.save': 'Save',
    'chat.cancel': 'Cancel',
    'chat.welcome_message': 'How can I help you today?',
    'chat.welcome_description': 'Ask me anything! I can help with writing, analysis, math, coding, creative tasks, and much more.',
    'chat.capabilities': 'Capabilities',
    'chat.remember_context': 'Remember what user said earlier in the conversation',
    'chat.limitations': 'Limitations',
    'chat.incorrect_information': 'May occasionally generate incorrect information',
    'chat.thinking': 'Thinking...',
    'chat.send_message_placeholder': 'Send a message...',
    'chat.attach_file': 'Attach file',
    'chat.upload_image': 'Upload image',
    'chat.stop_recording': 'Stop recording',
    'chat.voice_input': 'Voice input',
    'chat.send_message': 'Send message',
    'chat.disclaimer': 'OrninaAi can make mistakes. Consider checking important information.',
    'chat.edited': 'edited',
    
    // Settings
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.system': 'System',
    'settings.title': 'Settings',
    
    // Profile
    'profile.title': 'Profile',
    'profile.account_settings': 'Account Settings',
    'profile.edit_profile': 'Edit Profile',
    'profile.preferences': 'Preferences',
    'profile.help_support': 'Help & Support',
    'profile.logout': 'Logout',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.close': 'Close',
    'common.ok': 'OK',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
  },
  ar: {
    // Navigation
    'nav.new_chat': 'دردشة جديدة',
    'nav.search': 'بحث',
    'nav.settings': 'الإعدادات',
    'nav.help': 'مساعدة',
    'nav.search_conversations': 'البحث في المحادثات...',
    'nav.delete': 'حذف',
    'nav.profile': 'الملف الشخصي',
    'nav.ornina_chat': 'أورنينا شات',
    'nav.logout': 'تسجيل الخروج',
    
    // Chat interface
    'chat.type_message': 'اكتب رسالة...',
    'chat.send': 'إرسال',
    'chat.stop_generating': 'إيقاف التوليد',
    'chat.regenerate': 'إعادة التوليد',
    'chat.copy': 'نسخ',
    'chat.delete': 'حذف',
    'chat.edit': 'تحرير',
    'chat.save': 'حفظ',
    'chat.cancel': 'إلغاء',
    'chat.welcome_message': 'كيف يمكنني مساعدتك اليوم؟',
    'chat.welcome_description': 'اسألني أي شيء! يمكنني المساعدة في الكتابة والتحليل والرياضيات والبرمجة والمهام الإبداعية وأكثر من ذلك بكثير.',
    'chat.capabilities': 'القدرات',
    'chat.remember_context': 'تذكر ما قاله المستخدم سابقاً في المحادثة',
    'chat.limitations': 'القيود',
    'chat.incorrect_information': 'قد ينتج أحياناً معلومات غير صحيحة',
    'chat.thinking': 'أفكر...',
    'chat.send_message_placeholder': 'إرسال رسالة...',
    'chat.attach_file': 'إرفاق ملف',
    'chat.upload_image': 'رفع صورة',
    'chat.stop_recording': 'إيقاف التسجيل',
    'chat.voice_input': 'إدخال صوتي',
    'chat.send_message': 'إرسال الرسالة',
    'chat.disclaimer': 'أورنينا الذكي قد يرتكب أخطاء. فكر في التحقق من المعلومات المهمة.',
    'chat.edited': 'معدل',
    
    // Settings
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.dark': 'داكن',
    'settings.light': 'فاتح',
    'settings.system': 'النظام',
    'settings.title': 'الإعدادات',
    
    // Profile
    'profile.title': 'الملف الشخصي',
    'profile.account_settings': 'إعدادات الحساب',
    'profile.edit_profile': 'تحرير الملف الشخصي',
    'profile.preferences': 'التفضيلات',
    'profile.help_support': 'المساعدة والدعم',
    'profile.logout': 'تسجيل الخروج',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.close': 'إغلاق',
    'common.ok': 'موافق',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.confirm': 'تأكيد',
    'common.cancel': 'إلغاء',
  },
};

// Language context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

// Create context
const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key: string) => key,
  isRTL: true
});

// Language provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get saved language from localStorage or default to Arabic
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      return savedLanguage || 'ar';
    }
    return 'ar';
  });

  // Set language and save to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Check if current language is RTL
  const isRTL = language === 'ar';

  // Update document direction when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Export translations for use in other components
export { translations };