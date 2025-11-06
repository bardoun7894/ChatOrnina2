import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Maximize2, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  caption?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt = 'Image',
  width,
  height,
  className,
  caption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="flex items-center justify-center p-3 bg-white/60 galileo-glass border border-gray-200/60 rounded-xl my-3 max-w-md">
        <div className="text-center">
          <X className="h-6 w-6 text-gray-500 mx-auto mb-2" />
          <p className="text-xs text-gray-600">Failed to load image</p>
          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{src}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('relative group my-3 max-w-md', className)}>
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 galileo-glass border border-gray-200/60 animate-pulse rounded-xl" />
        )}

        {/* Image container */}
        <div
          className="relative rounded-xl overflow-hidden cursor-pointer border transition-all duration-200 bg-white/60 galileo-glass border-gray-200/60 hover:border-gray-300/70"
          onClick={() => setIsOpen(true)}
        >
          <Image
            src={src}
            alt={alt}
            width={width || 400}
            height={height || 300}
            className="w-full h-auto object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              maxHeight: '300px',
              objectFit: 'contain',
            }}
          />

          {/* Expand button overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0 shadow-lg bg-white/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <p className="text-xs text-gray-500 mt-1 text-center italic">
            {caption}
          </p>
        )}
      </div>

      {/* Fullscreen modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative flex items-center justify-center h-full bg-black/5">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 h-8 w-8 p-0 bg-white/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <Image
              src={src}
              alt={alt}
              width={width || 800}
              height={height || 600}
              className="max-w-full max-h-[80vh] object-contain"
            />
            
            {caption && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-sm text-white bg-black/50 backdrop-blur-sm inline-block px-3 py-1 rounded-lg">
                  {caption}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Image placeholder for loading state
export const ImagePlaceholder: React.FC<{ width?: number; height?: number }> = ({
  width = 300,
  height = 200,
}) => {
  return (
    <div
      className="bg-white/60 galileo-glass border border-gray-200/60 animate-pulse rounded-xl my-3"
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: `${width} / ${height}`,
      }}
    />
  );
};
