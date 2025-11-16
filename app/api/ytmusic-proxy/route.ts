import { NextRequest, NextResponse } from 'next/server';
import { ytmusicAPI, type YTMusicSong } from '@/lib/ytmusic-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');
  const videoId = searchParams.get('videoId');
  const limit = searchParams.get('limit');

  if (!action) {
    return NextResponse.json(
      { success: false, error: 'Missing action parameter' },
      { status: 400 }
    );
  }

  try {
    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'Missing query parameter for search' },
            { status: 400 }
          );
        }

        console.log('🔍 YouTube Music proxy search:', query);

        const searchResult = await ytmusicAPI.searchSongs(
          query,
          1,
          limit ? parseInt(limit) : 1000 // Increased limit to show more results
        );

        // Transform YTMusicSong to StreamableSong format for consistency
        const transformedSongs = searchResult.songs.map(
          (song: YTMusicSong) => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            cover_url: song.cover_url,
            stream_url: song.stream_url,
            source: song.source,
            preview_url: song.preview_url,
            release_date: song.release_date,
            genre: song.genre,
            language: song.language,
            videoId: song.videoId,
          })
        );

        return NextResponse.json({
          success: true,
          songs: transformedSongs,
          total: searchResult.total,
          page: searchResult.page,
        });

      case 'details':
        if (!videoId) {
          return NextResponse.json(
            { success: false, error: 'Missing videoId parameter for details' },
            { status: 400 }
          );
        }

        console.log('🎵 YouTube Music proxy details:', videoId);

        const songDetails = await ytmusicAPI.getSongDetails(videoId);

        if (!songDetails) {
          return NextResponse.json(
            { success: false, error: 'Song not found' },
            { status: 404 }
          );
        }

        // Transform to consistent format
        const transformedSong = {
          id: songDetails.id,
          title: songDetails.title,
          artist: songDetails.artist,
          album: songDetails.album,
          duration: songDetails.duration,
          cover_url: songDetails.cover_url,
          stream_url: songDetails.stream_url,
          source: songDetails.source,
          preview_url: songDetails.preview_url,
          release_date: songDetails.release_date,
          genre: songDetails.genre,
          language: songDetails.language,
          videoId: songDetails.videoId,
        };

        return NextResponse.json({
          success: true,
          song: transformedSong,
        });

      case 'trending':
        console.log('📈 YouTube Music proxy trending');

        const trendingSongs = await ytmusicAPI.getTrendingSongs(
          limit ? parseInt(limit) : 1000 // Increased limit to show more results
        );

        const transformedTrending = trendingSongs.map((song: YTMusicSong) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          cover_url: song.cover_url,
          stream_url: song.stream_url,
          source: song.source,
          preview_url: song.preview_url,
          release_date: song.release_date,
          genre: song.genre,
          language: song.language,
          videoId: song.videoId,
        }));

        return NextResponse.json({
          success: true,
          songs: transformedTrending,
          total: transformedTrending.length,
          page: 1,
        });

      case 'suggestions':
        if (!query) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing query parameter for suggestions',
            },
            { status: 400 }
          );
        }

        console.log('💡 YouTube Music proxy suggestions:', query);

        const suggestions = await ytmusicAPI.getSearchSuggestions(query);

        return NextResponse.json({
          success: true,
          suggestions,
        });

      case 'health':
        // Health check endpoint
        const isAvailable = await ytmusicAPI.isAvailable();

        return NextResponse.json({
          success: true,
          available: isAvailable,
          service: 'YouTube Music API',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ YouTube Music proxy error:', error);

    // Provide more specific error messages
    let errorMessage = 'YouTube Music API request failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        action,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint via POST (for manual testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, query, videoId, limit } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    // Reuse the same logic as GET but with POST body
    const searchParams = new URLSearchParams();
    if (action) searchParams.set('action', action);
    if (query) searchParams.set('query', query);
    if (videoId) searchParams.set('videoId', videoId);
    if (limit) searchParams.set('limit', limit.toString());

    const getRequest = new NextRequest(
      `${request.url}?${searchParams.toString()}`,
      { method: 'GET' }
    );

    return GET(getRequest);
  } catch (error) {
    console.error('❌ YouTube Music proxy POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
