import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MusicSong } from './musicStore';

export interface AudioState {
  isPlaying: boolean;
  currentSong: MusicSong | null;
  currentSongIndex: number;
  volume: number;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
  queue: MusicSong[];
  currentQueueIndex: number;
  isLoading: boolean;
  error: string | null;
  // Recently played songs
  recentlyPlayed: MusicSong[];
  // Last played song info for persistence
  lastPlayedSongId: string | null;
  lastPlayedTime: number;
  lastPlayedIndex: number;
}

// Load initial state from localStorage
const loadInitialState = (): Partial<AudioState> => {
  if (typeof window === 'undefined') return {};

  try {
    const saved = localStorage.getItem('wave-music-audio-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        volume: parsed.volume || 0.7,
        isMuted: parsed.isMuted || false,
        isShuffled: parsed.isShuffled || false,
        repeatMode: parsed.repeatMode || 'none',
        recentlyPlayed: parsed.recentlyPlayed || [],
        lastPlayedSongId: parsed.lastPlayedSongId || null,
        lastPlayedTime: parsed.lastPlayedTime || 0,
        lastPlayedIndex: parsed.lastPlayedIndex || 0,
      };
    }
  } catch (error) {
    console.error('Error loading audio state from localStorage:', error);
  }

  return {};
};

const initialState: AudioState = {
  isPlaying: false,
  currentSong: null,
  currentSongIndex: 0,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  isMuted: false,
  isShuffled: false,
  repeatMode: 'none',
  queue: [],
  currentQueueIndex: 0,
  isLoading: false,
  error: null,
  recentlyPlayed: [],
  lastPlayedSongId: null,
  lastPlayedTime: 0,
  lastPlayedIndex: 0,
  ...loadInitialState(),
};

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setCurrentSong: (
      state,
      action: PayloadAction<{ song: MusicSong; index: number }>
    ) => {
      state.currentSong = action.payload.song;
      state.currentSongIndex = action.payload.index;
      state.currentTime = 0;
      state.isLoading = true;
      state.error = null;
    },
    setQueue: (state, action: PayloadAction<MusicSong[]>) => {
      state.queue = action.payload;
      state.currentQueueIndex = 0;
    },
    play: state => {
      state.isPlaying = true;
      state.error = null;
    },
    pause: state => {
      state.isPlaying = false;
    },
    togglePlayPause: state => {
      state.isPlaying = !state.isPlaying;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
      state.isMuted = state.volume === 0;
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
      state.isLoading = false;
    },
    setShuffled: (state, action: PayloadAction<boolean>) => {
      state.isShuffled = action.payload;
    },
    setRepeatMode: (state, action: PayloadAction<'none' | 'one' | 'all'>) => {
      state.repeatMode = action.payload;
    },
    nextSong: state => {
      if (state.queue.length > 0) {
        if (state.repeatMode === 'one') {
          return;
        }

        if (state.currentQueueIndex < state.queue.length - 1) {
          state.currentQueueIndex += 1;
        } else if (state.repeatMode === 'all') {
          state.currentQueueIndex = 0;
        } else {
          state.isPlaying = false;
          return;
        }

        state.currentSong = state.queue[state.currentQueueIndex];
        state.currentSongIndex = state.currentQueueIndex;
        state.currentTime = 0;
        state.isLoading = true;
      }
    },
    previousSong: state => {
      if (state.queue.length > 0) {
        if (state.currentTime > 3) {
          state.currentTime = 0;
          return;
        }

        if (state.currentQueueIndex > 0) {
          state.currentQueueIndex -= 1;
        } else if (state.repeatMode === 'all') {
          state.currentQueueIndex = state.queue.length - 1;
        } else {
          state.currentTime = 0;
          return;
        }

        state.currentSong = state.queue[state.currentQueueIndex];
        state.currentSongIndex = state.currentQueueIndex;
        state.currentTime = 0;
        state.isLoading = true;
      }
    },
    seekTo: (state, action: PayloadAction<number>) => {
      state.currentTime = Math.max(0, Math.min(state.duration, action.payload));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    addToRecentlyPlayed: (state, action: PayloadAction<MusicSong>) => {
      const song = action.payload;
      // Remove if already exists
      state.recentlyPlayed = state.recentlyPlayed.filter(s => s.id !== song.id);
      // Add to beginning
      state.recentlyPlayed.unshift(song);
      // Keep only last 20 songs
      state.recentlyPlayed = state.recentlyPlayed.slice(0, 20);
    },
    setLastPlayedInfo: (
      state,
      action: PayloadAction<{ songId: string; time: number; index: number }>
    ) => {
      state.lastPlayedSongId = action.payload.songId;
      state.lastPlayedTime = action.payload.time;
      state.lastPlayedIndex = action.payload.index;
    },
    restoreLastPlayed: (
      state,
      action: PayloadAction<{ song: MusicSong; time: number; index: number }>
    ) => {
      state.currentSong = action.payload.song;
      state.currentSongIndex = action.payload.index;
      state.currentTime = action.payload.time;
      state.lastPlayedSongId = action.payload.song.id;
      state.lastPlayedTime = action.payload.time;
      state.lastPlayedIndex = action.payload.index;
    },
    clearRecentlyPlayed: state => {
      state.recentlyPlayed = [];
    },
    resetAudio: _state => {
      return { ...initialState };
    },
  },
});

export const {
  setCurrentSong,
  setQueue,
  play,
  pause,
  togglePlayPause,
  setVolume,
  setMuted,
  setCurrentTime,
  setDuration,
  setShuffled,
  setRepeatMode,
  nextSong,
  previousSong,
  seekTo,
  setLoading,
  setError,
  addToRecentlyPlayed,
  setLastPlayedInfo,
  restoreLastPlayed,
  clearRecentlyPlayed,
  resetAudio,
} = audioSlice.actions;

export default audioSlice.reducer;
