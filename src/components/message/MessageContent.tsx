import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CodeBlock, InlineCode } from './CodeBlock';
import { ImageViewer } from './ImageViewer';
import { VideoPlayer } from './VideoPlayer';
import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  className?: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  className,
}) => {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && language) {
              return (
                <CodeBlock
                  code={codeString}
                  language={language}
                  showLineNumbers={false}
                />
              );
            }

            return (
              <InlineCode {...props}>
                {children}
              </InlineCode>
            );
          },

          // Images
          img({ src, alt, ...props }) {
            if (!src) return null;

            // Check if it's a video based on extension
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            const isVideo = videoExtensions.some(ext => src.toLowerCase().endsWith(ext));

            if (isVideo) {
              return <VideoPlayer src={src} caption={alt} />;
            }

            return <ImageViewer src={src} alt={alt || 'Image'} />;
          },

          // Links
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },

          // Paragraphs
          p({ children }) {
            return <p className="mb-4 last:mb-0">{children}</p>;
          },

          // Headings
          h1({ children }) {
            return <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>;
          },

          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="ml-4">{children}</li>;
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 italic bg-muted/30">
                {children}
              </blockquote>
            );
          },

          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-border px-4 py-2 bg-muted font-semibold text-left">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-border px-4 py-2">
                {children}
              </td>
            );
          },

          // Horizontal rule
          hr() {
            return <hr className="my-6 border-border" />;
          },

          // Strong/Bold
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>;
          },

          // Emphasis/Italic
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Helper component for rendering plain text (non-markdown)
export const PlainTextContent: React.FC<MessageContentProps> = ({
  content,
  className,
}) => {
  return (
    <div className={cn('whitespace-pre-wrap', className)}>
      {content}
    </div>
  );
};
