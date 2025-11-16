import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params;

    // Validate song ID
    if (!songId || typeof songId !== 'string' || songId.trim() === '') {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from('public_favorites')
      .select('id')
      .eq('song_id', songId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Song already in favorites' },
        { status: 409 }
      );
    }

    // Add to favorites
    const { data: favorite, error } = await supabase
      .from('public_favorites')
      .insert({
        song_id: songId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to add to favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params;

    // Validate song ID
    if (!songId || typeof songId !== 'string' || songId.trim() === '') {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('public_favorites')
      .delete()
      .eq('song_id', songId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove from favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
