import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  className?: string;
  caption?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  width,
  height,
  className,
  caption,
  autoPlay = false,
  loop = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted rounded-lg my-4">
        <div className="text-center">
          <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load video</p>
          <p className="text-xs text-muted-foreground mt-1">{src}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative group my-4', className)}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg z-10" />
      )}

      {/* Video container */}
      <div className="relative rounded-lg overflow-hidden border bg-black">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          width={width}
          height={height}
          loop={loop}
          autoPlay={autoPlay}
          className="w-full h-auto"
          style={{
            maxHeight: '500px',
          }}
          onLoadedData={handleLoadedData}
          onError={handleError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          Your browser does not support the video tag.
        </video>

        {/* Controls overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
            {/* Play/Pause button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Mute button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1" />

            {/* Fullscreen button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Play button overlay when paused */}
        {!isPlaying && !isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors">
              <Play className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <p className="text-xs text-muted-foreground mt-2 text-center italic">
          {caption}
        </p>
      )}
    </div>
  );
};

// Video placeholder for loading state
export const VideoPlaceholder: React.FC<{ width?: number; height?: number }> = ({
  width = 800,
  height = 450,
}) => {
  return (
    <div
      className="bg-muted animate-pulse rounded-lg my-4 flex items-center justify-center"
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <Play className="h-12 w-12 text-muted-foreground" />
    </div>
  );
};
