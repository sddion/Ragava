// Music API integration for streaming songs
// Using JioSaavn API from https://saavn.dev/ for music search and streaming

import { logger } from './logger';

export interface StreamableSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  cover_url: string;
  stream_url: string;
  source: 'api' | 'local' | 'ytmusic' | 'saavn';
  preview_url?: string;
  release_date?: string;
  genre?: string;
  language?: string;
  videoId?: string;
}

export interface SearchResult {
  songs: StreamableSong[];
  total: number;
  page: number;
}

// JioSaavn API response interfaces based on saavn.dev documentation
interface SaavnSearchResponse {
  success?: boolean;
  data?: {
    results?: SaavnSong[];
    total?: number;
    start?: number;
  };
  results?: SaavnSong[];
  songs?: {
    results: SaavnSong[];
  };
  albums?: {
    results: Array<{
      id: string;
      name: string;
      year?: string;
      image?: Array<{ quality: string; link: string }>;
    }>;
  };
  playlists?: {
    results: Array<{
      id: string;
      name: string;
      description?: string;
      image?: Array<{ quality: string; link: string }>;
    }>;
  };
  artists?: {
    results: Array<{
      id: string;
      name: string;
      image?: Array<{ quality: string; link: string }>;
    }>;
  };
}

interface SaavnSong {
  id?: string;
  song_id?: string;
  track_id?: string;
  name?: string;
  title?: string;
  song_name?: string;
  track_name?: string;
  primaryArtists?: string;
  artist?: string;
  artists?:
    | {
        primary?: Array<{
          name: string;
        }>;
        featured?: Array<{
          name: string;
        }>;
        all?: Array<{
          name: string;
        }>;
      }
    | string
    | Array<{
        name: string;
      }>;
  singer?: string;
  album?: {
    name: string;
  };
  album_name?: string;
  duration?: string;
  length?: string;
  duration_ms?: string;
  image?: Array<{
    quality: string;
    link: string;
    url?: string;
  }>;
  images?: Array<{
    quality: string;
    link: string;
  }>;
  cover_image?: Array<{
    quality: string;
    link: string;
  }>;
  thumbnail?: Array<{
    quality: string;
    link: string;
  }>;
  downloadUrl?: Array<{
    quality: string;
    link: string;
    url?: string;
  }>;
  download_url?: Array<{
    quality: string;
    link: string;
  }>;
  media_url?: Array<{
    quality: string;
    link: string;
  }>;
  audio_url?: Array<{
    quality: string;
    link: string;
  }>;
  release_date?: string;
  genre?: string;
  category?: string;
  language?: string;
  year?: string;
}

interface SaavnSongDetailsResponse {
  success?: boolean;
  data?: SaavnSong | SaavnSong[];
  id?: string;
  name?: string;
  primaryArtists?: string;
  album?: {
    name: string;
  };
  duration?: string;
  image?: Array<{
    quality: string;
    link: string;
  }>;
  downloadUrl?: Array<{
    quality: string;
    link: string;
  }>;
  language?: string;
  year?: string;
}

class MusicAPI {
  private baseUrl = 'https://saavn.dev/api';
  private fallbackApis = [
    'https://jiosaavn-api.vercel.app',
    'https://jiosaavn-api.herokuapp.com',
    'https://jiosaavn-api.cyclic.app',
    'https://jiosaavn-api.onrender.com',
    'https://saavn.dev/api',
  ];

  private getProxyOrigin(): string {
    // On the browser, use relative path to avoid CORS and mixed-origin redirects
    if (typeof window !== 'undefined') {
      return '';
    }
    // On the server, prefer explicit base URL, then Vercel URL, fallback to localhost
    const envUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      '';
    return envUrl || 'http://localhost:3000';
  }

