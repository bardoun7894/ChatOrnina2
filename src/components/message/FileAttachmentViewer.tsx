import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { 
  File, 
  FileText, 
  Download, 
  Eye, 
  X,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  FileCode,
  FileSpreadsheet,
  FilePlus
} from 'lucide-react';

interface FileAttachmentViewerProps {
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  className?: string;
}

export const FileAttachmentViewer: React.FC<FileAttachmentViewerProps> = ({
  url,
  name = 'Untitled file',
  mimeType = 'application/octet-stream',
  size,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const getFileIcon = () => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="h-5 w-5" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Archive className="h-5 w-5" />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return <FileCode className="h-5 w-5" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = () => {
    setIsOpen(true);
  };

  const isPreviewable = () => {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('text/') || 
           mimeType.includes('pdf') ||
           mimeType.includes('json') ||
           mimeType.includes('xml');
  };

  return (
    <>
      <div className={cn(
        "group relative my-3 rounded-xl overflow-hidden border transition-all duration-200",
        "bg-white/60 galileo-glass border-gray-200/60 hover:border-gray-300/70",
        "max-w-md",
        className
      )}>
        <div className="flex items-center gap-2 p-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100/50 flex items-center justify-center text-gray-600">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(size)}</p>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isPreviewable() && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handlePreview}
                title="Preview"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleDownload}
              disabled={isDownloading}
              title="Download"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{name}</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-center">
            {mimeType.startsWith('image/') ? (
              <img
                src={url}
                alt={name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            ) : mimeType.includes('pdf') ? (
              <iframe
                src={url}
                title={name}
                className="w-full h-[60vh] rounded-lg"
              />
            ) : mimeType.startsWith('text/') || 
                  mimeType.includes('json') || 
                  mimeType.includes('xml') ? (
              <div className="w-full h-[60vh] overflow-auto rounded-lg bg-gray-50 p-4">
                <pre className="text-sm whitespace-pre-wrap">{url}</pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <FilePlus className="h-12 w-12 mb-2" />
                <p>Preview not available for this file type</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// File placeholder for loading state
export const FilePlaceholder: React.FC<{ width?: number; height?: number }> = ({
  width = 300,
  height = 60,
}) => {
  return (
    <div
      className="bg-white/60 galileo-glass border border-gray-200/60 animate-pulse rounded-xl my-3 flex items-center gap-2 p-2"
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        height: `${height}px`,
      }}
    >
      <div className="w-8 h-8 rounded-lg bg-gray-200/50"></div>
      <div className="flex-1">
        <div className="h-3 bg-gray-200/50 rounded w-3/4 mb-1"></div>
        <div className="h-2 bg-gray-200/50 rounded w-1/2"></div>
      </div>
    </div>
  );
};
