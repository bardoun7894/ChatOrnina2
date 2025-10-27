import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center justify-center p-8 bg-muted rounded-lg my-4">
        <div className="text-center">
          <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load image</p>
          <p className="text-xs text-muted-foreground mt-1">{src}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('relative group my-4', className)}>
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
        )}

        {/* Image container */}
        <div
          className="relative rounded-lg overflow-hidden cursor-pointer border bg-muted hover:opacity-90 transition-opacity"
          onClick={() => setIsOpen(true)}
        >
          <Image
            src={src}
            alt={alt}
            width={width || 800}
            height={height || 600}
            className="w-full h-auto object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              maxHeight: '500px',
              objectFit: 'contain',
            }}
          />

          {/* Expand button overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <p className="text-xs text-muted-foreground mt-2 text-center italic">
            {caption}
          </p>
        )}
      </div>

      {/* Fullscreen modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0">
          <div className="relative w-full h-full flex items-center justify-center bg-black/90">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain p-4"
              sizes="95vw"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Image placeholder for loading state
export const ImagePlaceholder: React.FC<{ width?: number; height?: number }> = ({
  width = 800,
  height = 600,
}) => {
  return (
    <div
      className="bg-muted animate-pulse rounded-lg my-4"
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: `${width} / ${height}`,
      }}
    />
  );
};
