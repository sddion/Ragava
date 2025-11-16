import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface YouTubeStreamRequest {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface YouTubeStreamResponse {
  success: boolean;
  songId?: string;
  streamUrl?: string;
  error?: string;
  cached?: boolean;
}

/**
 * SIMPLE & RELIABLE APPROACH FOR YOUTUBE MUSIC INTEGRATION
 *
 * Instead of trying to extract direct stream URLs (which is complex, unreliable,
 * and often breaks due to YouTube's constant changes), we'll use a proxy approach:
 *
 * 1. Creates a proxy URL that points to our YouTube proxy endpoint
 * 2. The proxy endpoint handles the actual streaming on-demand
 * 3. This works reliably and is Vercel-compatible
 */

export async function POST(
  request: NextRequest
): Promise<NextResponse<YouTubeStreamResponse>> {
  try {
    const body: YouTubeStreamRequest = await request.json();
    const { videoId, title, artist, album, duration, thumbnailUrl } = body;

    if (!videoId || !title || !artist) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: videoId, title, artist',
        },
        { status: 400 }
      );
    }

    logger.info(
      `🎵 Creating YouTube proxy for: ${videoId} - ${title} by ${artist}`
    );

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingSong } = await supabase
      .from('api_songs')
      .select('*')
      .eq('external_id', `ytmusic_${videoId}`)
      .eq('source', 'ytmusic')
      .single();

    if (existingSong) {
      logger.info(`📀 Song already exists in database: ${existingSong.id}`);
      return NextResponse.json({
        success: true,
        songId: existingSong.id,
        streamUrl: existingSong.stream_url,
        cached: true,
      });
    }

    // Create a proxy URL that will handle the YouTube stream
    // This is much more reliable than trying to extract direct URLs
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const streamUrl = `${baseUrl}/api/youtube-proxy/${videoId}`;

    // Get video metadata
    const coverUrl =
      thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const actualDuration = duration || 0;

    logger.info(`🎯 Created proxy stream URL: ${streamUrl}`);

    // Save song metadata to api_songs table
    const { data: songData, error: dbError } = await supabase
      .from('api_songs')
      .insert({
        external_id: `ytmusic_${videoId}`,
        title: title,
        artist: artist,
        album: album || 'YouTube Music',
        duration: actualDuration,
        stream_url: streamUrl,
        cover_url: coverUrl,
        source: 'ytmusic',
        language: 'unknown',
        release_date: new Date().getFullYear().toString(),
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to save song to database:', dbError);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    logger.info(`✅ YouTube proxy created successfully: ${songData.id}`);

    return NextResponse.json({
      success: true,
      songId: songData.id,
      streamUrl: streamUrl,
      cached: false,
    });
  } catch (error) {
    logger.error('YouTube stream creation error:', error);

    let errorMessage = 'Failed to create YouTube stream';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if song exists
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing videoId parameter',
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: song, error } = await supabase
      .from('api_songs')
      .select('*')
      .eq('external_id', `ytmusic_${videoId}`)
      .eq('source', 'ytmusic')
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Database query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: !!song,
      song: song || null,
    });
  } catch (error) {
    logger.error('YouTube stream status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Status check failed',
      },
      { status: 500 }
    );
  }
}
