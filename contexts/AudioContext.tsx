'use client';

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useMusicStore } from '@/store/musicStore';

interface AudioContextType {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  selectAndPlaySong: (songIndex: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);

  const {
    songs,
    currentSongIndex,
    setCurrentTime: setStoreCurrentTime,
    setDuration: setStoreDuration,
    setVolume: setStoreVolume,
    isPlaying: storeIsPlaying,
    setCurrentSongIndex,
    playSelectedSong,
  } = useMusicStore();

  const currentSong = songs[currentSongIndex];

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
      setStoreCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setStoreDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Auto-play next song
      const nextIndex = (currentSongIndex + 1) % songs.length;
      if (nextIndex !== currentSongIndex) {
        setCurrentSongIndex(nextIndex);
        playSelectedSong(nextIndex);
      }
    };

    const handleCanPlay = () => {
      if (storeIsPlaying) {
        audio.play().catch(console.error);
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      console.log('Audio loading started');
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [
    setStoreCurrentTime,
    setStoreDuration,
    storeIsPlaying,
    currentSongIndex,
    playSelectedSong,
    setCurrentSongIndex,
    songs.length,
  ]);

  // Handle current song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    console.log('Song changed:', currentSong.title);
    audio.src = currentSong.file_url;
    audio.load();

    if (storeIsPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentSongIndex, currentSong, storeIsPlaying]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
      setStoreVolume(volume);
    }
  }, [volume, setStoreVolume]);

  // Sync with store state
  useEffect(() => {
    setIsPlaying(storeIsPlaying);
  }, [storeIsPlaying]);

  const play = () => {
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio.play().catch(console.error);
    }
  };

  const pause = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      const newTime = Math.max(0, Math.min(duration, time));
      audio.currentTime = newTime;
      setCurrentTime(newTime);
      setStoreCurrentTime(newTime);
    }
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    setStoreVolume(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  const selectAndPlaySong = (songIndex: number) => {
    if (songIndex >= 0 && songIndex < songs.length) {
      setCurrentSongIndex(songIndex);
      playSelectedSong(songIndex);
    }
  };

  const value: AudioContextType = {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    play,
    pause,
    seek,
    setVolume,
    selectAndPlaySong,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      {/* Global audio element */}
      <audio ref={audioRef} className='hidden' />
    </AudioContext.Provider>
  );
};
