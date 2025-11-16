import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createClient } from '@/lib/supabase';
import type { Song } from '@/lib/supabase';
import {
  musicAPI,
  type StreamableSong,
  isApiSong,
  getOriginalSongId,
} from '@/lib/music-api';
import { logger } from '@/lib/logger';

export interface MusicSong extends Song {
  genre?: string;
  year?: number;
  file_size?: number;
  file_type?: string;
  checksum?: string;
  source?: 'local' | 'api' | 'ytmusic' | 'saavn';
  stream_url?: string;
  preview_url?: string;
}

// Interface for playlist songs join result
interface PlaylistSongJoin {
  song_id: string;
  position: number;
  songs: MusicSong[];
}

interface MusicPlaybackState {
  id: string;
  current_song_id: string;
  playback_time: number;
  is_playing: boolean;
  volume: number;
  repeat_mode: 'off' | 'single' | 'all';
  shuffle: boolean;
  updated_at: string;
}

export interface MusicState {
  // Core state
  songs: MusicSong[];
  apiSongs: MusicSong[]; // API songs from database
  currentSong: MusicSong | null; // Currently playing song (from any source)
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: 'off' | 'single' | 'all';
  shuffle: boolean;
  shuffledSongs: MusicSong[]; // Shuffled order of songs when shuffle is enabled
  shuffledIndex: number; // Current position in shuffled array
  searchQuery: string;
  searchResults: MusicSong[];
  persistentSearchQuery: string;
  persistentSearchResults: MusicSong[];
  persistentApiSearchResults: StreamableSong[];
  persistentLocalSearchResults: StreamableSong[];
  persistentSaavnSearchResults: StreamableSong[];
  persistentYTMusicSearchResults: StreamableSong[];

  // Enhanced state
  playbackState: MusicPlaybackState | null;
  error: string | null;
  isLoading: boolean;

  // Queue and playlist state
  currentQueue: MusicSong[];
  currentQueueIndex: number;
  playlists: Playlist[];
  favorites: string[];
  apiFavorites: string[]; // API song favorites
  currentPlaylist: string | null;

  // Actions
  setSongs: (songs: MusicSong[]) => void;
  setApiSongs: (songs: MusicSong[]) => void;
  addApiSong: (song: MusicSong) => void;
  setCurrentSong: (song: MusicSong | null) => void;
  setCurrentSongIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  playPause: () => void;
  playSong: () => void;
  pauseSong: () => void;
  nextSong: () => void;
  previousSong: () => void;
  autoNextSong: () => void; // Auto-progression when song ends
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setSearchQuery: (query: string) => void;
  searchSongs: (query: string) => void;
  searchApiSongs: (query: string) => Promise<StreamableSong[]>;
  setPersistentSearchQuery: (query: string) => void;
  setPersistentSearchResults: (results: {
    local?: MusicSong[];
    api?: StreamableSong[];
    localDb?: StreamableSong[];
    saavn?: StreamableSong[];
    ytmusic?: StreamableSong[];
  }) => void;
  clearPersistentSearch: () => void;
  rehydratePersistentSearch: () => void;
  playSelectedSong: (index: number) => void;
  playApiSong: (song: StreamableSong) => void;

  // Enhanced actions
  setPlaybackState: (state: MusicPlaybackState) => void;
  syncPlaybackState: () => void;
  setError: (error: string | null) => void;
  loadSongsWithFallback: () => Promise<void>;
  loadPlaybackState: () => Promise<void>;
  setIsLoading: (loading: boolean) => void;

  // Queue management
  addToQueue: (song: MusicSong) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // Utility functions
  getRepeatModeInfo: () => {
    mode: string;
    description: string;
    totalSongs: number;
  };
  setCurrentQueue: (queue: MusicSong[]) => void;
  setCurrentQueueIndex: (index: number) => void;

  // Playlist management
  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  playPlaylist: (playlistId: string) => Promise<void>;

  // Favorites management
  toggleFavorite: (songId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  toggleApiFavorite: (songId: string) => Promise<void>;
  loadApiFavorites: () => Promise<void>;
  loadApiSongs: () => Promise<void>;

  generateAlbumPlaylist: (album: string) => void;
  generateArtistPlaylist: (artist: string) => void;
  generateFavoritesPlaylist: () => void;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  is_auto_generated: boolean;
  auto_generation_type?: string;
  created_at: string;
  updated_at: string;
  songs?: MusicSong[];
}

export const useMusicStore = create<MusicState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    songs: [], // Start with empty array, load from Supabase
    apiSongs: [], // API songs from database
    currentSong: null, // Currently playing song
    currentSongIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    repeatMode: 'off',
    shuffle: false,
    shuffledSongs: [],
    shuffledIndex: 0,
    searchQuery: '',
    searchResults: [],
    persistentSearchQuery: '',
    persistentSearchResults: [],
    persistentApiSearchResults: [],
    persistentLocalSearchResults: [],
    persistentSaavnSearchResults: [],
    persistentYTMusicSearchResults: [],

    playbackState: null,
    error: null,
    isLoading: false,

    // Queue and playlist state
    currentQueue: [],
    currentQueueIndex: 0,
    playlists: [],
    favorites: [],
    apiFavorites: [],
    currentPlaylist: null,

    // Core actions
    setSongs: songs => {
      set({ songs });
      logger.info('Songs loaded', { count: songs.length });
    },

    setApiSongs: songs => {
      set({ apiSongs: songs });
      logger.info('API songs loaded', { count: songs.length });
    },

    addApiSong: song => {
      set(state => {
        // Check if song already exists to avoid duplicates
        const existingIndex = state.apiSongs.findIndex(s => s.id === song.id);
        if (existingIndex >= 0) {
          // Update existing song
          const updatedSongs = [...state.apiSongs];
          updatedSongs[existingIndex] = song;
          return { apiSongs: updatedSongs };
        } else {
          // Add new song
          return { apiSongs: [...state.apiSongs, song] };
        }
      });
      logger.info('API song added', { title: song.title, id: song.id });
    },

    setCurrentSong: song => {
      console.log(
        '🎵 setCurrentSong called:',
        song?.title || 'null',
        'ID:',
        song?.id || 'null'
      );
      set({ currentSong: song });
      logger.info('Current song set', {
        title: song?.title || 'null',
        id: song?.id,
      });
    },

