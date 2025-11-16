'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { useMusicStore } from '@/store/musicStore';
import {
  setCurrentSong,
  setQueue,
  addToRecentlyPlayed,
  setLastPlayedInfo,
  restoreLastPlayed,
  setVolume,
} from '@/store/audioStore';

export function usePersistentPlayback() {
  const dispatch = useDispatch<AppDispatch>();
  const audioState = useSelector((state: RootState) => state.audio);
  const {
    songs,
    currentSongIndex,
    isPlaying,
    playSelectedSong: originalPlaySelectedSong,
    setCurrentSongIndex,
    setCurrentTime,
    setVolume: setMusicStoreVolume,
  } = useMusicStore();

  const currentSong =
    songs && songs.length > 0 ? songs[currentSongIndex] : null;

  const isInitialized = useRef(false);

  // Initialize from localStorage on first load (client-side only)
  useEffect(() => {
    // Only run on client side to prevent hydration mismatch
    if (typeof window === 'undefined') return;

    if (!isInitialized.current && songs && songs.length > 0) {
      isInitialized.current = true;

      // Restore volume settings
      dispatch(setVolume(audioState.volume));

      // Sync with music store
      setMusicStoreVolume(audioState.volume);

      // Restore last played song if available
      if (audioState.lastPlayedSongId && audioState.lastPlayedIndex >= 0) {
        const lastPlayedSong = songs.find(
          song => song.id === audioState.lastPlayedSongId
        );
        if (lastPlayedSong) {
          dispatch(
            restoreLastPlayed({
              song: lastPlayedSong,
              time: audioState.lastPlayedTime,
              index: audioState.lastPlayedIndex,
            })
          );

          // Update music store to match
          setCurrentSongIndex(audioState.lastPlayedIndex);
          setCurrentTime(audioState.lastPlayedTime);

          // Update Redux store with current song
          dispatch(
            setCurrentSong({
              song: lastPlayedSong,
              index: audioState.lastPlayedIndex,
            })
          );

          console.log(
            'Restored last played song:',
            lastPlayedSong.title,
            'at time:',
            audioState.lastPlayedTime
          );
        }
      }
    }
  }, [
    songs,
    audioState,
    dispatch,
    setCurrentSongIndex,
    setCurrentTime,
    setMusicStoreVolume,
  ]);

  // Sync songs with Redux queue when songs change
  useEffect(() => {
    if (songs && songs.length > 0) {
      dispatch(setQueue(songs));
    }
  }, [songs, dispatch]);

  // Track current song and add to recently played
  useEffect(() => {
    if (currentSong && isPlaying) {
      dispatch(addToRecentlyPlayed(currentSong));
      dispatch(
        setLastPlayedInfo({
          songId: currentSong.id,
          time: 0, // Will be updated by time tracking
          index: currentSongIndex,
        })
      );
    }
  }, [currentSong, isPlaying, currentSongIndex, dispatch]);

  // Track playback time for persistence
  useEffect(() => {
    if (currentSong && isPlaying) {
      const interval = setInterval(() => {
        // Get current time from audio element (this would need to be passed from MusicPlayer)
        dispatch(
          setLastPlayedInfo({
            songId: currentSong.id,
            time: 0, // This should be the actual current time
            index: currentSongIndex,
          })
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentSong, isPlaying, currentSongIndex, dispatch]);

  // Enhanced playSelectedSong that maintains state
  const playSelectedSong = (index: number) => {
    if (songs && index >= 0 && index < songs.length) {
      const song = songs[index];

      // Add to recently played
      dispatch(addToRecentlyPlayed(song));

      // Update last played info
      dispatch(
        setLastPlayedInfo({
          songId: song.id,
          time: 0,
          index: index,
        })
      );

      originalPlaySelectedSong(index);

      console.log('Playing song ', song.title);
    }
  };

  return {
    audioState,
    playSelectedSong,
    recentlyPlayed: audioState.recentlyPlayed,
    lastPlayedSongId: audioState.lastPlayedSongId,
    lastPlayedTime: audioState.lastPlayedTime,
    lastPlayedIndex: audioState.lastPlayedIndex,
  };
}
