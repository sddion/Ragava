'use client';

import { useLocalSongPlayer } from './LocalSongPlayer';
import { useSaavnSongPlayer } from './SaavnSongPlayer';
import { useYouTubeMusicPlayer } from './YouTubeMusicPlayer';
import type { StreamableSong } from '@/lib/music-api';

interface YouTubeMusicSong extends StreamableSong {
  videoId?: string;
}

interface UnifiedPlayHandlerProps {
  song: StreamableSong;
  onPlayStart?: () => void;
  onPlayComplete?: () => void;
}

export function useUnifiedPlayHandler({
  song,
  onPlayStart,
  onPlayComplete,
}: UnifiedPlayHandlerProps) {
  const { handlePlay: playLocal } = useLocalSongPlayer({
    song,
    onPlayStart,
    onPlayComplete,
  });
  const { handlePlay: playSaavn } = useSaavnSongPlayer({
    song,
    onPlayStart,
    onPlayComplete,
  });
  const { handlePlay: playYouTube, isConverting } = useYouTubeMusicPlayer({
    song: song as YouTubeMusicSong,
    onPlayStart,
    onPlayComplete,
  });

  const handlePlay = async () => {
    try {
      onPlayStart?.();

      // Determine the appropriate player based on song source
      if (song.source === 'local') {
        await playLocal();
      } else if (song.source === 'api' || song.id.startsWith('api_')) {
        await playSaavn();
      } else if (song.source === 'ytmusic' || song.id.startsWith('ytmusic_')) {
        await playYouTube();
        return { isConverting };
      } else {
        console.warn('Unknown song source:', song.source);
      }
    } catch (error) {
      console.error('Error in unified play handler:', error);
    } finally {
      onPlayComplete?.();
    }
  };

  return { handlePlay, isConverting };
}
