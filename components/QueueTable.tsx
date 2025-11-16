'use client';

import { useMusicStore, type MusicSong } from '@/store/musicStore';
import { Play, Pause, X, Clock } from 'lucide-react';
import Image from 'next/image';
import FavoriteButton from './FavoriteButton';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const {
    currentQueue,
    currentQueueIndex,
    currentSongIndex,
    songs,
    isPlaying,
    playPause,
    removeFromQueue,
    clearQueue,
    setCurrentQueueIndex,
    setCurrentSong,
    setIsPlaying,
    setCurrentTime,
  } = useMusicStore();

  const handleSongClick = (index: number) => {
    if (index === currentQueueIndex) {
      playPause();
    } else {
      // Play song directly from queue (works for any source)
      const queueSong = currentQueue[index];
      setCurrentQueueIndex(index);
      setCurrentSong(queueSong);
      setCurrentTime(0);
      setIsPlaying(true);

      console.log('Playing from queue:', queueSong.title, 'Index:', index);
    }
  };

  const handleRemoveFromQueue = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    removeFromQueue(index);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-y-0 right-0 w-80 bg-background border-l border-border z-40 flex flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-border'>
        <h2 className='text-lg font-semibold text-foreground'>Queue</h2>
        <button
          onClick={onClose}
          className='p-1 text-muted-foreground hover:text-foreground transition-colors'
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto'>
        {!currentQueue || currentQueue.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center p-6'>
            <div className='w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4'>
              <Clock className='w-8 h-8 text-muted-foreground' />
            </div>
            <h3 className='text-lg font-semibold text-foreground mb-2'>
              Queue is empty
            </h3>
            <p className='text-muted-foreground text-sm'>
              Add songs to your queue to see them here
            </p>
          </div>
        ) : (
          <div className='p-4'>
            {/* Now Playing Section */}
            {currentQueueIndex >= 0 && currentQueue[currentQueueIndex] && (
              <div className='mb-6'>
                <h3 className='text-sm font-medium text-muted-foreground mb-3'>
                  Now playing
                </h3>
                <div className='bg-muted/30 rounded-lg p-3'>
                  <div className='flex items-center space-x-3'>
                    <div className='relative flex-shrink-0'>
                      <div className='w-12 h-12 rounded-lg overflow-hidden bg-muted'>
                        {currentQueue[currentQueueIndex].cover_url ? (
                          <Image
                            src={currentQueue[currentQueueIndex].cover_url}
                            alt={currentQueue[currentQueueIndex].title}
                            width={48}
                            height={48}
                            className='object-cover'
                            sizes='48px'
                          />
                        ) : (
                          <Image
                            src='/default-album-art.svg'
                            alt='Default album art'
                            width={48}
                            height={48}
                            className='object-cover'
                            sizes='48px'
                          />
                        )}
                      </div>
                      {isPlaying && (
                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center'>
                          <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                        </div>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-foreground truncate'>
                        {currentQueue[currentQueueIndex].title}
                      </p>
                      <p className='text-xs text-muted-foreground truncate'>
                        {currentQueue[currentQueueIndex].artist}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Up Section */}
            <div className='mb-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-medium text-muted-foreground'>
                  Next up
                </h3>
                <div className='flex items-center space-x-2'>
                  <button
                    onClick={clearQueue}
                    className='text-xs text-muted-foreground hover:text-foreground transition-colors'
                  >
                    Clear queue
                  </button>
                </div>
              </div>

              <div className='space-y-1'>
                {currentQueue.map((song: MusicSong, index: number) => {
                  const isCurrentlyPlaying = index === currentQueueIndex;
                  const isNext = index === currentQueueIndex + 1;
                  const isMainLibraryCurrent =
                    songs[currentSongIndex]?.id === song.id;

                  return (
                    <div
                      key={`${song.id}-${index}`}
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                        isCurrentlyPlaying || isMainLibraryCurrent
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSongClick(index)}
                    >
                      <div className='flex-shrink-0 w-8 h-8 flex items-center justify-center'>
                        {isCurrentlyPlaying ? (
                          <div className='w-4 h-4 bg-primary rounded-full flex items-center justify-center'>
                            <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                          </div>
                        ) : isNext ? (
                          <div className='w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center'>
                            <span className='text-xs text-primary font-bold'>
                              →
                            </span>
                          </div>
                        ) : (
                          <div className='flex items-center space-x-2'>
                            <span className='text-xs text-muted-foreground font-mono'>
                              {index + 1}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className='relative flex-shrink-0'>
                        <div className='w-10 h-10 rounded-lg overflow-hidden bg-muted'>
                          {song.cover_url ? (
                            <Image
                              src={song.cover_url}
                              alt={song.title}
                              width={40}
                              height={40}
                              className='object-cover'
                              sizes='40px'
                            />
                          ) : (
                            <Image
                              src='/default-album-art.svg'
                              alt='Default album art'
                              width={40}
                              height={40}
                              className='object-cover'
                              sizes='40px'
                            />
                          )}
                        </div>
                      </div>

                      <div className='flex-1 min-w-0'>
                        <p
                          className={`text-sm font-medium truncate ${
                            isCurrentlyPlaying
                              ? 'text-primary'
                              : 'text-foreground'
                          }`}
                        >
                          {song.title}
                        </p>
                        <p className='text-xs text-muted-foreground truncate'>
                          {song.artist} • {formatTime(song.duration || 0)}
                        </p>
                      </div>

                      <div className='flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                        {isCurrentlyPlaying ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              playPause();
                            }}
                            className='p-1 rounded-full transition-colors text-primary hover:text-primary/80'
                          >
                            {isPlaying ? (
                              <Pause size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleSongClick(index);
                            }}
                            className='p-1 rounded-full transition-colors text-muted-foreground hover:text-foreground'
                          >
                            <Play size={14} />
                          </button>
                        )}
                        <FavoriteButton songId={song.id} size={14} />
                        <button
                          onClick={e => handleRemoveFromQueue(e, index)}
                          className='p-1 rounded-full transition-colors text-muted-foreground hover:text-destructive'
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
