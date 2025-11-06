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
    'chat.remember_context': 'Remember what user said earlier in conversation',
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
    
    // HomeChat specific
    'homechat.title': 'OpenAI Chat',
    'homechat.greeting': 'Hey there!',
    'homechat.subtitle': "Let's start a new conversation.",
    'homechat.helpText': 'How can I help you today?',
    'homechat.commandsHelp': 'Try commands like',
    'homechat.placeholder': 'Type your message...',
    'homechat.generating_image': 'Generating image...',
    'homechat.image_error': 'Failed to load image.',
    'homechat.generating_video': 'Generating video...',
    'homechat.video_error': 'Failed to load video.',
    'homechat.recent_chats': 'Recent Chats',
    'homechat.new_chat': 'New Chat',
    'homechat.image_prompt': 'Describe the image you want to create...',
    'homechat.video_prompt': 'Describe the video you want to create...',
    'homechat.code_prompt': 'What code would you like me to generate?',
    'homechat.figma_prompt': 'What programming language? (e.g., React, HTML, Vue)',
    'homechat.no_conversations': 'No conversations yet',
    'homechat.code_snippet': 'Code Snippet',
    'homechat.copy': 'Copy',
    'homechat.copied': 'Copied!',
    'homechat.copy_message': 'Copy message',
    'homechat.message_copied': 'Message copied!',
    'homechat.ai_generation': 'AI Generation',
    'homechat.create_image': 'Create Image',
    'homechat.create_video': 'Create Video',
    'homechat.create_code': 'Create Code',
    'homechat.create_figma_to_code': 'Image UI UX to code',
    'homechat.files': 'Files',
    'homechat.add_files': 'Add Files',
    
    // Voice interaction
    'voice.title': 'Voice Assistant',
    'voice.listening': 'Listening...',
    'voice.processing': 'Processing...',
    'voice.speaking': 'Speaking...',
    'voice.instructions': 'Click the microphone button to start speaking with your AI assistant.',
    'voice.privacy_note': 'Your voice is processed locally and sent securely for transcription.',
    'voice.go_to_chat': 'Go to Chat',
    'voice.send_to_chat': 'Send to Chat',

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
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.search': 'Search',
    'common.clear': 'Clear',
    'common.send': 'Send',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.settings': 'Settings',
    'common.profile': 'Profile',
    'common.logout': 'Logout',
    'common.login': 'Login',
    'common.register': 'Register',
    'common.home': 'Home',
    'common.chat': 'Chat',
    'common.voice': 'Voice',
    'common.help': 'Help',
    'common.about': 'About'
  },
  ar: {
    // Navigation
    'nav.new_chat': 'دردشة جديدة',
    'nav.search': 'بحث',
    'nav.settings': 'الإعدادات',
    'nav.help': 'المساعدة',
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
    'chat.welcome_description': 'اسألني أي شيء! يمكنني المساعدة في الكتابة والتحليل والرياضيات والبرمجة والإبداع وأكثر من ذلك بكثير.',
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
    
    // HomeChat specific
    'homechat.title': 'دردشة OpenAI',
    'homechat.greeting': 'مرحباً!',
    'homechat.subtitle': 'لنبدأ محادثة جديدة.',
    'homechat.helpText': 'كيف يمكنني مساعدتك اليوم؟',
    'homechat.commandsHelp': 'جرب الأوامر مثل',
    'homechat.placeholder': 'اكتب رسالتك...',
    'homechat.generating_image': 'جاري إنشاء الصورة...',
    'homechat.image_error': 'فشل تحميل الصورة.',
    'homechat.generating_video': 'جاري إنشاء الفيديو...',
    'homechat.video_error': 'فشل تحميل الفيديو.',
    'homechat.recent_chats': 'المحادثات الأخيرة',
    'homechat.new_chat': 'محادثة جديدة',
    'homechat.image_prompt': 'صف الصورة التي تريد إنشاءها...',
    'homechat.video_prompt': 'صف الفيديو الذي تريد إنشاءه...',
    'homechat.code_prompt': 'ما الكود الذي تريد أن أنشئه؟',
    'homechat.figma_prompt': 'ما لغة البرمجة؟ (على سبيل المثال، React، HTML، Vue)',
    'homechat.no_conversations': 'لا توجد محادثات بعد',
    'homechat.code_snippet': 'مقتطف الكود',
    'homechat.copy': 'نسخ',
    'homechat.copied': 'تم النسخ!',
    'homechat.copy_message': 'نسخ الرسالة',
    'homechat.message_copied': 'تم نسخ الرسالة!',
    'homechat.ai_generation': 'إنشاء AI',
    'homechat.create_image': 'إنشاء صورة',
    'homechat.create_video': 'إنشاء فيديو',
    'homechat.create_code': 'إنشاء كود',
    'homechat.create_figma_to_code': 'صورة UI/UX إلى كود',
    'homechat.files': 'الملفات',
    'homechat.add_files': 'إضافة ملفات',
    
    // Voice interaction
    'voice.title': 'مساعد الصوت',
    'voice.listening': 'جاري الاستماع...',
    'voice.processing': 'جاري المعالجة...',
    'voice.speaking': 'جاري التحدث...',
    'voice.instructions': 'انقر على زر الميكروفون لبدء التحدث مع مساعدك الذكي.',
    'voice.privacy_note': 'يتم معالجة صوتك محلياً وإرساله بشكل آمن للنسخ.',
    'voice.go_to_chat': 'الذهاب إلى الدردشة',
    'voice.send_to_chat': 'إرسال إلى الدردشة',

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
    'common.save': 'حفظ',
    'common.delete': 'حذف',
    'common.edit': 'تحرير',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.search': 'بحث',
    'common.clear': 'مسح',
    'common.send': 'إرسال',
    'common.copy': 'نسخ',
    'common.copied': 'تم النسخ',
    'common.download': 'تحميل',
    'common.upload': 'رفع',
    'common.settings': 'الإعدادات',
    'common.profile': 'الملف الشخصي',
    'common.logout': 'تسجيل الخروج',
    'common.login': 'تسجيل الدخول',
    'common.register': 'إنشاء حساب',
    'common.home': 'الرئيسية',
    'common.chat': 'الدردشة',
    'common.voice': 'الصوت',
    'common.help': 'المساعدة',
    'common.about': 'حول'
  },
};

