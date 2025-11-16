'use client';

import { useMusicStore, type MusicSong } from '@/store/musicStore';
import Image from 'next/image';
import { Play, Clock, TrendingUp, Star, Music } from 'lucide-react';
import { useState, useEffect } from 'react';
import FavoriteButton from './FavoriteButton';

interface RecommendationSection {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  songs: MusicSong[];
  color: string;
}

interface TrendingSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  file_url: string;
  cover_url?: string;
  genre?: string;
  year?: number;
  play_count: number;
  last_played?: string;
  created_at: string;
  trending_play_count: number;
  trending_ranking: number;
  trending_date: string;
  source?: 'local' | 'api' | 'ytmusic' | 'saavn';
}

interface RecommendationsProps {
  allSongs?: MusicSong[];
}

export default function Recommendations({ allSongs }: RecommendationsProps) {
  const { songs, apiSongs, playSelectedSong, playApiSong } = useMusicStore();
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [trendingSongs, setTrendingSongs] = useState<TrendingSong[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  // Use provided allSongs or combine local and API songs
  const safeSongs = songs || [];
  const safeApiSongs = apiSongs || [];
  const combinedSongs = allSongs || [...safeSongs, ...safeApiSongs];

  // Fisher-Yates shuffle algorithm for randomizing songs (used in home page)
  // const shuffleArray = <T,>(array: T[]): T[] => {
  //   const shuffled = [...array];
  //   for (let i = shuffled.length - 1; i > 0; i--) {
  //     const j = Math.floor(Math.random() * (i + 1));
  //     [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  //   }
  //   return shuffled;
  // };

  // Create randomized song pools for different sections
  const getRandomizedSongs = (count: number, seed?: string): MusicSong[] => {
    if (combinedSongs.length === 0) return [];

    // Use seed for consistent randomization (based on section and time)
    const randomSeed = seed
      ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
      : Date.now();
    const seededRandom = (min: number, max: number) => {
      const x = Math.sin(randomSeed) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    // Create a shuffled copy with seeded randomization
    const shuffled = [...combinedSongs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = seededRandom(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  };

  // Fetch trending songs
  useEffect(() => {
    const fetchTrendingSongs = async () => {
      try {
        setIsLoadingTrending(true);
        const response = await fetch('/api/trending?limit=6');
        if (response.ok) {
          const data = await response.json();
          setTrendingSongs(data.songs || []);
        }
      } catch (error) {
        console.error('Error fetching trending songs:', error);
      } finally {
        setIsLoadingTrending(false);
      }
    };

    fetchTrendingSongs();
  }, []);

  // Generate personalized recommendations based on user data
  const getTimeBasedRecommendations = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return {
        title: 'Morning Vibes',
        subtitle: 'Perfect for starting your day',
      };
    } else if (hour >= 12 && hour < 17) {
      return { title: 'Afternoon Energy', subtitle: 'Keep the momentum going' };
    } else if (hour >= 17 && hour < 21) {
      return {
        title: 'Evening Chill',
        subtitle: 'Wind down with these tracks',
      };
    } else {
      return {
        title: 'Late Night Vibes',
        subtitle: 'Deep tracks for the night owls',
      };
    }
  };

  const timeBased = getTimeBasedRecommendations();

  // Convert trending songs to MusicSong format for consistency
  const trendingMusicSongs: MusicSong[] = trendingSongs.map(trending => ({
    id: trending.id,
    title: trending.title,
    artist: trending.artist,
    album: trending.album,
    duration: trending.duration,
    file_url: trending.file_url,
    cover_url: trending.cover_url,
    genre: trending.genre,
    year: trending.year,
    play_count: trending.play_count,
    last_played: trending.last_played,
    created_at: trending.created_at,
    updated_at: trending.created_at,
    source: (trending.source || 'local') as
      | 'local'
      | 'api'
      | 'ytmusic'
      | 'saavn',
  }));

  const recommendations: RecommendationSection[] = [
    {
      title: timeBased.title,
      subtitle: timeBased.subtitle,
      icon: <Clock className='w-5 h-5' />,
      songs: getRandomizedSongs(
        6,
        `time-${timeBased.title}-${new Date().getDate()}`
      ),
      color: 'rgba(34, 197, 94, 0.2)',
    },
    {
      title: 'Made for You',
      subtitle: 'Based on your listening history',
      icon: <Star className='w-5 h-5' />,
      songs: getRandomizedSongs(6, `made-for-you-${new Date().getDate()}`),
      color: 'rgba(236, 72, 153, 0.2)',
    },
    {
      title: 'Trending Now',
      subtitle: "What's popular right now",
      icon: <TrendingUp className='w-5 h-5' />,
      songs: isLoadingTrending
        ? getRandomizedSongs(6, `trending-fallback-${new Date().getDate()}`)
        : trendingMusicSongs,
      color: 'rgba(14, 165, 233, 0.2)',
    },
  ];

  const handleSongClick = async (index: number, sectionTitle: string) => {
    if (sectionTitle === 'Trending Now' && !isLoadingTrending) {
      // For trending songs, find the song in the combined songs array
      const trendingSong = trendingMusicSongs[index];
      if (trendingSong) {
        // Check if song is in local songs table
        const localSongIndex = songs.findIndex(s => s.id === trendingSong.id);
        if (localSongIndex !== -1) {
          playSelectedSong(localSongIndex);
          return;
        }

        // Check if song is in api_songs table
        const apiSong = apiSongs.find(s => s.id === trendingSong.id);
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

        console.warn(
          'Trending song not found in database:',
          trendingSong.title
        );
      }
    } else {
      // For other sections (Time Based Recommendation, Made for You)
      const section = recommendations.find(rec => rec.title === sectionTitle);
      if (section) {
        const song = section.songs[index];
        if (song) {
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
        }
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className='space-y-8'>
      {recommendations.map(section => (
        <div key={section.title} className='space-y-4'>
          <div className='flex items-center space-x-3'>
            <div
              className={`recommendation-icon ${
                section.title.includes('Morning') ||
                section.title.includes('Afternoon')
                  ? 'recommendation-icon-morning'
                  : section.title.includes('Evening') ||
                      section.title.includes('Night')
                    ? 'recommendation-icon-afternoon'
                    : 'recommendation-icon-trending'
              }`}
            >
              {section.icon}
            </div>
            <div>
              <h3 className='text-xl font-bold text-foreground'>
                {section.title}
              </h3>
              <p className='text-sm text-muted-foreground'>
                {section.subtitle}
              </p>
            </div>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
            {section.songs.map((song, index) => (
              <div
                key={song.id}
                className='bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-3 hover:bg-card/80 hover:border-border transition-all duration-200 cursor-pointer group'
                onClick={() => handleSongClick(index, section.title)}
                onMouseEnter={() => setHoveredSong(song.id)}
                onMouseLeave={() => setHoveredSong(null)}
              >
                <div className='relative mb-3'>
                  <div className='aspect-square w-full rounded-lg overflow-hidden bg-muted'>
                    {song.cover_url ? (
                      <Image
                        src={song.cover_url}
                        alt={song.title}
                        fill
                        className='object-cover transition-transform duration-300 group-hover:scale-105'
                        sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw'
                      />
                    ) : (
                      <Image
                        src='/default-album-art.svg'
                        alt='Default album art'
                        fill
                        className='object-cover transition-transform duration-300 group-hover:scale-105'
                        sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw'
                      />
                    )}
                  </div>

                  {/* Play Button Overlay */}
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center rounded-lg'>
                    <div
                      className={`transition-all duration-200 ${
                        hoveredSong === song.id
                          ? 'opacity-100 scale-110'
                          : 'opacity-0 scale-90'
                      }`}
                    >
                      <div className='w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg'>
                        <Play className='w-5 h-5 text-white ml-0.5' />
                      </div>
                    </div>
                  </div>

                  {/* Favorite Button */}
                  <div className='absolute top-2 right-2'>
                    <FavoriteButton
                      songId={song.id}
                      size={14}
                      className='text-white/70 hover:text-red-500 hover:bg-red-500/20'
                    />
                  </div>
                </div>

                <div className='space-y-1'>
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

                <div className='flex items-center justify-between mt-2'>
                  <span className='text-xs text-muted-foreground font-mono'>
                    {formatTime(song.duration || 0)}
                  </span>
                  {song.genre && (
                    <span className='text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full'>
                      {song.genre}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {combinedSongs.length === 0 && (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6'>
            <Music className='w-12 h-12 text-muted-foreground' />
          </div>
          <h2 className='text-xl font-semibold text-foreground mb-2'>
            No recommendations yet
          </h2>
          <p className='text-muted-foreground mb-6 max-w-md'>
            Start listening to music to get personalized recommendations
          </p>
        </div>
      )}
    </div>
  );
}
