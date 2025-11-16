'use client';

import { Heart } from 'lucide-react';
import { useMusicStore } from '@/store/musicStore';
import { isApiSong } from '@/lib/music-api';
import { isYTMusicSong as isYTMusicSongFromYT } from '@/lib/ytmusic-api';

interface FavoriteButtonProps {
  songId: string;
  source?: 'local' | 'api' | 'ytmusic' | 'saavn';
  className?: string;
  size?: number;
  showTitle?: boolean;
  disabled?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export default function FavoriteButton({
  songId,
  source,
  className = '',
  size = 14,
  showTitle = true,
  disabled = false,
  onToggle,
}: FavoriteButtonProps) {
  const { favorites, apiFavorites, toggleFavorite } = useMusicStore();

  // Enhanced API song detection with optimized check for UUID format
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      songId
    );

  // Determine if this is an API song with source prioritization
  const isApiSongResult = source
    ? source === 'api' || source === 'saavn' || source === 'ytmusic'
    : isApiSong(songId) || isYTMusicSongFromYT(songId) || isUUID;

  // Optimized favorite checking with clear precedence
  const isFavorited = isApiSongResult
    ? apiFavorites.includes(songId) // Only check apiFavorites for API songs
    : favorites.includes(songId); // Only check favorites for local songs

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    try {
      console.log('👍 Toggling favorite for song:', {
        id: songId,
        isApiSong: isApiSongResult,
        currentState: isFavorited,
      });

      // Optimistically update local state
      onToggle?.(!isFavorited);

      // Execute the toggle operation
      await toggleFavorite(songId);
    } catch (error) {
      // Revert optimistic update on error
      onToggle?.(isFavorited);
      console.error('Error toggling favorite:', error);
    }
  };

  const baseClasses = `p-1.5 rounded-full transition-all duration-200 ${
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  }`;

  const favoriteClasses = isFavorited
    ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
    : 'text-muted-foreground hover:text-red-500 hover:bg-muted';

  const combinedClasses = `${baseClasses} ${favoriteClasses} ${className}`;

  return (
    <button
      onClick={handleClick}
      className={combinedClasses}
      title={
        showTitle
          ? isFavorited
            ? 'Remove from favorites'
            : 'Add to favorites'
          : undefined
      }
      disabled={disabled}
    >
      <Heart size={size} fill={isFavorited ? 'currentColor' : 'none'} />
    </button>
  );
}
