'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { Play, TrendingUp, Clock, Music } from 'lucide-react';
import Image from 'next/image';

interface TrendingSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  file_url: string;
  cover_url: string;
  genre?: string;
  year?: number;
  play_count: number;
  last_played?: string;
  created_at: string;
  trending_play_count: number;
  trending_ranking: number;
  trending_date: string;
  source?: string;
  score?: number;
}

interface TrendingNowProps {
  limit?: number;
  showRanking?: boolean;
  className?: string;
  source?: 'all' | 'local' | 'api' | 'ytmusic' | 'saavn';
}

export default function TrendingNow({
  limit = 10,
  showRanking = true,
  className = '',
  source = 'all',
}: TrendingNowProps) {
  const [trendingSongs, setTrendingSongs] = useState<TrendingSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playSelectedSong, songs, apiSongs, playApiSong } = useMusicStore();

  const fetchTrendingSongs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/trending?limit=${limit}&source=${source}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch trending songs');
      }

      const data = await response.json();
      setTrendingSongs(data.songs || []);
    } catch (err) {
      console.error('Error fetching trending songs:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load trending songs'
      );
    } finally {
      setIsLoading(false);
    }
  }, [limit, source]);

  useEffect(() => {
    fetchTrendingSongs();
  }, [fetchTrendingSongs]);

  const handlePlaySong = (trendingSong: TrendingSong) => {
    if (trendingSong.source === 'local') {
      // Find the song in the main songs array by ID
      const songIndex = songs.findIndex(song => song.id === trendingSong.id);
      if (songIndex !== -1) {
        playSelectedSong(songIndex);
      } else {
        console.warn(
          'Local song not found in main library:',
          trendingSong.title
        );
      }
    } else {
      const existingApiSong = apiSongs.find(
        song => song.id === trendingSong.id
      );

      if (existingApiSong) {
        playApiSong({
          id: existingApiSong.id,
          title: existingApiSong.title,
          artist: existingApiSong.artist,
          album: existingApiSong.album || '',
          duration: existingApiSong.duration || 0,
          cover_url: existingApiSong.cover_url || '/default-album-art.svg',
          stream_url:
            existingApiSong.stream_url || existingApiSong.file_url || '',
          source: existingApiSong.source || 'api',
          genre: existingApiSong.genre,
          preview_url: existingApiSong.preview_url,
          release_date: existingApiSong.year?.toString(),
        });
      } else {
        playApiSong({
          id: trendingSong.id,
          title: trendingSong.title,
          artist: trendingSong.artist,
          album: trendingSong.album || '',
          duration: trendingSong.duration || 0,
          cover_url: trendingSong.cover_url || '/default-album-art.svg',
          stream_url: trendingSong.file_url || '',
          source:
            (trendingSong.source as 'api' | 'local' | 'ytmusic' | 'saavn') ||
            'api',
          genre: trendingSong.genre,
          preview_url: undefined,
          release_date: trendingSong.year?.toString(),
        });
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getSourceBadge = (source?: string) => {
    if (!source || source === 'local') return null;

    let bgColor = 'bg-blue-100';
    let textColor = 'text-blue-800';
    let label = 'API';

    if (source === 'ytmusic') {
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      label = 'YT';
    } else if (source === 'saavn') {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      label = 'Saavn';
    }

    return (
      <span
        className={`text-xs ${bgColor} ${textColor} px-1.5 py-0.5 rounded-full ml-1`}
      >
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={`trending-now ${className}`}>
        <div className='flex items-center gap-2 mb-4'>
          <TrendingUp className='w-5 h-5 text-primary' />
          <h2 className='text-lg font-semibold'>Trending Now</h2>
        </div>
        <div className='space-y-3'>
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className='flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse'
            >
              <div className='w-8 h-8 bg-muted rounded-full flex items-center justify-center'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {index + 1}
                </span>
              </div>
              <div className='w-10 h-10 bg-muted rounded-lg'></div>
              <div className='flex-1'>
                <div className='w-2/3 h-4 bg-muted rounded mb-2'></div>
                <div className='w-1/2 h-3 bg-muted rounded'></div>
              </div>
              <div className='w-12 h-8 bg-muted rounded'></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`trending-now ${className}`}>
        <div className='flex items-center gap-2 mb-4'>
          <TrendingUp className='w-5 h-5 text-primary' />
          <h2 className='text-lg font-semibold'>Trending Now</h2>
        </div>
        <div className='p-4 rounded-lg bg-destructive/10 border border-destructive/20'>
          <p className='text-destructive text-sm'>{error}</p>
          <button
            onClick={fetchTrendingSongs}
            className='mt-2 text-xs text-destructive hover:underline'
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (trendingSongs.length === 0) {
    return (
      <div className={`trending-now ${className}`}>
        <div className='flex items-center gap-2 mb-4'>
          <TrendingUp className='w-5 h-5 text-primary' />
          <h2 className='text-lg font-semibold'>Trending Now</h2>
        </div>
        <div className='p-6 text-center rounded-lg bg-muted/50'>
          <Music className='w-8 h-8 text-muted-foreground mx-auto mb-2' />
          <p className='text-muted-foreground text-sm'>No trending songs yet</p>
          <p className='text-muted-foreground text-xs mt-1'>
            Start playing songs to see what&apos;s trending!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`trending-now ${className}`}>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='w-5 h-5 text-primary' />
          <h2 className='text-lg font-semibold'>Trending Now</h2>
        </div>
        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
          <Clock className='w-3 h-3' />
          <span>Updated daily</span>
        </div>
      </div>

      <div className='space-y-2'>
        {trendingSongs.map((song, index) => (
          <div
            key={song.id}
            className='flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer'
            onClick={() => handlePlaySong(song)}
          >
            {/* Ranking */}
            {showRanking && (
              <div className='flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
                <span className='text-xs font-semibold text-primary'>
                  {index + 1}
                </span>
              </div>
            )}

            {/* Album Art */}
            <div className='flex-shrink-0 relative w-10 h-10 rounded-lg overflow-hidden bg-muted'>
              {song.cover_url ? (
                <Image
                  src={song.cover_url}
                  alt={song.title}
                  fill
                  sizes='40px'
                  className='object-cover'
                />
              ) : (
                <Image
                  src='/default-album-art.svg'
                  alt='Default album art'
                  fill
                  sizes='40px'
                  className='object-cover'
                />
              )}

              {/* Play overlay */}
              <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all'>
                <Play className='w-4 h-4 text-white' />
              </div>
            </div>

            {/* Song Info */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center'>
                <p className='text-sm font-medium text-foreground truncate'>
                  {song.title}
                </p>
                {getSourceBadge(song.source)}
              </div>
              <p className='text-xs text-muted-foreground truncate'>
                {song.artist}
              </p>
            </div>

            {/* Play Count & Duration */}
            <div className='flex-shrink-0 text-right'>
              <div className='text-xs font-medium text-primary'>
                {formatPlayCount(song.trending_play_count)} plays
              </div>
              <div className='text-xs text-muted-foreground'>
                {formatDuration(song.duration)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className='mt-4 pt-3 border-t border-border'>
        <button
          onClick={fetchTrendingSongs}
          className='w-full text-xs text-muted-foreground hover:text-foreground transition-colors'
        >
          Refresh trending songs
        </button>
      </div>
    </div>
  );
}
