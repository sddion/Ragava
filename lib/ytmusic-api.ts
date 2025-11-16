// YouTube Music API integration for streaming songs
// Using ytmusic-api package for YouTube Music search and streaming

import { logger } from './logger';

// Import the YTMusic class - using dynamic import to handle ES modules
let YTMusic: typeof import('ytmusic-api').default | null = null;

// Lazy load the YouTube Music API
async function getYTMusicInstance() {
  if (!YTMusic) {
    try {
      const ytmusicModule = await import('ytmusic-api');
      YTMusic = ytmusicModule.default || ytmusicModule;
    } catch (error) {
      console.error('Failed to load ytmusic-api:', error);
      throw new Error('YouTube Music API not available');
    }
  }
  return YTMusic;
}

export interface YTMusicSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  cover_url: string;
  stream_url: string;
  source: 'ytmusic';
  preview_url?: string;
  release_date?: string;
  genre?: string;
  language?: string;
  videoId: string;
}

export interface YTMusicSearchResult {
  songs: YTMusicSong[];
  total: number;
  page: number;
}

// YouTube Music API response interface for unknown API response structure
interface FlexibleYTMusicResponse {
  videoId?: string;
  name?: string;
  title?: string;
  artist?: {
    name?: string;
    artistId?: string | null;
  };
  artists?: Array<{
    name?: string;
    artistId?: string | null;
  }>;
  album?: {
    name?: string;
    albumId?: string;
  } | null;
  duration?: number | string | null;
  thumbnails?: Array<{
    url: string;
    width: number;
    height: number;
  }>;

  // Alternative field names that might be present
  id?: string;
  video_id?: string;
  song_name?: string;
  track_name?: string;
  artist_name?: string;
  singer?: string;
  primary_artist?: string;
  length?: number | string;
  duration_ms?: number | string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  cover_image?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  album_name?: string;
  album_title?: string;

  [key: string]: unknown; // Allow additional unknown properties
}

class YouTubeMusicAPI {
  private ytmusic: InstanceType<typeof import('ytmusic-api').default> | null =
    null;
  private initialized = false;

