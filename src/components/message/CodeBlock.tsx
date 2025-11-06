import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  fileName,
  showLineNumbers = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative group rounded-lg overflow-hidden my-4 bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {fileName && (
            <span className="text-xs font-medium text-slate-400">
              {fileName}
            </span>
          )}
          {language && language !== 'text' && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 font-mono">
              {language}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Content */}
      <div className="relative overflow-x-auto">
        <pre className="m-0 p-4 text-sm bg-transparent text-slate-100 font-mono leading-6">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// Inline code component
interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({ children, className }) => {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground',
        className
      )}
    >
      {children}
    </code>
  );
};