  // Search for songs using multiple API endpoints with fallback
  async searchSongs(
    query: string,
    page: number = 1,
    limit: number = 1000 // Increased default limit to show more results
  ): Promise<SearchResult> {
    const searchEndpoints = [
      // Try saavn.dev API first (correct endpoints)
      `${this.baseUrl}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
      `${this.baseUrl}/search?query=${encodeURIComponent(query)}`,
      // Try working fallback endpoints
      ...this.fallbackApis.map(
        base => `${base}/search?query=${encodeURIComponent(query)}`
      ),
      ...this.fallbackApis.map(
        base => `${base}/search/all?query=${encodeURIComponent(query)}`
      ),
      ...this.fallbackApis.map(
        base => `${base}/search/songs?query=${encodeURIComponent(query)}`
      ),
    ];

    for (const searchUrl of searchEndpoints) {
      try {
        logger.info('Trying API endpoint:', searchUrl);

        // Always use proxy to avoid CORS issues (absolute URL on server)
        const proxyUrl = `${this.getProxyOrigin()}/api/music-proxy?endpoint=${encodeURIComponent(searchUrl.split('?')[0])}&query=${encodeURIComponent(query)}&limit=${limit}`;
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
          logger.warn(
            `API endpoint failed: ${response.status} ${response.statusText}`
          );
          continue;
        }

        const data: SaavnSearchResponse = await response.json();
        logger.info('API Response received from:', searchUrl);

        // Handle different response formats
        let songsData: SaavnSong[] = [];

        // Handle new saavn.dev API response structure
        if (data.success && data.data) {
          if (data.data.results && Array.isArray(data.data.results)) {
            songsData = data.data.results;
          } else if (Array.isArray(data.data)) {
            songsData = data.data;
          }
        } else if (data.results && Array.isArray(data.results)) {
          songsData = data.results;
        } else if (data.songs?.results && Array.isArray(data.songs.results)) {
          songsData = data.songs.results;
        } else if (data.data?.results && Array.isArray(data.data.results)) {
          songsData = data.data.results;
        } else if (Array.isArray(data)) {
          songsData = data;
        }

        if (songsData.length === 0) {
          logger.warn('No songs found in response, trying next endpoint');
          continue;
        }

        const songs: StreamableSong[] = songsData
          .slice(0, limit)
          .map((item: SaavnSong) => this.transformSaavnSong(item))
          .filter((song: StreamableSong | null) => song !== null);

        logger.info('Successfully found', songs.length, 'songs');
        return {
          songs,
          total: songs.length,
          page,
        };
      } catch (error) {
        logger.error(
          `Error with endpoint ${searchUrl}:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }
    }

