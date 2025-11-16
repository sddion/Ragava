'use client';

import type React from 'react';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMusicStore, type MusicSong } from '@/store/musicStore';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { setLastPlayedInfo } from '@/store/audioStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  List,
} from 'lucide-react';
import {
  slideInFromBottom,
  scaleButton,
  animateProgress,
  animateHeart,
  isGSAPAvailable,
} from '@/lib/gsap';
import Image from 'next/image';
import FavoriteButton from './FavoriteButton';

interface MusicPlayerProps {
  onQueueClick?: () => void;
}

export default function MusicPlayer({ onQueueClick }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const {
    songs,
    apiSongs,
    currentSong: storeCurrentSong,
    currentSongIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    shuffle,
    currentQueue,
    currentQueueIndex,
    setCurrentTime,
    setDuration,
    setVolume,
    playPause,
    nextSong,
    previousSong,
    autoNextSong,
    toggleRepeat,
    toggleShuffle,
    syncPlaybackState,
    setCurrentSongIndex,
    playSong,
  } = useMusicStore();

  const currentSong: MusicSong | null =
    storeCurrentSong ||
    (currentQueue && currentQueue.length > 0
      ? currentQueue[currentQueueIndex]
      : songs && songs.length > 0
        ? songs[currentSongIndex]
        : null);

  const trackSongPlay = useCallback(
    async (songId: string, playDuration: number = 0) => {
      try {
        const isApiSong =
          apiSongs.some(song => song.id === songId) ||
          (currentSong && currentSong.source === 'api');
        const endpoint = isApiSong ? '/api/api-track-play' : '/api/track-play';

        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            songId,
            playDuration,
          }),
        });
      } catch (error) {
        console.error('Error tracking song play:', error);
      }
    },
    [apiSongs, currentSong]
  );

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';
      Object.assign(audioRef, { current: audio });
    }
  }, []);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Update Redux store with current playback info for persistence
      if (currentSong) {
        dispatch(
          setLastPlayedInfo({
            songId: currentSong.id,
            time: audio.currentTime,
            index:
              currentQueue && currentQueue.length > 0
                ? currentQueueIndex
                : currentSongIndex,
          })
        );
      }

      // Sync to database every 2.5 minutes (150 seconds) to avoid too many database calls
      if (Math.floor(audio.currentTime) % 150 === 0) {
        syncPlaybackState();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);

      // Restore current time if available
      if (currentTime > 0 && currentTime < audio.duration) {
        audio.currentTime = currentTime;
        console.log('Restored playback time:', currentTime);
      }
    };

    const handleEnded = () => {
      // Track the song play when it ends (played for full duration)
      if (currentSong) {
        trackSongPlay(currentSong.id, Math.floor(duration));
      }

      autoNextSong();
    };

    const handleCanPlay = () => {
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    };

    const handlePlay = () => {
      // Track when a song starts playing
      if (currentSong) {
        trackSongPlay(currentSong.id, 0); // 0 duration for start tracking
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      // Audio error handled silently
    };

    const handleLoadStart = () => {
      // Audio loading started
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [
    isPlaying,
    setCurrentTime,
    setDuration,
    repeatMode,
    autoNextSong,
    currentSong,
    currentSongIndex,
    currentQueue,
    currentQueueIndex,
    dispatch,
    duration,
    trackSongPlay,
    currentTime,
    syncPlaybackState,
  ]);

  // Handle current song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    // Song changed - use stream_url for API songs, file_url for local songs
    const audioUrl = currentSong.stream_url || currentSong.file_url;
    console.log('🎵 MusicPlayer: Setting audio source:', {
      title: currentSong.title,
      source: currentSong.source,
      stream_url: currentSong.stream_url,
      file_url: currentSong.file_url,
      audioUrl,
    });
    audio.src = audioUrl;
    audio.load();

    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentSongIndex, currentQueueIndex, currentSong, isPlaying]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  // Initialize GSAP animations
  useEffect(() => {
    if (playerRef.current && isGSAPAvailable()) {
      slideInFromBottom(playerRef.current, {
        duration: 0.8,
        ease: 'power2.out',
      });
    }
  }, []);

  // Animate progress bar
  useEffect(() => {
    if (progressRef.current && duration > 0 && isGSAPAvailable()) {
      const progressPercent = (currentTime / duration) * 100;
      animateProgress(
        progressRef.current,
        `${Math.min(100, Math.max(0, progressPercent))}%`,
        {
          duration: 0.1,
          ease: 'none',
        }
      );
    }
  }, [currentTime, duration]);

  // Animate play/pause button
  useEffect(() => {
    const playButton = document.querySelector('.play-pause-btn');
    if (playButton && isGSAPAvailable()) {
      scaleButton(playButton, isPlaying ? 1.1 : 0.9, {
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }, [isPlaying]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !audioRef.current) return;

    // Clear any existing UI messages when user seeks
    setUiMessage('');
    setLoadingPlay(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(
      0,
      Math.min(duration, (clickX / rect.width) * duration)
    );

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleFavoriteToggle = (isFavorited: boolean) => {
    // Animate heart icon when favorited
    if (isFavorited) {
      const heartIcon = document.querySelector('.favorite-btn');
      if (heartIcon && isGSAPAvailable()) {
        animateHeart(heartIcon, {
          duration: 0.3,
          ease: 'back.out(1.7)',
        });
      }
    }
  };

  const handleRandomSong = () => {
    if (songs && songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      setCurrentSongIndex(randomIndex);
      playSong();
    }
  };

  // Loading states for play/pause
  const [loadingPlay, setLoadingPlay] = useState(false);
  const [uiMessage, setUiMessage] = useState<string>('');

  // Intercept play action to show spinner until audio can play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let isNewSong = true; // Track if this is a new song (not seeking)
    let lastSongId = currentSong?.id; // Track the last song ID

    const onCanPlay = () => {
      setLoadingPlay(false);
      // Only show "MP3 converted" message for new songs, not during seeking or play/pause
      if (isNewSong && currentSong?.source === 'ytmusic') {
        setUiMessage('MP3 converted');
        setTimeout(() => setUiMessage(''), 1200);
      }
    };

    const onPlaying = () => {
      setLoadingPlay(false);
      // Only show "Playing" message for new songs, not during seeking or play/pause
      if (isNewSong && currentSong?.source === 'ytmusic') {
        setUiMessage('Playing');
        setTimeout(() => setUiMessage(''), 1200);
      }
    };

    const onError = () => setLoadingPlay(false);

    // Track when user is seeking to prevent UI messages
    const onSeeking = () => {
      setUiMessage(''); // Clear any existing messages
      setLoadingPlay(false); // Also clear loading state
      isNewSong = false; // Mark that we're no longer in a new song context
    };

    const onSeeked = () => {
      // Keep isNewSong false after seeking
      isNewSong = false;
    };

    // Reset new song flag when a new song starts loading
    const onLoadStartNew = () => {
      // Only reset if it's actually a new song
      if (currentSong?.id !== lastSongId) {
        isNewSong = true;
        lastSongId = currentSong?.id;
      }
    };

    // Track play/pause button clicks to prevent messages
    const onPlayPauseClick = () => {
      isNewSong = false; // Don't show messages on play/pause
    };

    audio.addEventListener('loadstart', onLoadStartNew);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.addEventListener('seeking', onSeeking);
    audio.addEventListener('seeked', onSeeked);

    // Add event listener for play/pause button clicks
    const playPauseButton = document.querySelector('.play-pause-btn');
    if (playPauseButton) {
      playPauseButton.addEventListener('click', onPlayPauseClick);
    }

    return () => {
      audio.removeEventListener('loadstart', onLoadStartNew);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('seeking', onSeeking);
      audio.removeEventListener('seeked', onSeeked);

      if (playPauseButton) {
        playPauseButton.removeEventListener('click', onPlayPauseClick);
      }
    };
  }, [currentSong?.id, currentSong?.source]); // Re-run when song changes

  // Sync playback state only on important changes (not on every time update)
  useEffect(() => {
    // Only sync when there's actually a current song
    if (currentSong) {
      console.log(
        '🎵 MusicPlayer: Syncing playback state for song:',
        currentSong.title
      );
      syncPlaybackState();
    } else {
      console.log('🎵 MusicPlayer: No current song, skipping sync');
    }
  }, [
    currentSong,
    currentSongIndex,
    currentQueueIndex,
    isPlaying,
    volume,
    repeatMode,
    shuffle,
    syncPlaybackState,
  ]);

  // Always render the player, even without a current song
  // This prevents issues with play/pause functionality

  return (
    <div
      ref={playerRef}
      className='music-player relative p-2 bg-card border-t border-border shadow-lg'
    >
      <audio ref={audioRef} className='hidden' />

      <div className='flex items-center space-x-3'>
        {/* Album Art - Minimized */}
        <div className='flex-shrink-0'>
          {currentSong?.cover_url ? (
            <Image
              src={currentSong.cover_url}
              alt={`${currentSong.title} cover`}
              width={48}
              height={48}
              className='w-12 h-12 object-cover rounded-lg shadow-sm'
            />
          ) : (
            <Image
              src='/default-album-art.svg'
              alt='Default album art'
              width={48}
              height={48}
              className='w-12 h-12 object-cover rounded-lg shadow-sm'
            />
          )}
        </div>

        {/* Song Info - Minimized */}
        <div className='flex-1 min-w-0'>
          <h3 className='text-sm font-medium text-foreground truncate'>
            {currentSong?.title || 'No song selected'}
          </h3>
          <p className='text-xs text-muted-foreground truncate'>
            {currentSong?.artist || 'Choose a song to play'}
          </p>
          {currentQueue && currentQueue.length > 0 && (
            <p className='text-xs text-muted-foreground'>
              {currentQueueIndex + 1} of {currentQueue.length} in queue
            </p>
          )}
        </div>

        {/* Main Controls - Minimized */}
        <div className='flex items-center space-x-1'>
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-full transition-all duration-200 ${
              shuffle
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title='Toggle Shuffle'
          >
            <Shuffle size={14} />
          </button>

          <button
            onClick={previousSong}
            className='p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200'
            title='Previous Song'
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={() => {
              if (!loadingPlay) playPause();
            }}
            className={`play-pause-btn p-2 rounded-full transition-all duration-200 ${loadingPlay ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary hover:opacity-90'}`}
            title={loadingPlay ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
            disabled={loadingPlay}
          >
            {loadingPlay ? (
              <span className='inline-block w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin' />
            ) : isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>

          <button
            onClick={nextSong}
            className='p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200'
            title='Next Song'
          >
            <SkipForward size={14} />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-1.5 rounded-full transition-all duration-200 relative ${
              repeatMode !== 'off'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={`Repeat ${repeatMode === 'single' ? 'One' : repeatMode === 'all' ? 'All' : 'Off'}`}
          >
            <Repeat size={14} />
            {/* Visual indicator for repeat modes */}
            {repeatMode === 'single' && (
              <div className='absolute -top-1 -right-1 w-2 h-2 bg-primary-foreground rounded-full text-xs flex items-center justify-center'>
                <span className='text-[8px] font-bold'>1</span>
              </div>
            )}
            {repeatMode === 'all' && (
              <div className='absolute -top-1 -right-1 w-2 h-2 bg-primary-foreground rounded-full text-xs flex items-center justify-center'>
                <span className='text-[6px] font-bold'>∞</span>
              </div>
            )}
          </button>
        </div>

        {/* Transient Status */}
        {uiMessage && (
          <div className='ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground'>
            {uiMessage}
          </div>
        )}

        {/* Volume Control - Minimized */}
        <div className='flex items-center space-x-2'>
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className='p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200'
            title='Volume control'
          >
            <Volume2 size={12} />
          </button>
          {showVolumeSlider && (
            <input
              type='range'
              min='0'
              max='1'
              step='0.05'
              value={volume}
              onChange={handleVolumeChange}
              className='w-12 h-1 bg-muted rounded-lg appearance-none cursor-pointer'
              aria-label='Volume control'
            />
          )}
        </div>

        {/* Additional Controls - Minimized */}
        <div className='flex items-center space-x-1'>
          <FavoriteButton
            songId={currentSong?.id || ''}
            size={12}
            className='favorite-btn'
            onToggle={handleFavoriteToggle}
          />

          <button
            onClick={handleRandomSong}
            className='p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200'
            title='Play random song'
          >
            <svg
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' />
              <path d='M21 3v5h-5' />
              <path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' />
              <path d='M3 21v-5h5' />
            </svg>
          </button>

          {onQueueClick && (
            <button
              onClick={onQueueClick}
              className='p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200'
              title='Show queue'
            >
              <List size={12} />
            </button>
          )}
          {/* Queue Button - Retained */}
        </div>
      </div>

      {/* Time Display - Above Progress Bar */}
      <div className='flex justify-between text-xs text-muted-foreground font-mono mt-3 mb-1'>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress Bar - Minimized */}
      <div
        className='progress-container relative h-1 bg-muted rounded-full cursor-pointer'
        onClick={handleProgressClick}
        role='slider'
        aria-label='Seek position'
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        <div
          ref={progressRef}
          className='progress-bar absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-100'
          style={{
            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
