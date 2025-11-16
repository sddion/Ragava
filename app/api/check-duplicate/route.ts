import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, artist, album, source, externalId, videoId } = body;

    if (!title || !artist) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title and artist are required',
        },
        { status: 400 }
      );
    }

    console.log('Checking duplicates for:', {
      title,
      artist,
      album,
      source,
      externalId,
      videoId,
    });

    const supabase = await createServerSupabaseClient();

    const duplicateChecks = await Promise.allSettled([
      supabase
        .from('songs')
        .select('id, title, artist, album')
        .ilike('title', `%${title}%`)
        .ilike('artist', `%${artist}%`)
        .limit(5),

      supabase
        .from('api_songs')
        .select('id, title, artist, album, external_id, source')
        .ilike('title', `%${title}%`)
        .ilike('artist', `%${artist}%`)
        .limit(5),
    ]);

    const [localSongsResult, apiSongsResult] = duplicateChecks;

    const duplicates: Array<{
      id: string;
      title: string;
      artist: string;
      album?: string;
      source: string;
      table: string;
      external_id?: string;
    }> = [];
    let isDuplicate = false;

    // Process local songs results
    if (
      localSongsResult.status === 'fulfilled' &&
      localSongsResult.value.data
    ) {
      const localMatches = localSongsResult.value.data.filter(song => {
        const titleMatch =
          song.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(song.title.toLowerCase());
        const artistMatch =
          song.artist.toLowerCase().includes(artist.toLowerCase()) ||
          artist.toLowerCase().includes(song.artist.toLowerCase());
        return titleMatch && artistMatch;
      });

      duplicates.push(
        ...localMatches.map(song => ({
          ...song,
          source: 'local',
          table: 'songs',
        }))
      );

      if (localMatches.length > 0) {
        isDuplicate = true;
      }
    }

    // Process API songs results
    if (apiSongsResult.status === 'fulfilled' && apiSongsResult.value.data) {
      const apiMatches = apiSongsResult.value.data.filter(song => {
        const titleMatch =
          song.title.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(song.title.toLowerCase());
        const artistMatch =
          song.artist.toLowerCase().includes(artist.toLowerCase()) ||
          artist.toLowerCase().includes(song.artist.toLowerCase());

        // Additional check for exact external ID match
        if (externalId && song.external_id === externalId) {
          return true;
        }

        // Additional check for video ID match (for YouTube songs)
        if (videoId && song.external_id === videoId) {
          return true;
        }

        return titleMatch && artistMatch;
      });

      duplicates.push(
        ...apiMatches.map(song => ({
          ...song,
          source: song.source || 'api',
          table: 'api_songs',
        }))
      );

      if (apiMatches.length > 0) {
        isDuplicate = true;
      }
    }

    return NextResponse.json({
      success: true,
      isDuplicate,
      duplicates,
      count: duplicates.length,
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check for duplicates',
      },
      { status: 500 }
    );
  }
}
