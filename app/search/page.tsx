'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';
import Image from 'next/image';
import { Search, Play, Pause, Music, Filter, X } from 'lucide-react';

export default function SearchPage() {
  const {
    songs,
    currentSongIndex,
    isPlaying,
    playSelectedSong,
    playPause,
    searchResults,
    searchSongs,
    persistentSearchQuery,
    persistentSearchResults,
    persistentApiSearchResults,
    persistentLocalSearchResults,
    persistentSaavnSearchResults,
    persistentYTMusicSearchResults,
    setPersistentSearchQuery,
    setPersistentSearchResults,
    clearPersistentSearch,
    rehydratePersistentSearch,
  } = useMusicStore();

  const [searchQuery, setSearchQuery] = useState(persistentSearchQuery);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'songs' | 'artists' | 'albums'
  >('all');
  const [showFilters, setShowFilters] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const safeSongs = useMemo(() => songs || [], [songs]);

  // Rehydrate persistent search state on mount
  useEffect(() => {
    rehydratePersistentSearch();
  }, [rehydratePersistentSearch]);

  // Update local search query when persistent query changes
  useEffect(() => {
    setSearchQuery(persistentSearchQuery);
  }, [persistentSearchQuery]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Filter songs based on search query and selected filter
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return safeSongs;

    const query = searchQuery.toLowerCase();
    return safeSongs.filter(song => {
      const matchesQuery =
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        (song.album && song.album.toLowerCase().includes(query)) ||
        (song.genre && song.genre.toLowerCase().includes(query));

      switch (selectedFilter) {
        case 'songs':
          return matchesQuery;
        case 'artists':
          return song.artist.toLowerCase().includes(query);
        case 'albums':
          return song.album && song.album.toLowerCase().includes(query);
        default:
          return matchesQuery;
      }
    });
  }, [safeSongs, searchQuery, selectedFilter]);

  // Combine all search results from different sources
  const allSearchResults = useMemo(() => {
    const results = [];

    if (searchQuery.trim()) {
      // Use persistent local results if available, otherwise use filtered songs
      const localResults =
        persistentSearchResults.length > 0
          ? persistentSearchResults
          : filteredSongs;
      if (localResults.length > 0) {
        results.push(...localResults);
      }

      // Add local database results from API
      if (persistentLocalSearchResults.length > 0) {
        results.push(...persistentLocalSearchResults);
      }

      // Add API results
      if (persistentApiSearchResults.length > 0) {
        results.push(...persistentApiSearchResults);
      }

      // Add Saavn results
      if (persistentSaavnSearchResults.length > 0) {
        results.push(...persistentSaavnSearchResults);
      }

      // Add YouTube Music results
      if (persistentYTMusicSearchResults.length > 0) {
        results.push(...persistentYTMusicSearchResults);
      }
    }

    return results;
  }, [
    searchQuery,
    persistentSearchResults,
    filteredSongs,
    persistentLocalSearchResults,
    persistentApiSearchResults,
    persistentSaavnSearchResults,
    persistentYTMusicSearchResults,
  ]);

  // Get unique artists and albums for suggestions
  const uniqueArtists = useMemo(() => {
    const artists = [...new Set(safeSongs.map(song => song.artist))];
    return artists.filter(artist =>
      artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [safeSongs, searchQuery]);

  const uniqueAlbums = useMemo(() => {
    const albums = [
      ...new Set(safeSongs.map(song => song.album).filter(Boolean)),
    ];
    return albums.filter(
      album => album && album.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [safeSongs, searchQuery]);

  const handleSongClick = (index: number) => {
    const song = allSearchResults[index];
    if (!song) return;

    // Find the song in the main songs array
    const songIndex = songs.findIndex(s => s.id === song.id);
    if (songIndex !== -1) {
      if (songIndex === currentSongIndex) {
        playPause();
      } else {
        playSelectedSong(songIndex);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    setPersistentSearchQuery(query);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (query.trim()) {
      // Search local songs immediately (no debounce for local search)
      searchSongs(query);

      // Debounce API search to reduce excessive calls
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/search-all', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });

          if (response.ok) {
            const data = await response.json();
            const localSongs = data?.sources?.local?.songs || [];
            const apiSongs = data?.sources?.api?.songs || [];
            const saavnSongs = data?.sources?.saavn?.songs || [];
            const ytSongs = data?.sources?.ytmusic?.songs || [];

            // Save search results to persistent state
            setPersistentSearchResults({
              local: searchResults, // Use the current search results from the store
              api: apiSongs,
              localDb: localSongs,
              saavn: saavnSongs,
              ytmusic: ytSongs,
            });
          }
        } catch (error) {
          console.error('Error performing search:', error);
        }
      }, 500); // 500ms debounce
    } else {
      // Clear persistent results when search is empty
      clearPersistentSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    clearPersistentSearch();
  };

  return (
    <div className='min-h-screen bg-background'>
      <main className='container-responsive py-4 sm:py-6 lg:py-8 max-w-6xl pb-20'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl sm:text-4xl font-bold text-foreground mb-2'>
            Search
          </h1>
          <p className='text-muted-foreground'>
            Find your favorite songs, artists, and albums
          </p>
        </div>

        {/* Search Bar */}
        <div className='relative mb-6'>
          <div className='relative'>
            <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5' />
            <input
              type='text'
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder='Search for songs, artists, albums...'
              className='w-full pl-12 pr-12 py-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200'
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className='absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className='mb-6'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className='flex items-center space-x-2 px-4 py-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:bg-card/80 transition-colors'
            >
              <Filter className='w-4 h-4' />
              <span>Filters</span>
            </button>

            {searchQuery && (
              <p className='text-sm text-muted-foreground'>
                {allSearchResults.length} result
                {allSearchResults.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {showFilters && (
            <div className='mt-4 flex flex-wrap gap-2'>
              {[
                { key: 'all', label: 'All' },
                { key: 'songs', label: 'Songs' },
                { key: 'artists', label: 'Artists' },
                { key: 'albums', label: 'Albums' },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() =>
                    setSelectedFilter(
                      filter.key as 'all' | 'songs' | 'artists' | 'albums'
                    )
                  }
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedFilter === filter.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card/50 backdrop-blur-sm border border-border/50 text-foreground hover:bg-card/80'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery ? (
          <div className='space-y-6'>
            {/* Quick Suggestions */}
            {(uniqueArtists.length > 0 || uniqueAlbums.length > 0) && (
              <div className='space-y-4'>
                {uniqueArtists.length > 0 && (
                  <div>
                    <h3 className='text-lg font-semibold text-foreground mb-3'>
                      Artists
                    </h3>
                    <div className='flex flex-wrap gap-2'>
                      {uniqueArtists.map(artist => (
                        <button
                          key={artist}
                          onClick={() => setSearchQuery(artist)}
                          className='px-4 py-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:bg-card/80 transition-colors text-foreground'
                        >
                          {artist}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {uniqueAlbums.length > 0 && (
                  <div>
                    <h3 className='text-lg font-semibold text-foreground mb-3'>
                      Albums
                    </h3>
                    <div className='flex flex-wrap gap-2'>
                      {uniqueAlbums.map(album => (
                        <button
                          key={album}
                          onClick={() => setSearchQuery(album || '')}
                          className='px-4 py-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:bg-card/80 transition-colors text-foreground'
                        >
                          {album}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Songs Results */}
            <div>
              <h3 className='text-lg font-semibold text-foreground mb-4'>
                Songs
              </h3>
              {allSearchResults.length > 0 ? (
                <div className='space-y-2'>
                  {allSearchResults.map((song, index) => (
                    <div
                      key={song.id}
                      className='flex items-center space-x-4 p-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:bg-card/80 hover:border-border transition-all duration-200 cursor-pointer group'
                      onClick={() => handleSongClick(index)}
                    >
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

                        {/* Play/Pause Overlay */}
                        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center rounded-lg'>
                          <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                            {index === currentSongIndex && isPlaying ? (
                              <Pause className='w-4 h-4 text-white' />
                            ) : (
                              <Play className='w-4 h-4 text-white ml-0.5' />
                            )}
                          </div>
                        </div>

                        {/* Active Indicator */}
                        {index === currentSongIndex && (
                          <div className='absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center'>
                            <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                          </div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <h4 className='font-semibold text-foreground truncate'>
                          {song.title}
                        </h4>
                        <p className='text-muted-foreground text-sm truncate'>
                          {song.artist}
                        </p>
                        {song.album && (
                          <p className='text-muted-foreground text-xs truncate'>
                            {song.album}
                          </p>
                        )}
                      </div>

                      <div className='flex items-center space-x-3'>
                        <span className='text-sm text-muted-foreground font-mono'>
                          {formatTime(song.duration || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-12'>
                  <Music className='w-16 h-16 text-muted-foreground mx-auto mb-4' />
                  <h3 className='text-lg font-semibold text-foreground mb-2'>
                    No results found
                  </h3>
                  <p className='text-muted-foreground'>
                    Try searching for something else
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Browse All Music */
          <div>
            <h3 className='text-lg font-semibold text-foreground mb-4'>
              Browse All Music
            </h3>
            {filteredSongs.length > 0 ? (
              <div className='space-y-2'>
                {filteredSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className='flex items-center space-x-4 p-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:bg-card/80 hover:border-border transition-all duration-200 cursor-pointer group'
                    onClick={() => handleSongClick(index)}
                  >
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

                      {/* Play/Pause Overlay */}
                      <div className='absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center rounded-lg'>
                        <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                          {index === currentSongIndex && isPlaying ? (
                            <Pause className='w-4 h-4 text-white' />
                          ) : (
                            <Play className='w-4 h-4 text-white ml-0.5' />
                          )}
                        </div>
                      </div>

                      {/* Active Indicator */}
                      {index === currentSongIndex && (
                        <div className='absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center'>
                          <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                        </div>
                      )}
                    </div>

                    <div className='flex-1 min-w-0'>
                      <h4 className='font-semibold text-foreground truncate'>
                        {song.title}
                      </h4>
                      <p className='text-muted-foreground text-sm truncate'>
                        {song.artist}
                      </p>
                      {song.album && (
                        <p className='text-muted-foreground text-xs truncate'>
                          {song.album}
                        </p>
                      )}
                    </div>

                    <div className='flex items-center space-x-3'>
                      <span className='text-sm text-muted-foreground font-mono'>
                        {formatTime(song.duration || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <Music className='w-16 h-16 text-muted-foreground mx-auto mb-4' />
                <h3 className='text-lg font-semibold text-foreground mb-2'>
                  No music found
                </h3>
                <p className='text-muted-foreground mb-6'>
                  Search for music online to get started
                </p>
                <button
                  onClick={() =>
                    (
                      document.querySelector(
                        'input[type="text"]'
                      ) as HTMLInputElement
                    )?.focus()
                  }
                  className='px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors'
                >
                  Search Music
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