    setCurrentSongIndex: index => {
      const { songs } = get();
      if (index >= 0 && index < songs.length) {
        set({ currentSongIndex: index, currentTime: 0 });
        logger.info('Song index changed', { index });
      }
    },

    setIsPlaying: playing => {
      set({ isPlaying: playing });
      logger.info('Playing state set', { isPlaying: playing });
    },

    playPause: () => {
      const { isPlaying, currentSong } = get();
      console.log('🎵 Music Player playPause called - Current state:', {
        isPlaying,
        currentSong: currentSong?.title || 'No song',
        currentSongId: currentSong?.id || 'No ID',
      });
      set({ isPlaying: !isPlaying });
      logger.info('Play/pause toggled', { isPlaying: !isPlaying });
    },

    playSong: () => set({ isPlaying: true }),

    pauseSong: () => set({ isPlaying: false }),

    nextSong: () => {
      const {
        currentQueue,
        currentQueueIndex,
        currentSongIndex,
        songs,
        shuffle,
        shuffledSongs,
        shuffledIndex,
        repeatMode,
      } = get();

      // If we have a queue, use queue navigation
      if (currentQueue.length > 0) {
        let nextIndex = currentQueueIndex;

        if (repeatMode === 'single') {
          // Repeat current song - don't change index
          nextIndex = currentQueueIndex;
        } else if (shuffle) {
          nextIndex = Math.floor(Math.random() * currentQueue.length);
        } else {
          nextIndex = currentQueueIndex + 1;
          // If we're at the end and repeat is off, stop
          if (nextIndex >= currentQueue.length) {
            if (repeatMode === 'all') {
              nextIndex = 0; // Loop back to start
            } else {
              logger.info('End of queue reached');
              return;
            }
          }
        }

        const nextSong = currentQueue[nextIndex];
        set({
          currentQueueIndex: nextIndex,
          currentSong: nextSong,
          currentTime: 0,
          isPlaying: true,
        });
        logger.info('Next song from queue', {
          title: nextSong.title,
          index: nextIndex,
        });
      } else {
        let nextIndex;

        if (repeatMode === 'single') {
          nextIndex = currentSongIndex;
        } else if (shuffle && shuffledSongs.length > 0) {
          // Use shuffled array for navigation
          const nextShuffledIndex = (shuffledIndex + 1) % shuffledSongs.length;

          // Handle repeat modes with shuffle
          if (nextShuffledIndex === 0 && repeatMode === 'off') {
            // End of shuffled playlist and repeat is off
            set({ isPlaying: false });
            console.log('End of shuffled playlist reached - stopping playback');
            return;
          }

          const nextSong = shuffledSongs[nextShuffledIndex];
          const nextIndex = songs.findIndex(song => song.id === nextSong.id);

          set({
            currentSongIndex: nextIndex,
            currentSong: nextSong,
            shuffledIndex: nextShuffledIndex,
            currentTime: 0,
            isPlaying: true,
          });
          console.log(
            'Next song from shuffled library:',
            nextSong?.title,
            'Shuffled Index:',
            nextShuffledIndex
          );
          return;
        } else {
          nextIndex = (currentSongIndex + 1) % songs.length;
          if (nextIndex === 0 && repeatMode === 'off') {
            // End of playlist and repeat is off
            set({ isPlaying: false });
            console.log('End of playlist reached - stopping playback');
            return;
          }
        }

        const nextSong = songs[nextIndex];
        set({
          currentSongIndex: nextIndex,
          currentSong: nextSong,
          currentTime: 0,
          isPlaying: true,
        });
        console.log(
          'Next song from library:',
          nextSong?.title,
          'Index:',
          nextIndex
        );
      }
    },

    previousSong: () => {
      const {
        currentQueue,
        currentQueueIndex,
        currentSongIndex,
        songs,
        shuffle,
        shuffledSongs,
        shuffledIndex,
      } = get();

      // If we have a queue, use queue navigation
      if (currentQueue.length > 0) {
        const prevIndex =
          currentQueueIndex > 0
            ? currentQueueIndex - 1
            : currentQueue.length - 1;

        const prevSong = currentQueue[prevIndex];
        set({
          currentQueueIndex: prevIndex,
          currentSong: prevSong,
          currentTime: 0,
          isPlaying: true,
        });
        console.log(
          'Previous song from queue:',
          prevSong.title,
          'Index:',
          prevIndex
        );
      } else if (shuffle && shuffledSongs.length > 0) {
        // Use shuffled array for navigation
        const prevShuffledIndex =
          shuffledIndex > 0 ? shuffledIndex - 1 : shuffledSongs.length - 1;
        const prevSong = shuffledSongs[prevShuffledIndex];
        const prevIndex = songs.findIndex(song => song.id === prevSong.id);

        set({
          currentSongIndex: prevIndex,
          currentSong: prevSong,
          shuffledIndex: prevShuffledIndex,
          currentTime: 0,
          isPlaying: true,
        });
        console.log(
          'Previous song from shuffled library:',
          prevSong?.title,
          'Shuffled Index:',
          prevShuffledIndex
        );
      } else {
        const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        const prevSong = songs[prevIndex];
        set({
          currentSongIndex: prevIndex,
          currentSong: prevSong,
          currentTime: 0,
          isPlaying: true,
        });
        console.log(
          'Previous song from library:',
          prevSong?.title,
          'Index:',
          prevIndex
        );
      }
    },

