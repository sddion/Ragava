import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: favorites, error } = await supabase
      .from('api_favorites')
      .select(
        `
        song_id,
        api_songs (*)
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API favorites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error in api-favorites GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { songId } = await request.json();

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: existing } = await supabase
      .from('api_favorites')
      .select('id')
      .eq('song_id', songId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Song already in favorites',
      });
    }

    const { error } = await supabase
      .from('api_favorites')
      .insert({ song_id: songId });

    if (error) {
      console.error('Error adding to API favorites:', error);
      return NextResponse.json(
        { error: 'Failed to add to favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Added to favorites successfully',
    });
  } catch (error) {
    console.error('Error in api-favorites POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('api_favorites')
      .delete()
      .eq('song_id', songId);

    if (error) {
      console.error('Error removing from API favorites:', error);
      return NextResponse.json(
        { error: 'Failed to remove from favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites successfully',
    });
  } catch (error) {
    console.error('Error in api-favorites DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
