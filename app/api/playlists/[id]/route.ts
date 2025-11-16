import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeSongs = searchParams.get('includeSongs') === 'true';

    const supabase = await createServerSupabaseClient();

    let query = supabase.from('playlists').select('*').eq('id', id).single();

    if (includeSongs) {
      query = supabase
        .from('playlists')
        .select(
          `
          *,
          playlist_songs (
            position,
            songs (*)
          )
        `
        )
        .eq('id', id)
        .single();
    }

    const { data: playlist, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, is_public } = body;

    const supabase = await createServerSupabaseClient();

    const updateData: {
      name?: string;
      description?: string;
      is_public?: boolean;
    } = {
      // updated_at: new Date().toISOString() // This field doesn't exist in the type
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data: playlist, error } = await supabase
      .from('playlists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update playlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error('Error fetching playlist:', error);
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
    const { id } = await params;

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from('playlists').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete playlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
