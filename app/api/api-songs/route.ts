import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      external_id,
      title,
      artist,
      album,
      duration,
      stream_url,
      cover_url,
      source = 'api',
    } = body;

    if (!external_id || !title || !artist || !stream_url) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: external_id, title, artist, stream_url',
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const { data: existingSong } = await supabase
      .from('api_songs')
      .select('id, title, artist')
      .eq('external_id', external_id)
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

    // Insert new song
    const { data: newSong, error } = await supabase
      .from('api_songs')
      .insert({
        external_id,
        title,
        artist,
        album: album || null,
        duration: duration || 0,
        stream_url,
        cover_url: cover_url || null,
        source,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save song to database',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      song: newSong,
      message: 'Song saved to database successfully',
    });
  } catch (error) {
    console.error('API songs save error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000'); // Increased limit to show more results
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    const { data: songs, error } = await supabase
      .from('api_songs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch songs',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      songs: songs || [],
      count: songs?.length || 0,
    });
  } catch (error) {
    console.error('API songs fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
