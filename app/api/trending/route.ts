import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// TypeScript interfaces for trending songs API response
interface TrendingSongData {
  id: string;
  song_id: string;
  play_count: number;
  ranking: number;
  date: string;
  songs:
    | {
        id: string;
        title: string;
        artist: string;
        album: string | null;
        duration: number;
        file_url: string;
        cover_image_url: string | null;
        genre: string | null;
        year: number | null;
        play_count: number;
        last_played: string | null;
        created_at: string;
      }[]
    | null;
}

interface ApiTrendingSongData {
  id: string;
  song_id: string;
  play_count: number;
  ranking: number;
  date: string;
  api_songs:
    | {
        id: string;
        title: string;
        artist: string;
        album: string | null;
        duration: number;
        stream_url: string;
        cover_url: string | null;
        genre: string | null;
        year: number | null;
        play_count: number;
        last_played: string | null;
        created_at: string;
        source: string;
      }[]
    | null;
}

interface FormattedTrendingSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  file_url: string;
  cover_url: string | null;
  genre: string | null;
  year: number | null;
  play_count: number;
  last_played: string | null;
  created_at: string;
  trending_play_count: number;
  trending_ranking: number;
  trending_date: string;
  source?: string;
}

interface TrendingResponse {
  songs: FormattedTrendingSong[];
  date: string;
  total: number;
  sources: {
    local: number;
    api: number;
    ytmusic: number;
    saavn: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000'); // Increased limit to show more results
    const date =
      searchParams.get('date') || new Date().toISOString().split('T')[0];
    const source = searchParams.get('source') || 'all'; // 'all', 'local', 'api', 'ytmusic', 'saavn'

    // Get local trending songs
    const { data: localTrendingSongs, error: localError } = await supabase
      .from('trending_songs')
      .select(
        `
        id,
        song_id,
        play_count,
        ranking,
        date,
        songs!inner (
          id,
          title,
          artist,
          album,
          duration,
          file_url,
          cover_image_url,
          genre,
          year,
          play_count,
          last_played,
          created_at
        )
      `
      )
      .eq('date', date)
      .order('ranking', { ascending: true });

    if (localError) {
      console.error('Error fetching local trending songs:', localError);
      return NextResponse.json(
        { error: 'Failed to fetch trending songs' },
        { status: 500 }
      );
    }

    // Get API trending songs
    const { data: apiTrendingSongs, error: apiError } = await supabase
      .from('api_trending_songs')
      .select(
        `
        id,
        song_id,
        play_count,
        ranking,
        date,
        api_songs(
          id,
          title,
          artist,
          album,
          duration,
          stream_url,
          cover_url,
          genre,
          year,
          play_count,
          last_played,
          created_at,
          source
        )
      `
      )
      .eq('date', date)
      .order('ranking', { ascending: true });

    if (apiError) {
      console.error('Error fetching API trending songs:', apiError);
      return NextResponse.json(
        { error: 'Failed to fetch API trending songs' },
        { status: 500 }
      );
    }

    // Transform local songs
    const formattedLocalSongs: FormattedTrendingSong[] =
      localTrendingSongs
        ?.filter(
          (trending: TrendingSongData) =>
            trending.songs !== null && trending.songs.length > 0
        )
        ?.map((trending: TrendingSongData) => {
          const song = trending.songs![0]; // Get the first (and only) song from the array
          return {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            file_url: song.file_url,
            cover_url: song.cover_image_url,
            genre: song.genre,
            year: song.year,
            play_count: song.play_count,
            last_played: song.last_played,
            created_at: song.created_at,
            trending_play_count: trending.play_count,
            trending_ranking: trending.ranking,
            trending_date: trending.date,
            source: 'local',
          };
        }) || [];

    // Transform API songs
    const formattedApiSongs: FormattedTrendingSong[] =
      apiTrendingSongs
        ?.filter(
          (trending: ApiTrendingSongData) =>
            trending.api_songs !== null && trending.api_songs.length > 0
        )
        ?.map((trending: ApiTrendingSongData) => {
          const song = trending.api_songs![0]; // Get the first (and only) song from the array
          return {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            file_url: song.stream_url,
            cover_url: song.cover_url,
            genre: song.genre,
            year: song.year,
            play_count: song.play_count,
            last_played: song.last_played,
            created_at: song.created_at,
            trending_play_count: trending.play_count,
            trending_ranking: trending.ranking,
            trending_date: trending.date,
            source: song.source || 'api',
          };
        }) || [];

    // Combine and filter by source if needed
    let combinedSongs: FormattedTrendingSong[] = [];

    if (source === 'all') {
      combinedSongs = [...formattedLocalSongs, ...formattedApiSongs];
    } else if (source === 'local') {
      combinedSongs = formattedLocalSongs;
    } else if (source === 'api') {
      combinedSongs = formattedApiSongs.filter(song => song.source === 'api');
    } else if (source === 'ytmusic') {
      combinedSongs = formattedApiSongs.filter(
        song => song.source === 'ytmusic'
      );
    } else if (source === 'saavn') {
      combinedSongs = formattedApiSongs.filter(song => song.source === 'saavn');
    }

    // Sort by a Spotify-like algorithm:
    // - Recent plays are weighted more heavily
    // - Play count matters but isn't the only factor
    // - Some randomization to avoid always showing the same songs

    // Calculate a score for each song
    const scoredSongs = combinedSongs.map(song => {
      // Base score is play count
      let score = song.trending_play_count;

      // Boost newer songs (created in the last 30 days)
      const songAge =
        new Date().getTime() - new Date(song.created_at).getTime();
      const daysSinceCreation = songAge / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) {
        score *= 1.2; // 20% boost for new songs
      }

      // Boost songs played recently
      if (song.last_played) {
        const lastPlayedAge =
          new Date().getTime() - new Date(song.last_played).getTime();
        const daysSinceLastPlayed = lastPlayedAge / (1000 * 60 * 60 * 24);
        if (daysSinceLastPlayed < 3) {
          score *= 1.3; // 30% boost for recently played songs
        }
      }

      // Add a small random factor (±10%) to create variety
      const randomFactor = 0.9 + Math.random() * 0.2;
      score *= randomFactor;

      return { ...song, score };
    });

    // Sort by score and limit
    scoredSongs.sort((a, b) => b.score - a.score);
    const limitedSongs = scoredSongs.slice(0, limit);

    // Count sources
    const sourceCounts = {
      local: limitedSongs.filter(song => song.source === 'local').length,
      api: limitedSongs.filter(song => song.source === 'api').length,
      ytmusic: limitedSongs.filter(song => song.source === 'ytmusic').length,
      saavn: limitedSongs.filter(song => song.source === 'saavn').length,
    };

    const response: TrendingResponse = {
      songs: limitedSongs,
      date,
      total: limitedSongs.length,
      sources: sourceCounts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in trending API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to manually update trending songs (for cron job)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { date } = await request
      .json()
      .catch(() => ({ date: new Date().toISOString().split('T')[0] }));

    const { error: localError } = await supabase.rpc('update_trending_songs', {
      target_date: date,
    });
    const { error: apiError } = await supabase.rpc(
      'update_api_trending_songs',
      { target_date: date }
    );

    if (localError) {
      console.error('Error updating local trending songs:', localError);
      return NextResponse.json(
        { error: 'Failed to update local trending songs' },
        { status: 500 }
      );
    }

    if (apiError) {
      console.error('Error updating API trending songs:', apiError);
      return NextResponse.json(
        { error: 'Failed to update API trending songs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trending songs updated successfully',
      date,
    });
  } catch (error) {
    console.error('Error in trending update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
