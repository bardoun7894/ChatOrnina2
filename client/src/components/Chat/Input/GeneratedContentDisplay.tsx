import React, { useState } from 'react';
import { X, Download, Copy } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface GeneratedContentDisplayProps {
  content: any;
  type: string;
  onClose: () => void;
}

export default function GeneratedContentDisplay({
  content,
  type,
  onClose
}: GeneratedContentDisplayProps) {
  const localize = useLocalize();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    if (content?.url) {
      const link = document.createElement('a');
      link.href = content.url;
      link.download = `generated-${type}-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopy = () => {
    if (content?.text) {
      navigator.clipboard.writeText(content.text);
    } else if (content?.url) {
      navigator.clipboard.writeText(content.url);
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <div className="relative">
            {content?.url ? (
              <img
                src={content.url}
                alt="Generated image"
                className="max-w-full h-auto rounded-lg"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load image');
                }}
              />
            ) : (
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {localize('com_ui_no_image_data')}
                </span>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900 rounded-lg">
                <span className="text-red-500 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            {content?.url ? (
              <video
                src={content.url}
                controls
                className="max-w-full h-auto rounded-lg"
                onLoadStart={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load video');
                }}
              />
            ) : (
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {localize('com_ui_no_video_data')}
                </span>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900 rounded-lg">
                <span className="text-red-500 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="relative">
            {content?.url ? (
              <audio
                src={content.url}
                controls
                className="w-full"
                onLoadStart={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load audio');
                }}
              />
            ) : (
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {localize('com_ui_no_audio_data')}
                </span>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900 rounded-lg">
                <span className="text-red-500 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            {content?.text ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                {content.text}
              </pre>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                {localize('com_ui_no_text_data')}
              </span>
            )}
          </div>
        );

      case 'design':
        return (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            {content?.analysis ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {localize('com_ui_design_analysis')}
                </h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                  {content.analysis}
                </pre>
                {content?.suggestions && (
                  <div>
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {localize('com_ui_design_suggestions')}
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-800 dark:text-gray-200">
                      {content.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">
                {localize('com_ui_no_design_data')}
              </span>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400">
              {localize('com_ui_unknown_content_type')}
            </span>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "relative bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700",
      "max-w-2xl mx-auto my-4"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {localize(`com_ui_${type}_generation`)}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={localize('com_ui_close')}
        >
          <X size={20} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      <div className="p-4">
        {renderContent()}
      </div>
      
      <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
        {(type === 'text' || type === 'design') && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Copy size={16} />
            {localize('com_ui_copy')}
          </button>
        )}
        {(type === 'image' || type === 'video' || type === 'audio') && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Download size={16} />
            {localize('com_ui_download')}
          </button>
        )}
      </div>
    </div>
  );
}
