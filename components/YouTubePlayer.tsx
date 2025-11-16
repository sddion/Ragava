'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

// YouTube API types
interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getPlayerState: () => number;
}

interface YouTubePlayerEvent {
  target: YouTubePlayer;
  data: number;
}

interface YouTubePlayerVars {
  autoplay: number;
  controls: number;
  modestbranding: number;
  rel: number;
  showinfo: number;
  fs: number;
}

interface YouTubePlayerConfig {
  videoId: string;
  playerVars: YouTubePlayerVars;
  events: {
    onReady: (event: YouTubePlayerEvent) => void;
    onStateChange: (event: YouTubePlayerEvent) => void;
  };
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLIFrameElement,
        config: YouTubePlayerConfig
      ) => YouTubePlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  artist: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function YouTubePlayer({
  videoId,
  title,
  artist,
  isOpen,
  onClose,
}: YouTubePlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoaded(false);

      // Load YouTube iframe API if not already loaded
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          setIsLoaded(true);
        };
      } else {
        setIsLoaded(true);
      }
    }
  }, [isOpen, videoId]);

  const handleOpenInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-border'>
          <div className='flex-1 min-w-0'>
            <h3 className='text-lg font-semibold text-foreground truncate'>
              {title}
            </h3>
            <p className='text-sm text-muted-foreground truncate'>{artist}</p>
          </div>
          <div className='flex items-center space-x-2 ml-4'>
            <button
              onClick={handleOpenInYouTube}
              className='p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors'
              title='Open in YouTube'
            >
              <ExternalLink className='w-4 h-4' />
            </button>
            <button
              onClick={onClose}
              className='p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors'
              title='Close'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* YouTube Player */}
        <div className='relative w-full aspect-video'>
          {isLoaded ? (
            <iframe
              ref={playerRef}
              className='absolute top-0 left-0 w-full h-full'
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={`${title} - ${artist}`}
              frameBorder='0'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
            />
          ) : (
            <div className='absolute top-0 left-0 w-full h-full bg-muted flex items-center justify-center'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                <p className='text-muted-foreground'>
                  Loading YouTube player...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-border'>
          <p className='text-xs text-muted-foreground text-center'>
            Playing via YouTube. Some features may be limited.
          </p>
        </div>
      </div>
    </div>
  );
}

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLIFrameElement,
        config: YouTubePlayerConfig
      ) => YouTubePlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
