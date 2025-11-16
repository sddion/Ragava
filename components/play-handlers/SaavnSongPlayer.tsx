'use client';

import { useMusicStore } from '@/store/musicStore';
import type { StreamableSong } from '@/lib/music-api';

interface SaavnSongPlayerProps {
  song: StreamableSong;
  onPlayStart?: () => void;
  onPlayComplete?: () => void;
}

export function useSaavnSongPlayer({
  song,
  onPlayStart,
  onPlayComplete,
}: SaavnSongPlayerProps) {
  const { playApiSong } = useMusicStore();

  const handlePlay = async () => {
    try {
      onPlayStart?.();

      console.log('🎵 Playing Saavn song:', song.title, 'Source:', song.source);

      // For Saavn songs, use the optimized playApiSong function
      // This will check database first, then make API calls if needed
      await playApiSong(song);
    } catch (error) {
      console.error('Error playing Saavn song:', error);
    } finally {
      onPlayComplete?.();
    }
  };

  return { handlePlay };
}
