'use client';

import { memo } from 'react';
import { SearchResultItem } from './SearchResultItem';
import type { StreamableSong } from '@/lib/music-api';

interface SearchResultsSectionProps {
  title: string;
  source: 'local' | 'api' | 'saavn' | 'ytmusic';
  songs: StreamableSong[];
  onPlay?: () => void;
  onClose?: () => void;
}

export const SearchResultsSection = memo(function SearchResultsSection({
  title,
  source,
  songs,
  onPlay,
  onClose,
}: SearchResultsSectionProps) {
  if (songs.length === 0) {
    return null;
  }

  const getSourceColor = () => {
    switch (source) {
      case 'local':
        return 'bg-blue-500/20 text-blue-500';
      case 'api':
        return 'bg-purple-500/20 text-purple-500';
      case 'saavn':
        return 'bg-green-500/20 text-green-500';
      case 'ytmusic':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <>
      <div className='px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border flex items-center gap-2'>
        <span className={`px-2 py-1 ${getSourceColor()} rounded text-xs`}>
          {source.toUpperCase()}
        </span>
        {title} ({songs.length})
      </div>
      {songs.map(song => (
        <SearchResultItem
          key={song.id}
          song={song}
          source={source}
          onPlay={onPlay}
          onClose={onClose}
        />
      ))}
    </>
  );
});
