'use client';

import { useState } from 'react';
import { useMusicStore } from '@/store/musicStore';
import type { StreamableSong } from '@/lib/music-api';

interface YouTubeMusicSong extends StreamableSong {
  videoId?: string;
}

interface YouTubeMusicPlayerProps {
  song: YouTubeMusicSong;
  onPlayStart?: () => void;
  onPlayComplete?: () => void;
}

export function useYouTubeMusicPlayer({
  song,
  onPlayStart,
  onPlayComplete,
}: YouTubeMusicPlayerProps) {
  const { playApiSong } = useMusicStore();
  const [isConverting, setIsConverting] = useState(false);

  const handlePlay = async () => {
    try {
      onPlayStart?.();
      setIsConverting(true);

      const videoId = song.videoId || song.id.replace('ytmusic_', '');

      if (!videoId) {
        console.warn('YouTube Music video ID not found');
        return;
      }

      console.log(
        '🎵 Playing YouTube Music song:',
        song.title,
        'Video ID:',
        videoId
      );

      // Check if song already exists in database
      const checkResponse = await fetch(
        `/api/youtube-stream?videoId=${encodeURIComponent(videoId)}`
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();

        if (checkData.success && checkData.exists && checkData.song) {
          // Song exists, play it directly
          console.log('🎵 Playing existing YouTube Music song from database');
          await playApiSong({
            ...song,
            stream_url: checkData.song.stream_url,
            source: 'api', // Mark as API song since it's in database
          });
          return;
        }
      }

      // Song doesn't exist, convert and save to database first
      console.log(
        '🎵 Converting YouTube Music to MP3 and saving to database...'
      );

      // Download MP3 file and save to database storage
      const downloadResponse = await fetch('/api/youtube-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          thumbnail_url: song.cover_url,
        }),
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        throw new Error(errorData.error || 'Failed to download YouTube song');
      }

      const downloadData = await downloadResponse.json();

      if (!downloadData.success) {
        throw new Error(downloadData.error || 'YouTube download failed');
      }

      console.log(
        '✅ YouTube song downloaded and saved to storage successfully'
      );

      // After successful conversion, get the saved song and play it
      const finalCheckResponse = await fetch(
        `/api/youtube-stream?videoId=${encodeURIComponent(videoId)}`
      );

      if (finalCheckResponse.ok) {
        const finalCheckData = await finalCheckResponse.json();
        if (
          finalCheckData.success &&
          finalCheckData.exists &&
          finalCheckData.song
        ) {
          console.log('🎵 Playing newly converted song from database');
          await playApiSong({
            ...song,
            stream_url: finalCheckData.song.stream_url,
            source: 'api',
          });
          return;
        }
      }

      // Fallback: use streaming conversion endpoint if upload fails
      const streamUrl = `/api/youtube-proxy/${videoId}`;
      console.log(
        '🎵 Playing YouTube Music stream via conversion API (fallback)'
      );

      await playApiSong({
        ...song,
        stream_url: streamUrl,
        source: 'ytmusic', // Keep as YouTube Music source
      });
    } catch (error) {
      console.error('Error playing YouTube Music song:', error);
      // Fallback: open YouTube link
      const videoId = song.videoId || song.id.replace('ytmusic_', '');
      if (videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
      }
    } finally {
      setIsConverting(false);
      onPlayComplete?.();
    }
  };

  return { handlePlay, isConverting };
}
