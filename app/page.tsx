'use client';

import { useEffect, useState } from 'react';
import { useMusicStore, type MusicSong } from '@/store/musicStore';

// MusicSong type now includes 'ytmusic' and 'saavn' as valid source values
import { usePersistentPlayback } from '@/hooks/usePersistentPlayback';
import { usePlaylists } from '@/hooks/usePlaylists';
import Image from 'next/image';
import {
  Play,
  Plus,
  X,
  List,
  Shuffle,
  Repeat,
  PlusCircle,
  Heart,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import Recommendations from '@/components/Recommendations';
import FavoriteButton from '@/components/FavoriteButton';
import SourceBadge from '@/components/SourceBadge';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Simple play button component for homepage
function PlayOverlayButton({
  song,
  songIndex: _songIndex,
}: {
  song: MusicSong;
  songIndex?: number;
}) {
  const {
    currentSong,
    isPlaying,
    playSelectedSong,
    songs,
    apiSongs,
    playApiSong,
  } = useMusicStore();
  const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if song is in local songs table
    const localSongIndex = songs.findIndex(s => s.id === song.id);
    if (localSongIndex !== -1) {
      playSelectedSong(localSongIndex);
      return;
    }

    // Check if song is in api_songs table
    const apiSong = apiSongs.find(s => s.id === song.id);
    if (apiSong) {
      const streamableSong = {
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

    console.warn('Song not found in database:', song.title);
  };

  return (
    <button
      onClick={handleClick}
      className='absolute inset-0 bg-black/0 hover:bg-black/50 transition-all duration-200 flex items-center justify-center rounded-lg group/play'
      title={isCurrentlyPlaying ? 'Pause' : 'Play'}
      aria-label={`${isCurrentlyPlaying ? 'Pause' : 'Play'} ${song.title} by ${song.artist}`}
    >
      <div className='opacity-0 group-hover:opacity-100 group-hover/play:opacity-100 transition-opacity duration-200'>
        {isCurrentlyPlaying ? (
          <div className='w-5 h-5 bg-white rounded-full flex items-center justify-center'>
            <div className='w-2 h-2 bg-black rounded-full'></div>
          </div>
        ) : (
          <Play className='w-5 h-5 text-white ml-0.5' />
        )}
      </div>
    </button>
  );
}

// Simple play icon button component for homepage
function PlayIconButton({
  song,
  songIndex: _songIndex,
}: {
  song: MusicSong;
  songIndex?: number;
}) {
  const {
    currentSong,
    isPlaying,
    playSelectedSong,
    songs,
    apiSongs,
    playApiSong,
  } = useMusicStore();
  const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if song is in local songs table
    const localSongIndex = songs.findIndex(s => s.id === song.id);
    if (localSongIndex !== -1) {
      playSelectedSong(localSongIndex);
      return;
    }

    // Check if song is in api_songs table
    const apiSong = apiSongs.find(s => s.id === song.id);
    if (apiSong) {
      const streamableSong = {
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

    console.warn('Song not found in database:', song.title);
  };

  return (
    <button
      onClick={handleClick}
      className='p-1 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted'
      title={isCurrentlyPlaying ? 'Pause' : 'Play'}
      aria-label={`${isCurrentlyPlaying ? 'Pause' : 'Play'} ${song.title} by ${song.artist}`}
    >
      {isCurrentlyPlaying ? (
        <div className='w-4 h-4 bg-current rounded-full flex items-center justify-center'>
          <div className='w-1.5 h-1.5 bg-white rounded-full'></div>
        </div>
      ) : (
        <Play size={16} />
      )}
    </button>
  );
}

export default function HomePage() {
  const {
    songs,
    apiSongs,
    currentSongIndex,
    isPlaying,
    playPause,
    favorites,
    apiFavorites,
    loadSongsWithFallback,
    loadApiSongs,
    loadApiFavorites,
    shuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
    addToQueue,
  } = useMusicStore();

  const { playSelectedSong } = usePersistentPlayback();

  const {
    playlists = [],
    isLoading: playlistsLoading = false,
    createPlaylist,
  } = usePlaylists();

  // Combine local and API songs for display
  const safeSongs = songs || [];
  const safeApiSongs = apiSongs || [];
  const allSongs = [...safeSongs, ...safeApiSongs];

  // Create randomized song pools for different sections
  const getRandomizedSongs = (count: number, seed?: string): MusicSong[] => {
    if (allSongs.length === 0) return [];

    // Use seed for consistent randomization (based on section or time)
    const randomSeed = seed
      ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
      : Date.now();
    const seededRandom = (min: number, max: number) => {
      const x = Math.sin(randomSeed) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    // Create a shuffled copy with seeded randomization
    const shuffled = [...allSongs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = seededRandom(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  };

  // Combine favorites from both sources
  const allFavorites = [...(favorites || []), ...(apiFavorites || [])];

  // State for playlist management
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    loadSongsWithFallback();
    loadApiSongs();
    loadApiFavorites();
  }, [loadSongsWithFallback, loadApiSongs, loadApiFavorites]);

  // Playlists are now generated dynamically from actual data

  const handleSongClick = (index: number) => {
    if (index === currentSongIndex) {
      playPause();
    } else {
      playSelectedSong(index);
    }
  };

  const handlePlaylistClick = (playlistId: string) => {
    setSelectedPlaylist(selectedPlaylist === playlistId ? null : playlistId);
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim() && createPlaylist) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    }
  };

  const handleAddToQueue = (e: React.MouseEvent, song: MusicSong) => {
    e.stopPropagation();
    addToQueue(song);
  };

  return (
    <div className='min-h-screen bg-background'>
      <main className='container-responsive py-4 sm:py-6 lg:py-8 max-w-6xl'>
        {/* Personalized Recommendations */}
        <div className='mb-8'>
          <Recommendations allSongs={allSongs} />
        </div>

        {/* Recently Played */}
        <div className='mb-8'>
          <div className='space-y-4'>
            {/* Recently Played Section */}
            <div className='flex items-center space-x-3'>
              <div className='p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500'>
                <svg
                  className='w-5 h-5 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-semibold text-foreground'>
                Recently Played
              </h3>
            </div>

            {allSongs.length > 0 ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8'>
                {/* Show randomized songs from all sources */}
                {getRandomizedSongs(
                  6,
                  `recently-played-${new Date().getDate()}`
                ).map((song: MusicSong, index: number) => {
                  const isCurrentlyPlaying =
                    currentSongIndex === index && isPlaying;
                  const isLocalSong = index < safeSongs.length;
                  const actualIndex = isLocalSong ? index : undefined;

                  return (
                    <div
                      key={song.id}
                      className='bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 hover:bg-card/80 hover:border-border transition-all duration-200 group relative'
                    >
                      <div className='flex items-center space-x-3'>
                        <div className='relative flex-shrink-0'>
                          <div className='w-12 h-12 rounded-lg overflow-hidden bg-muted'>
                            {song.cover_url ? (
                              <Image
                                src={song.cover_url}
                                alt={song.title}
                                fill
                                className='object-cover transition-transform duration-300 group-hover:scale-105'
                                sizes='48px'
                              />
                            ) : (
                              <Image
                                src='/default-album-art.svg'
                                alt='Default album art'
                                fill
                                className='object-cover transition-transform duration-300 group-hover:scale-105'
                                sizes='48px'
                              />
                            )}
                          </div>

                          {/* Play/Pause overlay */}
                          <PlayOverlayButton
                            song={song}
                            songIndex={actualIndex}
                          />

                          {/* Currently playing indicator */}
                          {isCurrentlyPlaying && (
                            <div className='absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center'>
                              <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                            </div>
                          )}
                        </div>

                        <div className='flex-1 min-w-0'>
                          <h4 className='font-semibold text-foreground truncate text-sm'>
                            {song.title}
                          </h4>
                          <p className='text-muted-foreground text-xs truncate'>
                            {song.artist}
                          </p>
                          {song.album && (
                            <p className='text-muted-foreground text-xs truncate'>
                              {song.album}
                            </p>
                          )}
                        </div>

                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={e => handleAddToQueue(e, song)}
                            className='p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted'
                            title='Add to queue'
                          >
                            <PlusCircle size={14} />
                          </button>
                          <FavoriteButton
                            songId={song.id}
                            source={song.source}
                            size={14}
                          />

                          <div className='flex items-center space-x-2'>
                            <span className='text-xs text-muted-foreground font-mono'>
                              {formatTime(song.duration || 0)}
                            </span>
                            <SourceBadge song={song} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='text-center py-8'>
                <svg
                  className='w-12 h-12 text-muted-foreground mx-auto mb-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                  />
                </svg>
                <p className='text-muted-foreground'>No songs available</p>
                <p className='text-sm text-muted-foreground'>
                  Search for music online to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Favorites */}
        <div className='mb-8'>
          <div className='space-y-4'>
            <div className='flex items-center space-x-3'>
              <div className='p-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500'>
                <Heart className='w-5 h-5 text-white' />
              </div>
              <h3 className='text-xl font-semibold text-foreground'>
                Your Favorites
              </h3>
              <span className='text-sm text-muted-foreground'>
                ({allFavorites.length} songs)
              </span>
            </div>

            {allFavorites.length > 0 ? (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                {allSongs
                  .filter(song => allFavorites.includes(song.id))
                  .slice(0, 6)
                  .map((song: MusicSong) => {
                    const originalIndex = allSongs.findIndex(
                      s => s.id === song.id
                    );
                    const isCurrentlyPlaying =
                      currentSongIndex === originalIndex && isPlaying;

                    return (
                      <div
                        key={song.id}
                        className='bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 hover:bg-card/80 hover:border-border transition-all duration-200 cursor-pointer group'
                        onClick={() => handleSongClick(originalIndex)}
                      >
                        <div className='flex items-center space-x-3'>
                          <div className='relative flex-shrink-0'>
                            <div className='w-12 h-12 rounded-lg overflow-hidden bg-muted'>
                              {song.cover_url ? (
                                <Image
                                  src={song.cover_url}
                                  alt={song.title}
                                  fill
                                  className='object-cover transition-transform duration-300 group-hover:scale-105'
                                  sizes='48px'
                                />
                              ) : (
                                <Image
                                  src='/default-album-art.svg'
                                  alt='Default album art'
                                  fill
                                  className='object-cover transition-transform duration-300 group-hover:scale-105'
                                  sizes='48px'
                                />
                              )}
                            </div>

                            {/* Play/Pause overlay */}
                            <PlayOverlayButton song={song} />

                            {/* Currently playing indicator */}
                            {isCurrentlyPlaying && (
                              <div className='absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center'>
                                <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                              </div>
                            )}

                            {/* Favorite indicator */}
                            <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center'>
                              <Heart className='w-2.5 h-2.5 text-white fill-white' />
                            </div>
                          </div>

                          <div className='flex-1 min-w-0'>
                            <h4 className='font-semibold text-foreground truncate text-sm'>
                              {song.title}
                            </h4>
                            <p className='text-muted-foreground text-xs truncate'>
                              {song.artist}
                            </p>
                            {song.album && (
                              <p className='text-muted-foreground text-xs truncate'>
                                {song.album}
                              </p>
                            )}
                          </div>

                          <div className='flex items-center space-x-2'>
                            <button
                              onClick={e => handleAddToQueue(e, song)}
                              className='p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground'
                              title='Add to queue'
                            >
                              <PlusCircle size={12} />
                            </button>
                            <FavoriteButton
                              songId={song.id}
                              source={song.source}
                              size={12}
                            />

                            <div className='flex items-center space-x-2'>
                              <span className='text-xs text-muted-foreground font-mono'>
                                {formatTime(song.duration || 0)}
                              </span>
                              <SourceBadge song={song} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className='text-center py-8'>
                <Heart className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
                <p className='text-muted-foreground'>No favorite songs yet</p>
                <p className='text-sm text-muted-foreground'>
                  Heart songs you love to see them here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Playlists Section */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-2xl sm:text-3xl font-bold text-foreground'>
              Your Playlists
            </h2>
            <div className='flex items-center space-x-2'>
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${
                  shuffle
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`Shuffle ${shuffle ? 'On' : 'Off'}`}
                aria-label={`Toggle shuffle mode. Currently ${shuffle ? 'on' : 'off'}`}
              >
                <Shuffle className='w-5 h-5' />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-2 transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`Repeat ${repeatMode === 'single' ? 'One' : repeatMode === 'all' ? 'All' : 'Off'}`}
                aria-label={`Toggle repeat mode. Currently ${repeatMode === 'single' ? 'repeat one' : repeatMode === 'all' ? 'repeat all' : 'off'}`}
              >
                <Repeat className='w-5 h-5' />
              </button>
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className='flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors'
                aria-label='Create new playlist'
              >
                <Plus className='w-4 h-4' />
                <span className='hidden sm:inline'>Create Playlist</span>
              </button>
            </div>
          </div>

          {/* Create Playlist Modal */}
          {showCreatePlaylist && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
              <div className='bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-foreground'>
                    Create New Playlist
                  </h3>
                  <button
                    onClick={() => setShowCreatePlaylist(false)}
                    className='p-1 text-muted-foreground hover:text-foreground'
                    aria-label='Close create playlist dialog'
                    title='Close dialog'
                  >
                    <X className='w-5 h-5' />
                  </button>
                </div>
                <input
                  type='text'
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  placeholder='Playlist name'
                  className='w-full p-3 border border-border rounded-lg bg-background text-foreground mb-4'
                  aria-label='Enter playlist name'
                  onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                />
                <div className='flex space-x-3'>
                  <button
                    onClick={handleCreatePlaylist}
                    className='flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
                    aria-label='Create new playlist'
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreatePlaylist(false)}
                    className='flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors'
                    aria-label='Cancel creating playlist'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {playlistsLoading ? (
            <div className='flex items-center justify-center py-16'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
            </div>
          ) : playlists.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6'>
                <List className='w-12 h-12 text-muted-foreground' />
              </div>
              <h2 className='text-xl font-semibold text-foreground mb-2'>
                No playlists yet
              </h2>
              <p className='text-muted-foreground mb-6 max-w-md'>
                Create your first playlist to organize your music
              </p>
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className='px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors'
              >
                Create Playlist
              </button>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
              {playlists.map(playlist => (
                <div key={playlist.id}>
                  <SpotlightCard
                    className='cursor-pointer'
                    spotlightColor={playlist.color}
                    onClick={() => handlePlaylistClick(playlist.id)}
                  >
                    <div className='flex items-center space-x-4'>
                      <div className='flex-shrink-0'>
                        <Image
                          src='/default-album-art.svg'
                          alt={playlist.name}
                          width={60}
                          height={60}
                          className='rounded-lg object-cover'
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-lg font-semibold text-foreground truncate'>
                          {playlist.name}
                        </h3>
                        <p className='text-sm text-muted-foreground'>
                          {playlist.songCount}{' '}
                          {playlist.songCount === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <button
                          className='p-2 text-muted-foreground hover:text-foreground transition-colors'
                          title={`Play ${playlist.name} playlist`}
                          aria-label={`Play ${playlist.name} playlist`}
                        >
                          <Play className='w-4 h-4' />
                        </button>
                        <button
                          className='p-2 text-muted-foreground hover:text-foreground transition-colors'
                          title={`View ${playlist.name} playlist songs`}
                          aria-label={`View ${playlist.name} playlist songs`}
                        >
                          <List className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  </SpotlightCard>

                  {/* Playlist Songs */}
                  {selectedPlaylist === playlist.id && (
                    <div className='mt-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden'>
                      <div className='p-4 border-b border-border/50'>
                        <h4 className='font-semibold text-foreground'>
                          {playlist.name} Songs
                        </h4>
                      </div>
                      <div className='max-h-64 overflow-y-auto'>
                        {playlist.songs.map(
                          (song: MusicSong, index: number) => (
                            <div
                              key={song.id}
                              className='flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors group'
                            >
                              <div className='flex-shrink-0'>
                                {song.cover_url ? (
                                  <Image
                                    src={song.cover_url}
                                    alt={song.title}
                                    width={40}
                                    height={40}
                                    className='rounded-lg object-cover'
                                  />
                                ) : (
                                  <Image
                                    src='/default-album-art.svg'
                                    alt='Default album art'
                                    width={40}
                                    height={40}
                                    className='rounded-lg object-cover'
                                  />
                                )}
                              </div>
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-medium text-foreground truncate'>
                                  {song.title}
                                </p>
                                <p className='text-xs text-muted-foreground truncate'>
                                  {song.artist}
                                </p>
                                {song.album && (
                                  <p className='text-xs text-muted-foreground/70 truncate'>
                                    {song.album}
                                  </p>
                                )}
                              </div>
                              <div className='flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <PlayIconButton
                                  song={song}
                                  songIndex={
                                    song.source === 'local' ? index : undefined
                                  }
                                />
                                <button
                                  onClick={e => handleAddToQueue(e, song)}
                                  className='p-1 rounded-full transition-colors text-muted-foreground hover:text-foreground'
                                  title='Add to queue'
                                  aria-label={`Add ${song.title} to queue`}
                                >
                                  <PlusCircle size={12} />
                                </button>
                                <FavoriteButton
                                  songId={song.id}
                                  source={song.source}
                                  size={14}
                                />
                                <div className='flex items-center space-x-2'>
                                  <span className='text-xs text-muted-foreground font-mono'>
                                    {formatTime(song.duration || 0)}
                                  </span>
                                  <SourceBadge song={song} />
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
