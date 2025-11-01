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
    <div className="bg-[#2D2D2D]/60 galileo-glass rounded-xl overflow-hidden max-w-full sm:max-w-2xl w-full">
      <div className="flex justify-between items-center px-3 sm:px-4 py-2 bg-gray-700/40 galileo-glass-subtle">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-300">{t('homechat.codeSnippet')}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors">
          <ClipboardIcon className="w-4 h-4" />
          {copied ? t('homechat.copied') : t('homechat.copy')}
        </button>
      </div>
      <pre className="p-3 sm:p-4 text-sm text-white overflow-x-auto ltr:text-left ltr:direction-ltr" dir="ltr"><code>{code}</code></pre>
    </div>
  );
};

export default CodeBlock;