// Language context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  tWithParams: (key: string, params: Record<string, any>) => string;
  isRTL: boolean;
}

// Create context
const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => key,
  tWithParams: (key: string, params: Record<string, any>) => key,
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

  // Load language from backend on mount (only if authenticated)
  useEffect(() => {
    const loadUserPreferences = async () => {
      // Skip API call on public pages to avoid 401 noise in console
      if (typeof window !== 'undefined' && (
        window.location.pathname === '/' ||
        window.location.pathname.startsWith('/auth/') ||
        window.location.pathname === '/auth/login' ||
        window.location.pathname === '/auth/register'
      )) {
        return; // Use localStorage only on public/auth pages
      }

      // Check if NextAuth session exists before calling API
      // This prevents 401 errors in console on initial page load
      if (typeof window !== 'undefined') {
        // Check for NextAuth session cookie
        const hasSessionCookie = document.cookie.includes('next-auth.session-token') ||
                                 document.cookie.includes('__Secure-next-auth.session-token');

        if (!hasSessionCookie) {
          // No session cookie, user not authenticated - use localStorage only
          return;
        }
      }

      try {
        const response = await fetch('/api/user/preferences');
        // Only process if authenticated (200), silently ignore 401
        if (response.ok) {
          const data = await response.json();
          if (data.preferences?.language) {
            setLanguageState(data.preferences.language as Language);
            if (typeof window !== 'undefined') {
              localStorage.setItem('language', data.preferences.language);
            }
          }
        } else if (response.status === 401) {
          // User not authenticated, use localStorage only
          // This is expected behavior on public pages
          return;
        }
      } catch (error) {
        // Network error or other issue - silently continue with localStorage
        return;
      }
    };
    loadUserPreferences();
  }, []);

  // Set language and save to both localStorage and backend
  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }

    // Skip API call on public pages to avoid 401 noise
    if (typeof window !== 'undefined' && (
      window.location.pathname === '/' ||
      window.location.pathname.startsWith('/auth/') ||
      window.location.pathname === '/auth/login' ||
      window.location.pathname === '/auth/register'
    )) {
      return; // localStorage is enough on public/auth pages
    }

    // Check if NextAuth session exists before calling API
    if (typeof window !== 'undefined') {
      const hasSessionCookie = document.cookie.includes('next-auth.session-token') ||
                               document.cookie.includes('__Secure-next-auth.session-token');
      if (!hasSessionCookie) {
        return; // No session, skip backend sync
      }
    }

    // Save to backend (only if authenticated)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      // Silently ignore 401 - user not logged in, localStorage is enough
      if (!response.ok && response.status !== 401) {
        console.error('Error saving language preference:', response.statusText);
      }
    } catch (error) {
      // Network error - silently continue, localStorage was already updated
      return;
    }
  };

  // Translation function
  const t = (key: string, fallback?: string): string => {
    return translations[language][key] || fallback || key;
  };

  // Translation function with parameters
  const tWithParams = (key: string, params: Record<string, any> = {}): string => {
    let translation = translations[language][key] || key;
    
    // Replace {{param}} placeholders with actual values
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`{{${param}}}`, 'g');
      translation = translation.replace(regex, params[param]);
    });
    
    return translation;
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
    <LanguageContext.Provider value={{ language, setLanguage, t, tWithParams, isRTL }}>
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