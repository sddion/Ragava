import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { songId, playDuration = 0 } = await request.json();

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    // API songs now have proper UUIDs from the database
    // We'll track them using the api-track-play endpoint
    // This endpoint is only for regular songs

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.rpc('track_song_play', {
      p_song_id: songId,
      p_play_duration: playDuration,
    });

    if (error) {
      console.error('Error tracking song play:', error);
      return NextResponse.json(
        { error: 'Failed to track song play' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Song play tracked successfully',
    });
  } catch (error) {
    console.error('Error in track-play API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