    autoNextSong: () => {
      const { currentQueue, currentQueueIndex, repeatMode, shuffle } = get();

      console.log('Auto-advancing to next song...');

      // If we have a queue, use queue auto-progression
      if (currentQueue.length > 0) {
        if (repeatMode === 'single') {
          // Repeat current song - restart it
          set({ currentTime: 0, isPlaying: true });
          return;
        }

        const nextIndex = currentQueueIndex + 1;

        if (nextIndex >= currentQueue.length) {
          if (repeatMode === 'all') {
            // Loop back to start of queue
            const firstSong = currentQueue[0];
            set({
              currentQueueIndex: 0,
              currentSong: firstSong,
              currentTime: 0,
              isPlaying: true,
            });
            console.log('Auto-looping to start of queue:', firstSong.title);
          } else {
            // End of queue - stop playing
            set({ isPlaying: false });
            console.log('End of queue reached - stopping playback');
          }
        } else {
          // Play next song in queue
          const nextSong = currentQueue[nextIndex];
          set({
            currentQueueIndex: nextIndex,
            currentSong: nextSong,
            currentTime: 0,
            isPlaying: true,
          });
          console.log('Auto-playing next song:', nextSong.title);
        }
      } else {
        // No queue - handle library songs with enhanced repeat logic
        const { songs, currentSongIndex, shuffledSongs, shuffledIndex } = get();

        if (repeatMode === 'single') {
          // Repeat current song - restart it
          set({ currentTime: 0, isPlaying: true });
          console.log('Repeating current song in library');
          return;
        }

        if (shuffle && shuffledSongs.length > 0) {
          // Handle shuffled library with repeat modes
          const nextShuffledIndex = (shuffledIndex + 1) % shuffledSongs.length;

          if (nextShuffledIndex === 0 && repeatMode === 'off') {
            // End of shuffled playlist and repeat is off
            set({ isPlaying: false });
            console.log('End of shuffled playlist reached - stopping playback');
            return;
          }

          const nextSong = shuffledSongs[nextShuffledIndex];
          const nextIndex = songs.findIndex(song => song.id === nextSong.id);

          set({
            currentSongIndex: nextIndex,
            currentSong: nextSong,
            shuffledIndex: nextShuffledIndex,
            currentTime: 0,
            isPlaying: true,
          });
          console.log('Auto-playing next shuffled song:', nextSong.title);
        } else {
          // Handle normal library with repeat modes
          const nextIndex = (currentSongIndex + 1) % songs.length;

          if (nextIndex === 0 && repeatMode === 'off') {
            // End of playlist and repeat is off
            set({ isPlaying: false });
            console.log('End of playlist reached - stopping playback');
            return;
          }

          const nextSong = songs[nextIndex];
          set({
            currentSongIndex: nextIndex,
            currentSong: nextSong,
            currentTime: 0,
            isPlaying: true,
          });
          console.log('Auto-playing next song in library:', nextSong.title);
        }
      }
    },

    setCurrentTime: time => {
      if (time >= 0) {
        set({ currentTime: time });
      }
    },

    setDuration: duration => {
      if (duration > 0) {
        set({ duration });
      }
    },

