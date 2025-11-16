import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { convertYouTubeVideo } from '@/lib/youtube-conversion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_id, title, artist, album, duration, thumbnail_url } = body;

    if (!video_id || !title || !artist) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: video_id, title, artist',
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const externalId = `ytmusic_${video_id}`;
    const { data: existingSong } = await supabase
      .from('api_songs')
      .select('id, title, artist')
      .eq('external_id', externalId)
      .single();

    if (existingSong) {
      return NextResponse.json(
        {
          success: false,
          error: 'Song already exists in database',
          existingSong,
        },
        { status: 409 }
      );
    }

    // Use the new conversion system with primary/fallback approach
    console.log('🎵 Using new conversion system for:', title);

    const convertData = await convertYouTubeVideo(
      video_id,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );

    const { success, stream_url, file_url, method, stored, error } =
      convertData;

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: error || 'Conversion failed',
        },
        { status: 500 }
      );
    }

    console.log('Conversion completed:', {
      method,
      stream_url,
      file_url,
      stored,
      success,
    });

    // The new conversion system handles all the complexity
    // We just need to save the result to the database

    // Use the stored file URL if available, otherwise fall back to stream URL
    const finalStreamUrl = file_url || stream_url;

    // Save the converted song to the database
    const { data: songId, error: saveError } = await supabase.rpc(
      'get_or_create_api_song',
      {
        p_external_id: externalId,
        p_title: title,
        p_artist: artist,
        p_album: album || null,
        p_genre: null,
        p_year: null,
        p_duration: duration || 0,
        p_stream_url: finalStreamUrl,
        p_cover_url: thumbnail_url || null,
        p_preview_url: null,
        p_source: 'ytmusic',
        p_language: null,
        p_release_date: null,
      }
    );

    if (saveError) {
      console.error('Error saving converted song:', saveError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save converted song to database',
        },
        { status: 500 }
      );
    }

    console.log('✅ YouTube song converted and saved successfully:', {
      method,
      songId,
      stream_url: finalStreamUrl,
      stored,
      file_url,
    });

    return NextResponse.json({
      success: true,
      message: 'YouTube song converted and saved successfully',
      songId,
      stream_url: finalStreamUrl,
      file_url,
      stored,
      method,
    });
  } catch (error) {
    console.error('YouTube download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