    logger.error('All API endpoints failed');
    return { songs: [], total: 0, page };
  }

  // Get song details and streaming URL using the official API
  async getSongDetails(songId: string): Promise<StreamableSong | null> {
    const detailEndpoints = [
      `${this.baseUrl}/songs?ids=${encodeURIComponent(songId)}`,
      `${this.baseUrl}/songs/${encodeURIComponent(songId)}`,
      `${this.baseUrl}/songs?id=${encodeURIComponent(songId)}`,
      ...this.fallbackApis.map(
        api => `${api}/songs?id=${encodeURIComponent(songId)}`
      ),
    ];

    for (const detailsUrl of detailEndpoints) {
      try {
        logger.info('Trying song details endpoint:', detailsUrl);

        // Always use proxy (absolute URL on server)
        const proxyUrl = `${this.getProxyOrigin()}/api/music-proxy?endpoint=${encodeURIComponent(detailsUrl.split('?')[0])}&songId=${encodeURIComponent(songId)}`;
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          logger.warn(
            `Song details endpoint failed: ${response.status} ${response.statusText}`
          );
          continue;
        }

        const data: SaavnSongDetailsResponse = await response.json();

        // Handle new saavn.dev API response structure
        let songData: SaavnSong | null = null;
        if (data.success && data.data) {
          if (Array.isArray(data.data) && data.data.length > 0) {
            songData = data.data[0];
          } else if (typeof data.data === 'object' && 'id' in data.data) {
            songData = data.data;
          }
        } else if (data.id) {
          songData = data;
        }

        if (!songData || !songData.id) {
          logger.warn('No song ID in response, trying next endpoint');
          continue;
        }

        logger.info('Successfully got song details from:', detailsUrl);
        return this.transformSaavnSong(songData);
      } catch (error) {
        logger.error(
          `Error with song details endpoint ${detailsUrl}:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }
    }

    logger.error('All song details endpoints failed');
    return null;
  }

  // Transform API response to our format (handles different API formats)
  private transformSaavnSong(item: SaavnSong): StreamableSong | null {
    try {
      // Handle different API response formats
      const songId = item.id || item.song_id || item.track_id;
      const songName =
        item.name || item.title || item.song_name || item.track_name;
      const artistName =
        typeof item.artists === 'object' &&
        item.artists &&
        'primary' in item.artists
          ? item.artists.primary?.[0]?.name
          : item.primaryArtists || item.artist || item.artists || item.singer;
      const albumName = item.album?.name || item.album_name || item.album;
      const songDuration = item.duration || item.length || item.duration_ms;
      const downloadUrls =
        item.downloadUrl ||
        item.download_url ||
        item.media_url ||
        item.audio_url;
      const images =
        item.image || item.images || item.cover_image || item.thumbnail;

      if (!songId || !songName) {
        return null;
      }

      // Get the best quality image
      const coverUrl = this.getBestImageUrl(images || []);

      // Get the best quality download URL (prefer 320kbps)
      const streamUrl = this.getBestDownloadUrl(downloadUrls || []);

      // Format artist name
      let formattedArtist = 'Unknown Artist';
      if (Array.isArray(artistName)) {
        formattedArtist = artistName
          .map(artist =>
            typeof artist === 'string' ? artist : artist.name || artist
          )
          .join(', ');
      } else if (typeof artistName === 'string') {
        formattedArtist = artistName;
      }

      return {
        id: `api_${songId}`,
        title: this.decodeHtmlEntities(songName),
        artist: this.decodeHtmlEntities(formattedArtist),
        album: albumName
          ? this.decodeHtmlEntities(
              typeof albumName === 'string'
                ? albumName
                : albumName.name || 'Unknown Album'
            )
          : 'Unknown Album',
        duration: this.parseDuration(songDuration || '0'),
        cover_url: coverUrl,
        stream_url: streamUrl,
        source: 'api',
        language: item.language || 'unknown',
        release_date: item.year || item.release_date,
        genre: item.genre || item.category || item.language || 'unknown',
      };
    } catch (error) {
      logger.error('Error transforming song:', error);
      return null;
    }
  }

  // Get the best quality image URL
  private getBestImageUrl(
    images: string | Array<{ url?: string; link?: string; quality: string }>
  ): string {
    if (!images) return '/default-album-art.svg';

    // Handle string URL
    if (typeof images === 'string') {
      return images;
    }

    // Handle array of image objects
    if (Array.isArray(images)) {
      if (images.length === 0) return '/default-album-art.svg';

      // Prefer higher quality images
      const qualityOrder = ['500x500', '300x300', '150x150', '50x50'];

      for (const quality of qualityOrder) {
        const image = images.find(img => img.quality === quality);
        if (image && image.link) {
          return image.link;
        }
      }

      return images[0].link || images[0].url || '/default-album-art.svg';
    }

    return '/default-album-art.svg';
  }

  // Get the best quality download URL (prefer highest quality available)
  private getBestDownloadUrl(
    downloadUrls:
      | string
      | Array<{ url?: string; link?: string; quality: string }>
  ): string {
    if (!downloadUrls) return '';

    // Handle string URL
    if (typeof downloadUrls === 'string') {
      return downloadUrls;
    }

    // Handle array of download objects
    if (Array.isArray(downloadUrls)) {
      if (downloadUrls.length === 0) return '';

      // Quality priority order (highest to lowest)
      const qualityPriority = [
        '320kbps',
        '256kbps',
        '192kbps',
        '160kbps',
        '128kbps',
        '96kbps',
        '64kbps',
        '48kbps',
        '32kbps',
        '16kbps',
        '12kbps',
      ];

      // Find the highest quality available
      for (const priority of qualityPriority) {
        const download = downloadUrls.find(
          url =>
            url.quality && url.quality.toLowerCase() === priority.toLowerCase()
        );
        if (download) {
          // Try different URL property names
          const url = download.url || download.link;
          if (url) {
            logger.info(`🎵 Selected ${priority} quality for streaming`);
            return url;
          }
        }
      }

      const firstDownload = downloadUrls[0];
      if (firstDownload) {
        const fallbackUrl = firstDownload.url || firstDownload.link;
        if (fallbackUrl) {
          logger.info(
            `🎵 Using fallback quality: ${firstDownload.quality || 'unknown'}`
          );
          return fallbackUrl;
        }
      }
    }

    return '';
  }

  // Parse duration from string to seconds
  private parseDuration(duration: string): number {
    if (!duration) return 0;

    // Handle different duration formats
    if (typeof duration === 'number') {
      return duration;
    }

    // Parse "3:45" format
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }

    // Parse seconds directly
    const seconds = parseInt(duration);
    return isNaN(seconds) ? 0 : seconds;
  }

  // Decode HTML entities
  private decodeHtmlEntities(text: string): string {
    if (!text) return '';

    // Only use document on client side to prevent hydration issues
    if (typeof window === 'undefined') {
      // Server-side fallback - basic HTML entity decoding
      return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    }

    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Get trending songs (using search with popular terms)
  async getTrendingSongs(limit: number = 1000): Promise<StreamableSong[]> {
    // Increased default limit
    try {
      // Search for popular terms to get trending content
      const trendingQueries = [
        'bollywood',
        'hindi',
        'english',
        'punjabi',
        'tamil',
      ];
      const randomQuery =
        trendingQueries[Math.floor(Math.random() * trendingQueries.length)];

      const result = await this.searchSongs(randomQuery, 1, limit);
      return result.songs;
    } catch (error) {
      logger.error('Error getting trending songs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const musicAPI = new MusicAPI();

export const isApiSong = (songId: string): boolean => {
  return songId.startsWith('api_');
};

export const getOriginalSongId = (songId: string): string => {
  return songId.replace('api_', '');
};
