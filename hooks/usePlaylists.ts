'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMusicStore, type MusicSong } from '@/store/musicStore';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songCount: number;
  color: string;
  songs: MusicSong[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export function usePlaylists() {
  const musicStore = useMusicStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Safely extract values with fallbacks using useMemo
  const songs = useMemo(() => musicStore?.songs || [], [musicStore?.songs]);
  const apiSongs = useMemo(
    () => musicStore?.apiSongs || [],
    [musicStore?.apiSongs]
  );
  const favorites = useMemo(
    () => musicStore?.favorites || [],
    [musicStore?.favorites]
  );
  const apiFavorites = useMemo(
    () => musicStore?.apiFavorites || [],
    [musicStore?.apiFavorites]
  );

  // Generate dynamic playlists based on actual data
  useEffect(() => {
    try {
      if (!songs || songs.length === 0) {
        setIsLoading(false);
        return;
      }

      const generatePlaylists = (): Playlist[] => {
        const safeSongs = songs || [];
        const safeApiSongs = apiSongs || [];
        const allSongs = [...safeSongs, ...safeApiSongs];
        const now = new Date().toISOString();

        // Create dynamic playlists based on actual song data
        const dynamicPlaylists: Playlist[] = [];

        // 1. All Songs playlist (includes both local and API songs)
        if (allSongs.length > 0) {
          dynamicPlaylists.push({
            id: 'all-songs',
            name: 'All Songs',
            description: 'Your complete music library',
            songCount: allSongs.length,
            color: 'rgba(59, 130, 246, 0.2)', // Blue
            songs: allSongs,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 2. Favorites playlist (includes both local and API favorites)
        const favoriteSongs = safeSongs.filter(song =>
          favorites.includes(song.id)
        );
        const favoriteApiSongs = safeApiSongs.filter(song =>
          apiFavorites.includes(song.id)
        );
        const allFavoriteSongs = [...favoriteSongs, ...favoriteApiSongs];

        if (allFavoriteSongs.length > 0) {
          dynamicPlaylists.push({
            id: 'favorites',
            name: 'My Favorites',
            description: 'Songs you love',
            songCount: allFavoriteSongs.length,
            color: 'rgba(239, 68, 68, 0.2)', // Red
            songs: allFavoriteSongs,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 3. Recently Added (last 20 songs from both local and API)
        if (allSongs.length > 0) {
          const recentlyAdded = allSongs
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 20);
          dynamicPlaylists.push({
            id: 'recently-added',
            name: 'Recently Added',
            description: 'Latest additions to your library',
            songCount: recentlyAdded.length,
            color: 'rgba(34, 197, 94, 0.2)', // Green
            songs: recentlyAdded,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 4. Long Songs (songs longer than 4 minutes)
        const longSongs = allSongs.filter(song => (song.duration || 0) > 240);
        if (longSongs.length > 0) {
          dynamicPlaylists.push({
            id: 'long-songs',
            name: 'Long Songs',
            description: 'Songs longer than 4 minutes',
            songCount: longSongs.length,
            color: 'rgba(168, 85, 247, 0.2)', // Purple
            songs: longSongs,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 5. Short Songs (songs shorter than 3 minutes)
        const shortSongs = allSongs.filter(
          song => (song.duration || 0) < 180 && (song.duration || 0) > 0
        );
        if (shortSongs.length > 0) {
          dynamicPlaylists.push({
            id: 'short-songs',
            name: 'Quick Hits',
            description: 'Songs shorter than 3 minutes',
            songCount: shortSongs.length,
            color: 'rgba(245, 158, 11, 0.2)', // Orange
            songs: shortSongs,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 6. Genre-based playlists (if genre data exists)
        const genreMap = new Map<string, MusicSong[]>();
        allSongs.forEach(song => {
          if (song.genre) {
            if (!genreMap.has(song.genre)) {
              genreMap.set(song.genre, []);
            }
            genreMap.get(song.genre)!.push(song);
          }
        });

        // Add top 3 genres as playlists
        const sortedGenres = Array.from(genreMap.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 3);

        const genreColors = [
          'rgba(236, 72, 153, 0.2)', // Pink
          'rgba(14, 165, 233, 0.2)', // Sky blue
          'rgba(16, 185, 129, 0.2)', // Emerald
        ];

        sortedGenres.forEach(([genre, genreSongs], index) => {
          dynamicPlaylists.push({
            id: `genre-${genre.toLowerCase().replace(/\s+/g, '-')}`,
            name: genre,
            description: `${genre} music`,
            songCount: genreSongs.length,
            color: genreColors[index] || 'rgba(107, 114, 128, 0.2)', // Gray fallback
            songs: genreSongs,
            isPublic: false,
            createdAt: now,
            updatedAt: now,
          });
        });

        return dynamicPlaylists;
      };

      const generatedPlaylists = generatePlaylists();
      setPlaylists(generatedPlaylists);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating playlists:', error);
      setPlaylists([]);
      setIsLoading(false);
    }
  }, [songs, apiSongs, favorites, apiFavorites]);

  // Create a new playlist
  const createPlaylist = (
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Playlist => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      description,
      songCount: 0,
      color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.2)`,
      songs: [],
      isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  };

  // Add song to playlist
  const addSongToPlaylist = (playlistId: string, song: MusicSong) => {
    setPlaylists(prev =>
      prev.map(playlist => {
        if (playlist.id === playlistId) {
          const updatedSongs = [...playlist.songs, song];
          return {
            ...playlist,
            songs: updatedSongs,
            songCount: updatedSongs.length,
            updatedAt: new Date().toISOString(),
          };
        }
        return playlist;
      })
    );
  };

  // Remove song from playlist
  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists(prev =>
      prev.map(playlist => {
        if (playlist.id === playlistId) {
          const updatedSongs = playlist.songs.filter(
            song => song.id !== songId
          );
          return {
            ...playlist,
            songs: updatedSongs,
            songCount: updatedSongs.length,
            updatedAt: new Date().toISOString(),
          };
        }
        return playlist;
      })
    );
  };

  // Delete playlist
  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
  };

  // Update playlist
  const updatePlaylist = (playlistId: string, updates: Partial<Playlist>) => {
    setPlaylists(prev =>
      prev.map(playlist => {
        if (playlist.id === playlistId) {
          return {
            ...playlist,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return playlist;
      })
    );
  };

  return {
    playlists,
    isLoading,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
    updatePlaylist,
  };
}
