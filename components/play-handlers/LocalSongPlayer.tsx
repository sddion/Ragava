'use client';

import { useMusicStore } from '@/store/musicStore';
import type { StreamableSong } from '@/lib/music-api';

interface LocalSongPlayerProps {
  song: StreamableSong;
  onPlayStart?: () => void;
  onPlayComplete?: () => void;
}

export function useLocalSongPlayer({
  song,
  onPlayStart,
  onPlayComplete,
}: LocalSongPlayerProps) {
  const { songs, apiSongs, playSelectedSong, playApiSong } = useMusicStore();

  const handlePlay = async () => {
    try {
      onPlayStart?.();

      console.log(
        '🎵 Database play handler for:',
        song.title,
        'Source:',
        song.source
      );

      // First, check if this song is in the local songs table
      const localSongIndex = songs.findIndex(s => s.id === song.id);
      if (localSongIndex !== -1) {
        console.log(
          '🎵 Playing song from local database:',
          song.title,
          'at index:',
          localSongIndex
        );
        playSelectedSong(localSongIndex);
        return;
      }

      // Then, check if this song is in the api_songs table
      const apiSong = apiSongs.find(s => s.id === song.id);
      if (apiSong) {
        console.log(
          '🎵 Playing song from API database:',
          song.title,
          'Database ID:',
          apiSong.id
        );
        // Convert to StreamableSong format and use playApiSong
        const streamableSong: StreamableSong = {
          id: apiSong.id,
          title: apiSong.title,
          artist: apiSong.artist,
          album: apiSong.album || '',
          duration: apiSong.duration || 0,
          cover_url: apiSong.cover_url || '',
          stream_url: apiSong.stream_url || apiSong.file_url || '',
          source: apiSong.source || 'api',
          preview_url: apiSong.preview_url,
          release_date: apiSong.year?.toString(),
          genre: apiSong.genre,
        };
        await playApiSong(streamableSong);
        return;
      }

      // If not found in either table, log warning
      console.warn('Song not found in database:', song.title, 'ID:', song.id);
      console.log('Available local songs:', songs.length);
      console.log('Available API songs:', apiSongs.length);
    } catch (error) {
      console.error('Error playing database song:', error);
    } finally {
      onPlayComplete?.();
    }
  };

  return { handlePlay };
}
