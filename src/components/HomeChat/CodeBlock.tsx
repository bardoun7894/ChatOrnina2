import React, { useState } from 'react';
import { CodeBracketIcon, ClipboardIcon } from './icons';
import { useLanguage } from '@/contexts/LanguageContext';

interface CodeBlockProps {
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#2D2D2D]/60 galileo-glass rounded-xl overflow-hidden w-full max-w-full">
      <div className="flex justify-between items-center px-3 sm:px-4 py-2 bg-gray-700/40 galileo-glass-subtle">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-300">{t('homechat.code_snippet')}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1 sm:gap-1.5 text-xs text-gray-300 hover:text-white transition-colors">
          <ClipboardIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {copied ? t('homechat.copied') : t('homechat.copy')}
        </button>
      </div>
      <pre className="p-3 sm:p-4 text-xs sm:text-sm text-white overflow-x-auto ltr:text-left ltr:direction-ltr max-h-[60vh] overflow-y-auto" dir="ltr"><code>{code}</code></pre>
    </div>
  );
};

export default CodeBlock;
