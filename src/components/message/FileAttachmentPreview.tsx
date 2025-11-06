import React from 'react';
import { cn } from '@/lib/utils';
import { 
  File, 
  FileText, 
  X,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';

interface FileAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface FileAttachmentPreviewProps {
  files: FileAttachment[];
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const FileAttachmentPreview: React.FC<FileAttachmentPreviewProps> = ({
  files,
  onRemoveFile,
  onClearAll,
  className,
}) => {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-3 w-3" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="h-3 w-3" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-3 w-3" />;
    if (mimeType.includes('pdf')) return <FileText className="h-3 w-3" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Archive className="h-3 w-3" />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return <FileCode className="h-3 w-3" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-3 w-3" />;
    return <File className="h-3 w-3" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  if (files.length === 0) return null;

  return (
    <div className={cn(
      "mb-3 p-3 rounded-xl",
      "bg-white/60 galileo-glass border border-gray-200/60",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">
          {files.length} {files.length === 1 ? 'file' : 'files'} attached
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          Clear all
        </button>
      </div>
      
      {/* Display images in a grid */}
      {files.some(file => isImage(file.mimeType)) && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {files.filter(file => isImage(file.mimeType)).map((file) => (
            <div key={file.id} className="relative group">
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-12 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Display non-image files in a list */}
      {files.some(file => !isImage(file.mimeType)) && (
        <div className="space-y-1">
          {files.filter(file => !isImage(file.mimeType)).map((file) => (
            <div key={file.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-100/30 group">
              <div className="flex-shrink-0 w-5 h-5 rounded bg-gray-100/50 flex items-center justify-center text-gray-600">
                {getFileIcon(file.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                {file.size && (
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove file"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