  // Initialize YouTube Music API
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const YTMusicClass = await getYTMusicInstance();
      this.ytmusic = new YTMusicClass();
      await this.ytmusic.initialize();
      this.initialized = true;
      logger.info('✅ YouTube Music API initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize YouTube Music API:', error);
      throw new Error('YouTube Music API initialization failed');
    }
  }

  // Search for songs using YouTube Music API
  async searchSongs(
    query: string,
    page: number = 1,
    limit: number = 1000 // Increased default limit to show more results
  ): Promise<YTMusicSearchResult> {
    try {
      await this.initialize();

      logger.info('🔍 YouTube Music search:', query);

      const results = await this.ytmusic!.search(query);

      if (!results || !Array.isArray(results)) {
        logger.warn('No results from YouTube Music API');
        return { songs: [], total: 0, page };
      }

      logger.info(`📋 Found ${results.length} YouTube Music results`);

      // Transform and filter results - use a higher limit to get more results
      const songs: YTMusicSong[] = results
        .slice(0, Math.max(limit, 1000)) // Increased minimum limit
        .map((item: FlexibleYTMusicResponse, index: number) => {
          const transformed = this.transformYTMusicSong(item);
          if (!transformed) {
            console.warn(
              `YouTube Music result ${index} failed transformation:`,
              item
            );
          }
          return transformed;
        })
        .filter((song: YTMusicSong | null) => song !== null) as YTMusicSong[];

      logger.info(`✅ Transformed ${songs.length} YouTube Music songs`);

      return {
        songs,
        total: songs.length,
        page,
      };
    } catch (error) {
      console.error('❌ YouTube Music search error:', error);
      return { songs: [], total: 0, page };
    }
  }

  // Get song details and streaming URL
  async getSongDetails(videoId: string): Promise<YTMusicSong | null> {
    try {
      await this.initialize();

      logger.info('🎵 Getting YouTube Music song details:', videoId);

      const songDetails = await this.ytmusic!.getSong(videoId);

      if (!songDetails) {
        logger.warn('No song details found');
        return null;
      }

      // Since YouTube Music doesn't provide direct streaming URLs due to licensing,
      // we'll return the basic info and let the client handle playback via YouTube
      const transformed = this.transformYTMusicSongWithDetails(
        songDetails as FlexibleYTMusicResponse,
        videoId
      );

      if (transformed) {
        logger.info(
          '✅ YouTube Music song details retrieved:',
          transformed.title
        );
      }

      return transformed;
    } catch (error) {
      logger.error('❌ YouTube Music song details error:', error);
      return null;
    }
  }

  // Transform YouTube Music search result to our format
  private transformYTMusicSong(
    item: FlexibleYTMusicResponse
  ): YTMusicSong | null {
    try {
      // Try multiple possible videoId fields
      const videoId = item.videoId || item.id || item.video_id;
      const title =
        item.name || item.title || item.song_name || item.track_name;

      if (!videoId || !title) {
        console.warn('YouTube Music result missing videoId or title:', {
          videoId,
          title,
          item,
        });
        return null;
      }

      // Get artist name - try multiple possible fields
      let artistName = 'Unknown Artist';
      if (item.artist?.name) {
        artistName = item.artist.name;
      } else if (item.artists && item.artists.length > 0) {
        artistName = item.artists[0].name || 'Unknown Artist';
      } else if (item.artist_name) {
        artistName = item.artist_name;
      } else if (item.singer) {
        artistName = item.singer;
      } else if (item.primary_artist) {
        artistName = item.primary_artist;
      }

      // Get duration - try multiple possible fields
      let duration = 0;
      const durationValue = item.duration || item.length || item.duration_ms;
      if (typeof durationValue === 'number') {
        duration = durationValue;
      } else if (typeof durationValue === 'string') {
        duration = this.parseDuration(durationValue);
      }

      // Get best thumbnail - try multiple possible fields
      const thumbnails =
        item.thumbnails || item.images || item.cover_image || [];
      const coverUrl = this.getBestThumbnailUrl(thumbnails);

      return {
        id: `ytmusic_${videoId}`,
        title: this.cleanText(title),
        artist: this.cleanText(artistName),
        album:
          item.album?.name ||
          item.album_name ||
          item.album_title ||
          'Unknown Album',
        duration,
        cover_url: coverUrl,
        stream_url: `https://www.youtube.com/watch?v=${videoId}`, // YouTube URL for reference
        source: 'ytmusic',
        language: 'unknown',
        videoId,
        genre: 'unknown',
      };
    } catch (error) {
      console.error('Error transforming YouTube Music song:', error);
      return null;
    }
  }

  // Transform YouTube Music song details
  private transformYTMusicSongWithDetails(
    details: FlexibleYTMusicResponse,
    videoId: string
  ): YTMusicSong | null {
    try {
      const title = details.name || details.title || 'Unknown Title';
      const artist = details.artist?.name || 'Unknown Artist';
      const duration = details.duration || 0;

      // Get best thumbnail
      const thumbnails = details.thumbnails || [];
      const coverUrl = this.getBestThumbnailUrl(thumbnails);

      return {
        id: `ytmusic_${videoId}`,
        title: this.cleanText(title),
        artist: this.cleanText(artist),
        album: 'Unknown Album',
        duration:
          typeof duration === 'string'
            ? this.parseDuration(duration)
            : duration,
        cover_url: coverUrl,
        stream_url: `https://www.youtube.com/watch?v=${videoId}`, // YouTube URL for reference
        source: 'ytmusic',
        language: 'unknown',
        videoId,
        genre: 'unknown',
      };
    } catch (error) {
      console.error('Error transforming YouTube Music song details:', error);
      return null;
    }
  }

  // Get the best quality thumbnail
  private getBestThumbnailUrl(
    thumbnails: Array<{ url: string; width?: number; height?: number }>
  ): string {
    if (!thumbnails || thumbnails.length === 0) {
      return '/default-album-art.svg';
    }

    // Sort by resolution (width * height) and pick the best one
    const sortedThumbnails = thumbnails
      .filter(thumb => thumb.url && thumb.url.length > 0)
      .sort((a, b) => {
        const aRes = (a.width || 0) * (a.height || 0);
        const bRes = (b.width || 0) * (b.height || 0);
        return bRes - aRes;
      });

    return sortedThumbnails.length > 0
      ? sortedThumbnails[0].url
      : '/default-album-art.svg';
  }

  // Parse duration string to seconds
  private parseDuration(duration: string): number {
    if (!duration || typeof duration !== 'string') return 0;

    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }

    // Try to parse as seconds
    const seconds = parseInt(duration);
    return isNaN(seconds) ? 0 : seconds;
  }

  // Clean text by removing HTML entities and extra whitespace
  private cleanText(text: string): string {
    if (!text) return '';

    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  // Get trending songs (using popular search terms)
  async getTrendingSongs(limit: number = 1000): Promise<YTMusicSong[]> {
    // Increased default limit
    try {
      const trendingQueries = [
        'trending music 2024',
        'popular songs',
        'top hits',
        'viral songs',
        'new music',
      ];

      const randomQuery =
        trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
      const result = await this.searchSongs(randomQuery, 1, limit);

      return result.songs;
    } catch (error) {
      console.error('Error getting YouTube Music trending songs:', error);
      return [];
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      await this.initialize();

      // YouTube Music API might not have dedicated search suggestions
      // Return some basic suggestions based on the query
      const suggestions = [
        `${query} official`,
        `${query} lyrics`,
        `${query} remix`,
        `${query} cover`,
        `${query} acoustic`,
      ].filter(suggestion => suggestion.toLowerCase() !== query.toLowerCase());

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error getting YouTube Music search suggestions:', error);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return this.initialized;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const ytmusicAPI = new YouTubeMusicAPI();

export const isYTMusicSong = (songId: string): boolean => {
  return songId.startsWith('ytmusic_');
};

export const getOriginalVideoId = (songId: string): string => {
  return songId.replace('ytmusic_', '');
};

export const getYTMusicVideoUrl = (videoId: string): string => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};
