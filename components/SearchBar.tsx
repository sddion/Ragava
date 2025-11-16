'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useMusicStore } from '@/store/musicStore';
import { SearchResultsSection } from './search/SearchResultsSection';
import type { StreamableSong } from '@/lib/music-api';

export default function SearchBar() {
  // All hooks must be called before any early returns
  const [isOpen, setIsOpen] = useState(false);
  const [localResults, setLocalResults] = useState<StreamableSong[]>([]);
  const [apiResults, setApiResults] = useState<StreamableSong[]>([]);
  const [saavnResults, setSaavnResults] = useState<StreamableSong[]>([]);
  const [ytmusicResults, setYtmusicResults] = useState<StreamableSong[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRehydratedRef = useRef(false);

  // Get store functions with safe defaults
  const store = useMusicStore();
  const {
    searchQuery = '',
    searchResults = [],
    setSearchQuery = () => {},
    searchSongs = () => {},
    setPersistentSearchQuery = () => {},
    setPersistentSearchResults = () => {},
    clearPersistentSearch = () => {},
    rehydratePersistentSearch = () => {},
    persistentSearchQuery = '',
    persistentSearchResults = [],
    persistentApiSearchResults = [],
    persistentLocalSearchResults = [],
    persistentSaavnSearchResults = [],
    persistentYTMusicSearchResults = [],
  } = store || {};

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, []);

  // Rehydrate persistent search state on mount (only once)
  useEffect(() => {
    if (isRehydratedRef.current) return;
    isRehydratedRef.current = true;

    try {
      if (typeof rehydratePersistentSearch === 'function') {
        rehydratePersistentSearch();
      }

      if (persistentSearchQuery) {
        if (typeof setSearchQuery === 'function') {
          setSearchQuery(persistentSearchQuery);
        }
        setIsOpen(true);

        // Restore search results
        if (persistentLocalSearchResults.length > 0) {
          setLocalResults(persistentLocalSearchResults);
        }
        if (persistentApiSearchResults.length > 0) {
          setApiResults(persistentApiSearchResults);
        }
        if (persistentSaavnSearchResults.length > 0) {
          setSaavnResults(persistentSaavnSearchResults);
        }
        if (persistentYTMusicSearchResults.length > 0) {
          setYtmusicResults(persistentYTMusicSearchResults);
        }

        // Calculate total results
        const total =
          persistentSearchResults.length +
          persistentLocalSearchResults.length +
          persistentApiSearchResults.length +
          persistentSaavnSearchResults.length +
          persistentYTMusicSearchResults.length;
        setTotalResults(total);
      }
    } catch (error) {
      console.error('Failed to rehydrate persistent search state:', error);
    }
  }, [
    persistentSearchQuery,
    persistentSearchResults.length,
    persistentApiSearchResults,
    persistentLocalSearchResults,
    persistentSaavnSearchResults,
    persistentYTMusicSearchResults,
    rehydratePersistentSearch,
    setSearchQuery,
  ]);

  // Early return if store is not available (after all hooks)
  if (!store) {
    console.warn('MusicStore not available');
    return null;
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setPersistentSearchQuery(query);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (query.trim()) {
      // Search local songs immediately
      if (typeof searchSongs === 'function') {
        searchSongs(query);
      }
      setIsOpen(true);
      setIsSearching(true);

      // Debounce API search to reduce excessive calls (increased to 800ms for better performance)
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

            // Extract results from the new response structure
            const localSongs = data?.sources?.local?.songs || [];
            const apiSongs = data?.sources?.api?.songs || [];
            const saavnSongs = data?.sources?.saavn?.songs || [];
            const ytSongs = data?.sources?.ytmusic?.songs || [];

            // Update state
            setLocalResults(localSongs);
            setApiResults(apiSongs);
            setSaavnResults(saavnSongs);
            setYtmusicResults(ytSongs);

            // Calculate total results
            const total =
              localSongs.length +
              apiSongs.length +
              saavnSongs.length +
              ytSongs.length;
            setTotalResults(total);

            // Persist search results
            if (typeof setPersistentSearchResults === 'function') {
              setPersistentSearchResults({
                local: searchResults,
                api: apiSongs,
                localDb: localSongs,
                saavn: saavnSongs,
                ytmusic: ytSongs,
              });
            }

            console.log('📊 Search results summary:', {
              local: localSongs.length,
              api: apiSongs.length,
              saavn: saavnSongs.length,
              ytmusic: ytSongs.length,
              total: total,
            });
          } else {
            console.error('Search API error:', response.status);
          }
        } catch (error) {
          console.error('Error searching all sources:', error);
          // Clear results on error
          setLocalResults([]);
          setApiResults([]);
          setSaavnResults([]);
          setYtmusicResults([]);
          setTotalResults(0);
        } finally {
          setIsSearching(false);
        }
      }, 800); // 800ms debounce for better performance
    } else {
      // Clear search
      setIsOpen(false);
      setLocalResults([]);
      setApiResults([]);
      setSaavnResults([]);
      setYtmusicResults([]);
      setTotalResults(0);
      setIsSearching(false);

      if (typeof clearPersistentSearch === 'function') {
        clearPersistentSearch();
      }
    }
  };

  const handleClearSearch = () => {
    if (typeof setSearchQuery === 'function') {
      setSearchQuery('');
    }
    setIsOpen(false);
    if (typeof clearPersistentSearch === 'function') {
      clearPersistentSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handlePlay = () => {
    // This will be called when a song starts playing
    // Could be used for analytics or other side effects
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const hasResults =
    searchResults.length > 0 ||
    localResults.length > 0 ||
    apiResults.length > 0 ||
    saavnResults.length > 0 ||
    ytmusicResults.length > 0;

  return (
    <div ref={searchRef} className='search-container'>
      <div className='relative'>
        <Search className='search-icon w-4 h-4 sm:w-5 sm:h-5' />
        <input
          type='text'
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Search for songs, artists, or albums...'
          className='search-input text-sm sm:text-base'
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className='absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
            aria-label='Clear search'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {isOpen && hasResults && (
        <div className='search-results'>
          {/* Total Results Header */}
          {totalResults > 0 && (
            <div className='px-3 py-3 text-sm font-semibold text-foreground border-b-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5'>
              <div className='flex items-center gap-2'>
                <span className='text-lg'>🎵</span>
                <span>
                  Found{' '}
                  <span className='text-primary font-bold'>{totalResults}</span>{' '}
                  results for
                </span>
                <span className='text-primary font-bold'>
                  &quot;{searchQuery}&quot;
                </span>
              </div>
            </div>
          )}

          {/* Local Songs (from searchSongs) */}
          {searchResults.length > 0 && (
            <SearchResultsSection
              title='Your Library'
              source='local'
              songs={searchResults.map(song => ({
                id: song.id,
                title: song.title,
                artist: song.artist,
                album: song.album || '',
                duration: song.duration || 0,
                cover_url: song.cover_url || '/default-album-art.svg',
                stream_url: song.file_url || '',
                source: song.source || 'local',
                genre: song.genre,
                release_date: song.year?.toString(),
              }))}
              onPlay={handlePlay}
              onClose={handleClose}
            />
          )}

          {/* Local Database Songs */}
          {localResults.length > 0 && (
            <SearchResultsSection
              title='Your Library'
              source='local'
              songs={localResults}
              onPlay={handlePlay}
              onClose={handleClose}
            />
          )}

          {/* API Songs */}
          {apiResults.length > 0 && (
            <SearchResultsSection
              title='Saved API Songs'
              source='api'
              songs={apiResults}
              onPlay={handlePlay}
              onClose={handleClose}
            />
          )}

          {/* JioSaavn Songs */}
          {saavnResults.length > 0 && (
            <SearchResultsSection
              title='JioSaavn'
              source='saavn'
              songs={saavnResults}
              onPlay={handlePlay}
              onClose={handleClose}
            />
          )}

          {/* YouTube Music Songs */}
          {ytmusicResults.length > 0 && (
            <SearchResultsSection
              title='YouTube Music'
              source='ytmusic'
              songs={ytmusicResults}
              onPlay={handlePlay}
              onClose={handleClose}
            />
          )}

          {/* Loading indicator */}
          {isSearching && (
            <div className='p-3 text-center text-muted-foreground text-sm'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2'></div>
              Searching online...
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {isOpen && searchQuery && !hasResults && !isSearching && (
        <div className='search-results p-4'>
          <p className='text-muted-foreground text-center text-sm'>
            No songs found for &quot;{searchQuery}&quot;
          </p>
          <p className='text-muted-foreground text-center text-xs mt-1'>
            Try searching for any song online
          </p>
        </div>
      )}
    </div>
  );
}