    setVolume: volume => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      set({ volume: clampedVolume });
    },

    toggleRepeat: () => {
      const { repeatMode, songs, currentQueue } = get();
      const modes: ('off' | 'single' | 'all')[] = ['off', 'single', 'all'];
      const currentIndex = modes.indexOf(repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      set({ repeatMode: nextMode });

      // Provide user feedback
      const modeNames = {
        off: 'Repeat Off',
        single: 'Repeat One',
        all: 'Repeat All',
      };

      // Handle edge case: if only one song and switching to 'all', suggest 'single' instead
      const totalSongs =
        currentQueue.length > 0 ? currentQueue.length : songs.length;
      if (totalSongs === 1 && nextMode === 'all') {
        console.log(
          `Only one song available - ${modeNames[nextMode]} is equivalent to ${modeNames['single']}`
        );
      } else {
        console.log(`Repeat mode changed to: ${modeNames[nextMode]}`);
      }
    },

    toggleShuffle: () => {
      const { shuffle, songs } = get();
      const newShuffle = !shuffle;

      if (newShuffle && songs.length > 0) {
        // Create shuffled array using Fisher-Yates algorithm
        const shuffledSongs = [...songs];
        for (let i = shuffledSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledSongs[i], shuffledSongs[j]] = [
            shuffledSongs[j],
            shuffledSongs[i],
          ];
        }

        // Find current song position in shuffled array
        const currentSong = get().currentSong;
        const shuffledIndex = currentSong
          ? shuffledSongs.findIndex(song => song.id === currentSong.id)
          : 0;

        set({
          shuffle: newShuffle,
          shuffledSongs,
          shuffledIndex: shuffledIndex >= 0 ? shuffledIndex : 0,
        });
        console.log('Shuffle enabled with Fisher-Yates algorithm');
      } else {
        set({ shuffle: newShuffle, shuffledSongs: [], shuffledIndex: 0 });
        console.log('Shuffle disabled');
      }
    },

    setSearchQuery: query => set({ searchQuery: query }),

    searchSongs: query => {
      const { songs } = get();
      const results = songs.filter(
        song =>
          song.title.toLowerCase().includes(query.toLowerCase()) ||
          song.artist.toLowerCase().includes(query.toLowerCase()) ||
          (song.album && song.album.toLowerCase().includes(query.toLowerCase()))
      );
      set({ searchResults: results });
    },

    setPersistentSearchQuery: query => {
      set({ persistentSearchQuery: query });
      // Also persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('persistentSearchQuery', query);
        } catch (error) {
          console.warn(
            'Failed to persist search query to localStorage:',
            error
          );
        }
      }
    },

    setPersistentSearchResults: results => {
      const updates: Partial<MusicState> = {};

      if (results.local) {
        updates.persistentSearchResults = results.local;
      }
      if (results.api) {
        updates.persistentApiSearchResults = results.api;
      }
      if (results.localDb) {
        updates.persistentLocalSearchResults = results.localDb;
      }
      if (results.saavn) {
        updates.persistentSaavnSearchResults = results.saavn;
      }
      if (results.ytmusic) {
        updates.persistentYTMusicSearchResults = results.ytmusic;
      }

      set(updates);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          const persistentData = {
            local: results.local || [],
            api: results.api || [],
            localDb: results.localDb || [],
            saavn: results.saavn || [],
            ytmusic: results.ytmusic || [],
          };
          localStorage.setItem(
            'persistentSearchResults',
            JSON.stringify(persistentData)
          );
        } catch (error) {
          console.warn(
            'Failed to persist search results to localStorage:',
            error
          );
        }
      }
    },

    clearPersistentSearch: () => {
      set({
        persistentSearchQuery: '',
        persistentSearchResults: [],
        persistentApiSearchResults: [],
        persistentLocalSearchResults: [],
        persistentSaavnSearchResults: [],
        persistentYTMusicSearchResults: [],
      });

      // Clear from localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('persistentSearchQuery');
          localStorage.removeItem('persistentSearchResults');
        } catch (error) {
          console.warn(
            'Failed to clear persistent search from localStorage:',
            error
          );
        }
      }
    },

    searchApiSongs: async query => {
      try {
        set({ isLoading: true });
        const result = await musicAPI.searchSongs(query, 1, 1000); // Increased limit to show more results

        // Convert StreamableSong to MusicSong format
        const apiSongs: MusicSong[] = result.songs.map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album || '',
          duration: song.duration,
          cover_url: song.cover_url,
          file_url: song.stream_url, // Use stream_url as file_url for API songs
          source: 'api' as const,
          stream_url: song.stream_url,
          preview_url: song.preview_url,
          genre: song.genre,
          year: song.release_date ? parseInt(song.release_date) : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        set({ isLoading: false, apiSongs });
        return result.songs;
      } catch (error) {
        console.error('Error searching API songs:', error);
        set({ isLoading: false, error: 'Failed to search songs' });
        return [];
      }
    },

    playApiSong: async song => {
      try {
        console.log(
          '🎵 playApiSong called for:',
          song.title,
          'Source:',
          song.source
        );

        // First, check if this song is already in our local database (songs or apiSongs)
        const { songs, apiSongs } = get();

        // Check local songs first
        let existingSong = songs.find(s => s.id === song.id);
        if (existingSong) {
          console.log(
            '🎵 Song found in local database, playing directly:',
            existingSong.title,
            'Database ID:',
            existingSong.id
          );
          set({ currentSong: existingSong, isPlaying: true, currentTime: 0 });
          return;
        }

        // Check API songs
        existingSong = apiSongs.find(s => s.id === song.id);
        if (existingSong) {
          console.log(
            '🎵 Song found in API database, playing directly:',
            existingSong.title,
            'Database ID:',
            existingSong.id
          );
          set({ currentSong: existingSong, isPlaying: true, currentTime: 0 });
          return;
        }

        // If not in local database, check Supabase database
        const supabaseClient = createClient();

        // For YouTube Music songs, skip ID query and go directly to external_id
        let dbSong = null;
        let dbError = null;

        if (song.source === 'ytmusic' || song.id.startsWith('ytmusic_')) {
          // Skip ID query for YouTube Music songs since they use external_id
          console.log('🔍 YouTube Music song detected, skipping ID query');
        } else {
          // Try to find in api_songs table by ID first (for other sources)
          console.log(
            '🔍 Searching database for song ID:',
            song.id,
            'Source:',
            song.source
          );
          const result = await supabaseClient
            .from('api_songs')
            .select('*')
            .eq('id', song.id)
            .single();

          dbSong = result.data;
          dbError = result.error;

          if (dbError) {
            console.log(
              '❌ Database query failed for ID:',
              song.id,
              'Error:',
              dbError
            );
          }
        }

        // If not found by ID, try by external_id (for YouTube Music songs)
        if (
          dbError &&
          (song.source === 'ytmusic' || song.id.startsWith('ytmusic_'))
        ) {
          const externalId = getOriginalSongId(song.id);
          console.log('🔍 Searching database by external_id:', externalId);
          const { data: dbSongByExternal, error: dbErrorByExternal } =
            await supabaseClient
              .from('api_songs')
              .select('*')
              .eq('external_id', externalId)
              .single();

          if (dbSongByExternal && !dbErrorByExternal) {
            console.log(
              '✅ Found song by external_id:',
              dbSongByExternal.title
            );
            dbSong = dbSongByExternal;
            dbError = null;
          } else {
            console.log(
              '❌ Database query failed for external_id:',
              externalId,
              'Error:',
              dbErrorByExternal
            );
          }
        }

        // If still not found and it's a YouTube Music song, try by title and artist
        if (dbError && song.source === 'ytmusic') {
          console.log(
            '🔍 Searching database by title and artist:',
            song.title,
            'by',
            song.artist
          );
          const { data: dbSongByTitle, error: dbErrorByTitle } =
            await supabaseClient
              .from('api_songs')
              .select('*')
              .eq('title', song.title)
              .eq('artist', song.artist)
              .eq('source', 'ytmusic')
              .single();

          if (dbSongByTitle && !dbErrorByTitle) {
            console.log(
              '✅ Found song by title and artist:',
              dbSongByTitle.title
            );
            dbSong = dbSongByTitle;
            dbError = null;
          } else {
            console.log(
              '❌ Database query failed for title/artist:',
              song.title,
              'by',
              song.artist,
              'Error:',
              dbErrorByTitle
            );
          }
        }

        if (dbSong && !dbError) {
          console.log(
            '🎵 Song found in Supabase database, playing directly:',
            dbSong.title,
            'Database ID:',
            dbSong.id
          );
          const musicSong: MusicSong = {
            id: dbSong.id, // Use database UUID for tracking
            title: dbSong.title,
            artist: dbSong.artist,
            album: dbSong.album || '',
            duration: dbSong.duration || 0,
            cover_url: dbSong.cover_url || '/default-album-art.svg',
            file_url: dbSong.stream_url || '',
            source: dbSong.source || 'api', // Use actual source from database
            stream_url: dbSong.stream_url || '',
            preview_url: dbSong.preview_url,
            genre: dbSong.genre,
            year: dbSong.year,
            created_at: dbSong.created_at,
            updated_at: dbSong.updated_at,
          };
          set({ currentSong: musicSong, isPlaying: true, currentTime: 0 });
          return;
        }

        // If not found in database, proceed with API calls for new songs
        console.log(
          '🎵 Song not in database, proceeding with API calls for:',
          song.title
        );

        // Guard: Only handle API songs (Saavn, YouTube Music, etc.) here
        const isApiSongResult = isApiSong(song.id);
        let isYouTubeMusicSong =
          song.source === 'ytmusic' || song.id.startsWith('ytmusic_');
        const isAnyApiSong = isApiSongResult || isYouTubeMusicSong;

        if (!isAnyApiSong) {
          console.warn(
            'playApiSong called for non-API song; skipping details fetch'
          );
          // Play minimally by setting currentSong (no API details lookup)
          const minimalSong: MusicSong = {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album || '',
            duration: song.duration || 0,
            cover_url: song.cover_url || '/default-album-art.svg',
            file_url: song.stream_url || '',
            source: 'api',
            stream_url: song.stream_url || '',
            preview_url: song.preview_url,
            genre: song.genre,
            year: song.release_date ? parseInt(song.release_date) : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set({ currentSong: minimalSong, isPlaying: true, currentTime: 0 });
          return;
        }

        // Handle different API sources for new songs
        let songToPlay = song;

        if (song.source === 'api' || song.id.startsWith('api_')) {
          // For JioSaavn songs, try to get detailed song information
          const originalSongId = getOriginalSongId(song.id);
          const detailedSong = await musicAPI.getSongDetails(originalSongId);
          songToPlay = detailedSong || song;
        } else if (
          song.source === 'ytmusic' ||
          song.id.startsWith('ytmusic_')
        ) {
          // For YouTube Music songs, use the song data as-is (already processed by youtube-stream API)
          console.log('🎵 Playing YouTube Music song:', song.title);
          songToPlay = song;
        }

        // Validate that we have a stream URL
        if (!songToPlay.stream_url) {
          console.error('No stream URL available for song:', songToPlay.title);
          throw new Error('No stream URL available');
        }

        // Store API song in database
        const supabaseDb = createClient();
        let apiSongId;

        // Check if this is a YouTube Music song (either by source or by database lookup)
        // isYouTubeMusicSong is already defined above

        // If it's a database UUID and not a prefixed ID, check if it's a YouTube Music song in the database
        if (
          !isYouTubeMusicSong &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            song.id
          )
        ) {
          const { data: dbSong } = await supabaseDb
            .from('api_songs')
            .select('source')
            .eq('id', song.id)
            .single();

          if (dbSong && dbSong.source === 'ytmusic') {
            isYouTubeMusicSong = true;
            console.log(
              '🎵 Detected YouTube Music song by database lookup:',
              song.title
            );
          }
        }

        if (isYouTubeMusicSong) {
          // For YouTube Music songs, check if they exist in database
          const externalId = song.id.startsWith('ytmusic_')
            ? getOriginalSongId(song.id)
            : null;
          const { data: existingSong, error: fetchError } = await supabaseDb
            .from('api_songs')
            .select('id, stream_url, external_id')
            .eq(externalId ? 'external_id' : 'id', externalId || song.id)
            .single();

          if (existingSong && !fetchError) {
            // Song exists in database, use it
            apiSongId = existingSong.id;
            songToPlay.stream_url =
              existingSong.stream_url ||
              `/api/youtube-proxy/${existingSong.external_id}`;
            console.log(
              '🎵 Using existing YouTube Music song ID:',
              apiSongId,
              'Stream URL:',
              songToPlay.stream_url
            );
          } else {
            // Song not in database, trigger conversion
            console.log(
              '🔄 YouTube Music song not in database, triggering conversion:',
              song.title
            );

            // Use the YouTube conversion API endpoint
            const videoId = externalId || song.id;

            const conversionResponse = await fetch('/api/youtube-convert', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                videoId,
                title: song.title,
                artist: song.artist,
                album: song.album,
                duration: song.duration,
                thumbnail_url: song.cover_url,
              }),
            });

            const conversionResult = await conversionResponse.json();

            if (conversionResult.success) {
              console.log(
                '✅ YouTube conversion successful:',
                conversionResult
              );
              songToPlay.stream_url = conversionResult.stream_url;

              // The conversion system should have saved the song to database
              // Try to get the database ID again
              const { data: newSong } = await supabaseDb
                .from('api_songs')
                .select('id')
                .eq('external_id', videoId)
                .single();

              if (newSong) {
                apiSongId = newSong.id;
                console.log('🎵 Got database ID after conversion:', apiSongId);
              }
            } else {
              console.error(
                '❌ YouTube conversion failed:',
                conversionResult.error
              );
              throw new Error(
                `YouTube conversion failed: ${conversionResult.error}`
              );
            }
          }
        } else {
          // For JioSaavn songs, use the get_or_create_api_song RPC
          const originalSongId = getOriginalSongId(song.id);
          const { data: songId, error } = await supabaseDb.rpc(
            'get_or_create_api_song',
            {
              p_external_id: originalSongId,
              p_title: songToPlay.title,
              p_artist: songToPlay.artist,
              p_album: songToPlay.album || null,
              p_genre: songToPlay.genre || null,
              p_year: songToPlay.release_date
                ? parseInt(songToPlay.release_date)
                : null,
              p_duration: songToPlay.duration,
              p_stream_url: songToPlay.stream_url,
              p_cover_url: songToPlay.cover_url,
              p_preview_url: songToPlay.preview_url || null,
              p_source: songToPlay.source || 'api',
              p_language: songToPlay.language || null,
              p_release_date: songToPlay.release_date || null,
            }
          );

          if (error) {
            console.error('Error storing API song:', error);
            throw error;
          }

          apiSongId = songId;
        }

        // Convert StreamableSong to MusicSong with database ID
        const musicSong: MusicSong = {
          id: apiSongId, // Use database UUID instead of prefixed ID
          title: songToPlay.title,
          artist: songToPlay.artist,
          album: songToPlay.album || '',
          duration: songToPlay.duration,
          cover_url: songToPlay.cover_url,
          file_url: songToPlay.stream_url,
          source: songToPlay.source || 'api', // Preserve original source
          stream_url: songToPlay.stream_url,
          preview_url: songToPlay.preview_url,
          genre: songToPlay.genre,
          year: songToPlay.release_date
            ? parseInt(songToPlay.release_date)
            : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Play directly without adding to queue to avoid duplication
        // This allows instant play from search results
        set({
          currentSong: musicSong,
          isPlaying: true,
          currentTime: 0,
        });

        console.log(
          '🎵 Setting currentSong in playApiSong:',
          musicSong.title,
          'Database ID:',
          apiSongId
        );
      } catch (error) {
        console.error('Error playing API song:', error);
        const musicSong: MusicSong = {
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album || '',
          duration: song.duration,
          cover_url: song.cover_url,
          file_url: song.stream_url,
          source: 'api',
          stream_url: song.stream_url,
          preview_url: song.preview_url,
          genre: song.genre,
          year: song.release_date ? parseInt(song.release_date) : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({
          currentSong: musicSong,
          isPlaying: true,
          currentTime: 0,
        });
      }
    },

    playSelectedSong: index => {
      const { songs, shuffle, shuffledSongs } = get();
      if (index >= 0 && index < songs.length) {
        const selectedSong = songs[index];

        // If shuffle is enabled, find the position in shuffled array
        let shuffledIndex = 0;
        if (shuffle && shuffledSongs.length > 0) {
          shuffledIndex = shuffledSongs.findIndex(
            song => song.id === selectedSong.id
          );
          if (shuffledIndex === -1) shuffledIndex = 0;
        }

        set({
          currentSongIndex: index,
          currentSong: selectedSong,
          shuffledIndex,
          isPlaying: true,
          currentTime: 0,
        });
        console.log(
          'Selected song:',
          selectedSong.title,
          'Index:',
          index,
          'Shuffled Index:',
          shuffledIndex
        );
      }
    },

    // Enhanced actions
    setPlaybackState: state => set({ playbackState: state }),

    syncPlaybackState: async () => {
      const {
        currentSongIndex,
        isPlaying,
        currentTime,
        volume,
        repeatMode,
        shuffle,
        songs,
        apiSongs,
        currentSong,
        currentQueue,
        currentQueueIndex,
      } = get();

      try {
        // Store current song ID (can be from local songs or API songs)
        // Use the same logic as MusicPlayer to determine the current song
        let currentSongId = null;
        let actualCurrentSong = currentSong;

        // If no currentSong in store, try to find it using the same logic as MusicPlayer
        if (!actualCurrentSong) {
          if (currentQueue && currentQueue.length > 0) {
            actualCurrentSong = currentQueue[currentQueueIndex];
          } else if (songs && songs.length > 0 && currentSongIndex >= 0) {
            actualCurrentSong = songs[currentSongIndex];
          } else if (apiSongs && apiSongs.length > 0 && currentSongIndex >= 0) {
            actualCurrentSong = apiSongs[currentSongIndex];
          }
        }

        if (actualCurrentSong) {
          currentSongId = actualCurrentSong.id;
          console.log(
            'Found currentSong:',
            actualCurrentSong.title,
            'ID:',
            currentSongId
          );

          const playbackState = {
            currentSongId,
            currentSongIndex,
            isPlaying,
            currentTime,
            volume,
            repeatMode,
            shuffle,
            updatedAt: new Date().toISOString(),
          };

          console.log('Syncing playback state to localStorage:', playbackState);

          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'musicPlaybackState',
              JSON.stringify(playbackState)
            );
            console.log('Playback state synced to localStorage successfully');
          }
        } else {
          console.log(
            'No current song found, skipping sync. currentSong:',
            currentSong,
            'songs.length:',
            songs.length,
            'currentSongIndex:',
            currentSongIndex,
            'currentQueue.length:',
            currentQueue?.length || 0
          );
        }

        // Also update the store state only if we have a current song
        if (actualCurrentSong) {
          const musicPlaybackState: MusicPlaybackState = {
            id: 'current',
            current_song_id: currentSongId || '',
            playback_time: currentTime,
            is_playing: isPlaying,
            volume,
            repeat_mode: repeatMode,
            shuffle,
            updated_at: new Date().toISOString(),
          };

          set({ playbackState: musicPlaybackState });
        }
      } catch (error) {
        console.error('Error in syncPlaybackState:', error);
      }
    },

    setError: error => set({ error }), // Error handler

    setIsLoading: loading => set({ isLoading: loading }),

    loadPlaybackState: async () => {
      try {
        // Load playback state from localStorage instead of database
        if (typeof window !== 'undefined') {
          const savedState = localStorage.getItem('musicPlaybackState');

          if (savedState) {
            const playbackState = JSON.parse(savedState);
            console.log(
              'Loaded playback state from localStorage:',
              playbackState
            );

            // Only restore playback state if no song is currently playing
            const { currentSong } = get();
            if (!currentSong) {
              // Restore playback state
              set({
                currentTime: playbackState.currentTime || 0,
                isPlaying: playbackState.isPlaying || false,
                volume: playbackState.volume || 0.7,
                repeatMode: playbackState.repeatMode || 'off',
                shuffle: playbackState.shuffle || false,
              });

              // If there's a current song, try to find and restore it
              if (playbackState.currentSongId) {
                const { songs, apiSongs } = get();

                // Look in local songs first
                let foundSong = songs.find(
                  song => song.id === playbackState.currentSongId
                );
                let foundIndex = songs.findIndex(
                  song => song.id === playbackState.currentSongId
                );

                // If not found in local songs, look in API songs
                if (!foundSong) {
                  foundSong = apiSongs.find(
                    song => song.id === playbackState.currentSongId
                  );
                  foundIndex = apiSongs.findIndex(
                    song => song.id === playbackState.currentSongId
                  );
                }

                if (foundSong && foundIndex >= 0) {
                  console.log(
                    'Restoring song from localStorage:',
                    foundSong.title
                  );
                  set({
                    currentSong: foundSong,
                    currentSongIndex: foundIndex,
                  });
                }
              }
            } else {
              console.log(
                'Song already playing, not restoring from localStorage'
              );
            }
          } else {
            console.log('No saved playback state found in localStorage');
          }
        }
      } catch (error) {
        console.error('Error in loadPlaybackState:', error);
      }
    },

    loadSongsWithFallback: async () => {
      try {
        console.log('Loading songs...');
        set({ isLoading: true });

        const supabase = createClient();
        const { data: supabaseSongs, error } = await supabase
          .from('songs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          set({
            songs: [],
            error: 'Failed to load songs from database',
            isLoading: false,
          });
          return;
        }

        console.log('Loaded songs from Supabase:', supabaseSongs?.length || 0);
        set({ songs: supabaseSongs || [], isLoading: false });
      } catch (error) {
        console.error('Failed to load from Supabase:', error);
        set({
          songs: [],
          error: 'Failed to load songs from database',
          isLoading: false,
        });
      }
    },

    // Queue management
    addToQueue: song => {
      set(state => {
        const { currentQueue, currentQueueIndex, currentSong } = state;

        // If no queue or no current song, just add to end
        if (currentQueue.length === 0 || !currentSong) {
          return {
            currentQueue: [song],
          };
        }

        // Insert after the currently playing song
        const newQueue = [...currentQueue];
        const insertIndex = currentQueueIndex + 1;
        newQueue.splice(insertIndex, 0, song);

        console.log(
          `Added "${song.title}" to queue at position ${insertIndex}`
        );

        return {
          currentQueue: newQueue,
        };
      });
    },

    removeFromQueue: index => {
      set(state => {
        const newQueue = state.currentQueue.filter((_, i) => i !== index);
        let newQueueIndex = state.currentQueueIndex;

        if (index < state.currentQueueIndex) {
          newQueueIndex = state.currentQueueIndex - 1;
        } else if (index === state.currentQueueIndex && newQueue.length > 0) {
          newQueueIndex = Math.min(
            state.currentQueueIndex,
            newQueue.length - 1
          );
        }

        return {
          currentQueue: newQueue,
          currentQueueIndex: newQueueIndex,
        };
      });
    },

    reorderQueue: (fromIndex, toIndex) => {
      set(state => {
        const newQueue = [...state.currentQueue];
        const [movedItem] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedItem);

        let newQueueIndex = state.currentQueueIndex;
        if (fromIndex === state.currentQueueIndex) {
          newQueueIndex = toIndex;
        } else if (
          fromIndex < state.currentQueueIndex &&
          toIndex >= state.currentQueueIndex
        ) {
          newQueueIndex = state.currentQueueIndex - 1;
        } else if (
          fromIndex > state.currentQueueIndex &&
          toIndex <= state.currentQueueIndex
        ) {
          newQueueIndex = state.currentQueueIndex + 1;
        }

        return {
          currentQueue: newQueue,
          currentQueueIndex: newQueueIndex,
        };
      });
    },

    clearQueue: () => {
      set({ currentQueue: [], currentQueueIndex: 0 });
    },

    // Utility functions
    getRepeatModeInfo: () => {
      const { repeatMode, songs, currentQueue } = get();
      const totalSongs =
        currentQueue.length > 0 ? currentQueue.length : songs.length;

      const modeInfo = {
        off: { mode: 'Repeat Off', description: 'Play each song once' },
        single: { mode: 'Repeat One', description: 'Loop current song' },
        all: { mode: 'Repeat All', description: 'Loop entire playlist' },
      };

      return {
        mode: modeInfo[repeatMode].mode,
        description: modeInfo[repeatMode].description,
        totalSongs,
      };
    },

    setCurrentQueue: queue => {
      set({ currentQueue: queue, currentQueueIndex: 0 });
    },

    setCurrentQueueIndex: index => {
      set({ currentQueueIndex: index });
    },

    // Playlist management
    loadPlaylists: async () => {
      try {
        const supabase = createClient();
        const { data: playlists, error } = await supabase
          .from('playlists')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading playlists:', error);
          return;
        }

        set({ playlists: playlists || [] });
      } catch (error) {
        console.error('Failed to load playlists:', error);
      }
    },

    createPlaylist: async (name, description) => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('playlists')
          .insert({
            name,
            description,
            is_public: false,
            is_auto_generated: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating playlist:', error);
          return;
        }

        set(state => ({
          playlists: [...state.playlists, data],
        }));
      } catch (error) {
        console.error('Failed to create playlist:', error);
      }
    },

    addToPlaylist: async (playlistId, songId) => {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('playlist_songs').insert({
          playlist_id: playlistId,
          song_id: songId,
          position: 0, // Will be updated by trigger
        });

        if (error) {
          console.error('Error adding song to playlist:', error);
        }
      } catch (error) {
        console.error('Failed to add song to playlist:', error);
      }
    },

    removeFromPlaylist: async (playlistId, songId) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('playlist_songs')
          .delete()
          .eq('playlist_id', playlistId)
          .eq('song_id', songId);

        if (error) {
          console.error('Error removing song from playlist:', error);
        }
      } catch (error) {
        console.error('Failed to remove song from playlist:', error);
      }
    },

    deletePlaylist: async playlistId => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('playlists')
          .delete()
          .eq('id', playlistId);

        if (error) {
          console.error('Error deleting playlist:', error);
          return;
        }

        set(state => ({
          playlists: state.playlists.filter(p => p.id !== playlistId),
        }));
      } catch (error) {
        console.error('Failed to delete playlist:', error);
      }
    },

    playPlaylist: async playlistId => {
      try {
        const supabase = createClient();
        const { data: playlistSongs, error } = await supabase
          .from('playlist_songs')
          .select(
            `
            song_id,
            position,
            songs (*)
          `
          )
          .eq('playlist_id', playlistId)
          .order('position', { ascending: true });

        if (error) {
          console.error('Error loading playlist songs:', error);
          return;
        }

        const songs = (playlistSongs
          ?.map(ps => (ps as PlaylistSongJoin).songs[0])
          .filter(Boolean) || []) as MusicSong[];
        if (songs.length > 0) {
          set({
            currentQueue: songs,
            currentQueueIndex: 0,
            currentPlaylist: playlistId,
            currentSongIndex: 0,
            isPlaying: true,
            currentTime: 0,
          });
        }
      } catch (error) {
        console.error('Failed to play playlist:', error);
      }
    },

    // Favorites management
    toggleFavorite: async songId => {
      try {
        const supabase = createClient();
        const { favorites, apiFavorites } = get();

        // Enhanced API song detection with UUID optimization
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            songId
          );
        const isApiSongResult = isApiSong(songId);

        // Determine if API song with UUID check first to minimize DB queries
        let isApiSongByUuid = false;
        if (isUUID && !isApiSongResult) {
          const { data: apiSong } = await supabase
            .from('api_songs')
            .select('id')
            .eq('id', songId)
            .single();
          isApiSongByUuid = !!apiSong;
        }

        const finalIsApiSong = isApiSongResult || isApiSongByUuid;
        console.log('👍 Toggle favorite:', {
          songId,
          isApiSong: finalIsApiSong,
          currentState: finalIsApiSong
            ? apiFavorites.includes(songId)
            : favorites.includes(songId),
        });

        // Handle favorites based on song type
        if (finalIsApiSong) {
          // Optimistically update state first for better UX
          const newApiFavorites = apiFavorites.includes(songId)
            ? apiFavorites.filter(id => id !== songId)
            : [...apiFavorites, songId];
          set({ apiFavorites: newApiFavorites });

          // Get actual database ID for API songs
          let actualSongId = songId;
          if (isApiSongResult) {
            const externalId = getOriginalSongId(songId);
            const { data: existingSong, error: fetchError } = await supabase
              .from('api_songs')
              .select('id')
              .eq('external_id', externalId)
              .single();

            if (fetchError) {
              if (fetchError.code !== 'PGRST116') {
                console.error('Error fetching API song:', fetchError);
                // Revert optimistic update
                set({ apiFavorites });
                return;
              }
              console.error('API song not found:', songId);
              set({ apiFavorites });
              return;
            }
            actualSongId = existingSong.id;
          }

          // Perform database operation
          const { error } = apiFavorites.includes(songId)
            ? await supabase
                .from('api_favorites')
                .delete()
                .eq('song_id', actualSongId)
            : await supabase
                .from('api_favorites')
                .insert({ song_id: actualSongId });

          if (error) {
            console.error('API favorite operation failed:', error);
            // Revert optimistic update on error
            set({ apiFavorites });
          }
        } else {
          // Handle local song favorites with optimistic updates
          const newFavorites = favorites.includes(songId)
            ? favorites.filter(id => id !== songId)
            : [...favorites, songId];
          set({ favorites: newFavorites });

          // Perform database operation
          const { error } = favorites.includes(songId)
            ? await supabase
                .from('public_favorites')
                .delete()
                .eq('song_id', songId)
            : await supabase
                .from('public_favorites')
                .insert({ song_id: songId });

          if (error) {
            console.error('Local favorite operation failed:', error);
            // Revert optimistic update on error
            set({ favorites });
          }
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    },

    loadFavorites: async () => {
      try {
        const supabase = createClient();
        const { data: favorites, error } = await supabase
          .from('public_favorites')
          .select('song_id');

        if (error) {
          return;
        }

        set({
          favorites: favorites?.map(f => f.song_id) || [],
        });
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    },

    loadApiFavorites: async () => {
      try {
        const supabase = createClient();
        const { data: favorites, error } = await supabase
          .from('api_favorites')
          .select('song_id');

        if (error) {
          console.error('Error loading API favorites:', error);
          return;
        }

        set({
          apiFavorites: favorites?.map(f => f.song_id) || [],
        });
      } catch (error) {
        console.error('Error loading API favorites:', error);
      }
    },

    loadApiSongs: async () => {
      try {
        const supabase = createClient();
        const { data: apiSongs, error } = await supabase
          .from('api_songs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading API songs:', error);
          return;
        }

        // Convert API songs to MusicSong format
        const musicSongs: MusicSong[] =
          apiSongs?.map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album || '',
            duration: song.duration,
            cover_url: song.cover_url,
            file_url: song.stream_url,
            source: 'api',
            stream_url: song.stream_url,
            preview_url: song.preview_url,
            genre: song.genre,
            year: song.year,
            created_at: song.created_at,
            updated_at: song.updated_at,
          })) || [];

        set({ apiSongs: musicSongs });
        console.log('API songs loaded:', musicSongs.length);
      } catch (error) {
        console.error('Error loading API songs:', error);
      }
    },

    toggleApiFavorite: async songId => {
      try {
        const supabase = createClient();
        const { apiFavorites } = get();

        if (apiFavorites.includes(songId)) {
          // Remove from favorites
          const { error } = await supabase
            .from('api_favorites')
            .delete()
            .eq('song_id', songId);

          if (!error) {
            set(state => ({
              apiFavorites: state.apiFavorites.filter(id => id !== songId),
            }));
          } else {
            console.error('Error removing API favorite:', error);
          }
        } else {
          // Add to favorites
          const { error } = await supabase
            .from('api_favorites')
            .insert({ song_id: songId });

          if (!error) {
            set(state => ({
              apiFavorites: [...state.apiFavorites, songId],
            }));
          } else {
            console.error('Error adding API favorite:', {
              error,
              errorCode: error.code,
              errorMessage: error.message,
              errorDetails: error.details,
              songId,
            });
            // If it's a conflict (duplicate), the song is already in favorites
            if (
              error.code === '23505' ||
              error.message?.includes('duplicate') ||
              error.code === '409'
            ) {
              console.log('API song already in favorites, updating state');
              set(state => ({
                apiFavorites: [...state.apiFavorites, songId],
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error toggling API favorite:', error);
      }
    },

    generateAlbumPlaylist: album => {
      const { songs } = get();
      const albumSongs = songs.filter(song => song.album === album);
      if (albumSongs.length > 0) {
        set({
          currentQueue: albumSongs,
          currentQueueIndex: 0,
          currentPlaylist: `album_${album}`,
          currentSongIndex: 0,
          isPlaying: true,
          currentTime: 0,
        });
      }
    },

    generateArtistPlaylist: artist => {
      const { songs } = get();
      const artistSongs = songs.filter(song => song.artist === artist);
      if (artistSongs.length > 0) {
        set({
          currentQueue: artistSongs,
          currentQueueIndex: 0,
          currentPlaylist: `artist_${artist}`,
          currentSongIndex: 0,
          isPlaying: true,
          currentTime: 0,
        });
      }
    },

    generateFavoritesPlaylist: () => {
      const { songs, apiSongs, favorites, apiFavorites } = get();
      const favoriteSongs = songs.filter(song => favorites.includes(song.id));
      const favoriteApiSongs = apiSongs.filter(song =>
        apiFavorites.includes(song.id)
      );
      const allFavoriteSongs = [...favoriteSongs, ...favoriteApiSongs];

      if (allFavoriteSongs.length > 0) {
        set({
          currentQueue: allFavoriteSongs,
          currentQueueIndex: 0,
          currentPlaylist: 'favorites',
          currentSongIndex: 0,
          isPlaying: true,
          currentTime: 0,
        });
      }
    },

    // Rehydrate persistent search state from localStorage
    rehydratePersistentSearch: () => {
      if (typeof window === 'undefined') return;

      try {
        const persistentQuery = localStorage.getItem('persistentSearchQuery');
        const persistentResults = localStorage.getItem(
          'persistentSearchResults'
        );

        if (persistentQuery) {
          set({ persistentSearchQuery: persistentQuery });
        }

        if (persistentResults) {
          const parsedResults = JSON.parse(persistentResults);
          set({
            persistentSearchResults: parsedResults.local || [],
            persistentApiSearchResults: parsedResults.api || [],
            persistentLocalSearchResults: parsedResults.localDb || [],
            persistentSaavnSearchResults: parsedResults.saavn || [],
            persistentYTMusicSearchResults: parsedResults.ytmusic || [],
          });
        }
      } catch (error) {
        console.warn('Failed to rehydrate persistent search state:', error);
      }
    },
  }))
);

export function setCurrentSongIndex(index: number) {
  const {
    songs,
    setCurrentSongIndex: setIndex,
    setCurrentTime,
  } = useMusicStore.getState();
  if (index >= 0 && index < songs.length) {
    setIndex(index);
    setCurrentTime(0);
    console.log('Song index changed to:', index);
  }
}

export function playSelectedSong(index: number) {
  const {
    songs,
    setCurrentSongIndex: setIndex,
    playSong,
    setCurrentTime,
  } = useMusicStore.getState();
  if (index >= 0 && index < songs.length) {
    setIndex(index);
    playSong();
    setCurrentTime(0);
    console.log('Selected song:', index);
  }
}
