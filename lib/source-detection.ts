/**
 * Utility functions for detecting song sources
 */

export interface SongWithSource {
  id: string;
  source?: string;
  stream_url?: string;
  cover_url?: string;
  external_id?: string;
}

/**
 * Detects the actual source of a song based on its properties
 * This is needed because some songs are stored with 'api' source but are actually from Saavn
 */
export function detectActualSource(
  song: SongWithSource
): 'local' | 'api' | 'ytmusic' | 'saavn' {
  // If source is explicitly set to ytmusic, trust it
  if (song.source === 'ytmusic') {
    return 'ytmusic';
  }

  // Check if it's a YouTube Music song by external_id or stream_url
  if (
    song.external_id?.startsWith('ytmusic_') ||
    song.stream_url?.includes('youtube.com/watch') ||
    song.stream_url?.includes('123tokyo.xyz') ||
    song.cover_url?.includes('ytimg.com') ||
    song.cover_url?.includes('googleusercontent.com')
  ) {
    return 'ytmusic';
  }

  // Check if it's a Saavn song by stream_url or cover_url
  if (
    song.stream_url?.includes('saavncdn.com') ||
    song.cover_url?.includes('saavncdn.com')
  ) {
    return 'saavn';
  }

  // If source is explicitly set to saavn, trust it
  if (song.source === 'saavn') {
    return 'saavn';
  }

  // Default to the original source or 'api' if not specified
  return (song.source as 'local' | 'api' | 'ytmusic' | 'saavn') || 'api';
}

/**
 * Gets the display name for a source
 */
export function getSourceDisplayName(
  source: 'local' | 'api' | 'ytmusic' | 'saavn'
): string {
  switch (source) {
    case 'local':
      return 'Local';
    case 'ytmusic':
      return 'YT';
    case 'saavn':
      return 'Saavn';
    case 'api':
    default:
      return 'API';
  }
}

/**
 * Gets the CSS classes for source badges
 */
export function getSourceBadgeClasses(
  source: 'local' | 'api' | 'ytmusic' | 'saavn'
): string {
  switch (source) {
    case 'local':
      return 'text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-full';
    case 'ytmusic':
      return 'text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full';
    case 'saavn':
      return 'text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full';
    case 'api':
    default:
      return 'text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full';
  }
}
