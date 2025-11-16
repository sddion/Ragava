'use client';

import { memo } from 'react';
import Image from 'next/image';
import { PlusCircle, Search, Play } from 'lucide-react';
import { useMusicStore } from '@/store/musicStore';
import { useUnifiedPlayHandler } from '../play-handlers/UnifiedPlayHandler';
import type { StreamableSong } from '@/lib/music-api';

interface SearchResultItemProps {
  song: StreamableSong;
  source: 'local' | 'api' | 'saavn' | 'ytmusic';
  onPlay?: () => void;
  onClose?: () => void;
}

export const SearchResultItem = memo(function SearchResultItem({
  song,
  source: _source,
  onPlay,
  onClose,
}: SearchResultItemProps) {
  const { addToQueue } = useMusicStore();
  const { handlePlay, isConverting } = useUnifiedPlayHandler({
    song,
    onPlayComplete: () => {
      onPlay?.();
      onClose?.();
    },
  });

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();

    const musicSong = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album || '',
      duration: song.duration,
      cover_url: song.cover_url,
      file_url: song.stream_url,
      source: 'api' as const,
      stream_url: song.stream_url,
      preview_url: song.preview_url,
      genre: song.genre,
      year: song.release_date ? parseInt(song.release_date) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addToQueue(musicSong);
  };

  return (
    <div className='search-result-item group'>
      <div className='flex-shrink-0'>
        {song.cover_url ? (
          <Image
            src={song.cover_url}
            alt={song.title}
            width={40}
            height={40}
            className='rounded-lg object-cover'
          />
        ) : (
          <div className='w-10 h-10 bg-muted rounded-lg flex items-center justify-center'>
            <Search className='w-4 h-4 text-muted-foreground' />
          </div>
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <p className='text-foreground font-medium truncate text-sm sm:text-base'>
          {song.title}
        </p>
        <p className='text-muted-foreground text-xs sm:text-sm truncate'>
          {song.artist}
        </p>
        {song.album && (
          <p className='text-muted-foreground/70 text-xs truncate'>
            {song.album}
          </p>
        )}
      </div>

      <div className='flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity'>
        <button
          onClick={handleAddToQueue}
          className='p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors'
          title='Add to queue'
        >
          <PlusCircle size={14} />
        </button>

        <button
          onClick={handlePlay}
          disabled={isConverting}
          className='p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50'
          title={isConverting ? 'Converting...' : 'Play'}
        >
          {isConverting ? (
            <div className='w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin' />
          ) : (
            <Play size={14} />
          )}
        </button>
      </div>
    </div>
  );
});
