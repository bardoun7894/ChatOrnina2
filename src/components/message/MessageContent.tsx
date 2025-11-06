import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CodeBlock, InlineCode } from './CodeBlock';
import { ImageViewer } from './ImageViewer';
import { VideoPlayer } from './VideoPlayer';
import { FileAttachmentViewer } from './FileAttachmentViewer';
import { cn } from '@/lib/utils';
import type { MessageAttachment } from '@/types/chat';

interface MessageContentProps {
  content: string;
  className?: string;
  attachments?: MessageAttachment[];
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  className,
  attachments,
}) => {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Code blocks
          code(props) {
            const { node, className, children, ...rest } = props;
            const inline = !('inline' in props) ? false : props.inline as boolean;
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
              <InlineCode {...rest}>
                {children}
              </InlineCode>
            );
          },

          // Images
          img({ src, alt, ...props }) {
            if (!src) return null;

            // Check if it's a video based on extension
            const srcString = typeof src === 'string' ? src : '';
            const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
            const isVideo = videoExtensions.some(ext => srcString.toLowerCase().endsWith(ext));

            if (isVideo) {
              return <VideoPlayer src={srcString} caption={alt} />;
            }

            return <ImageViewer src={srcString} alt={alt || 'Image'} />;
          },

          // Links
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
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
      
      {/* Render file attachments */}
      {attachments && attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((attachment, index) => (
            <FileAttachmentViewer
              key={index}
              url={attachment.url}
              name={attachment.name}
              mimeType={attachment.mimeType}
              size={attachment.size}
            />
          ))}
        </div>
      )}
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
