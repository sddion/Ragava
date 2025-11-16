import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Force dynamic execution to prevent caching issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Debug: Log all headers to understand what Vercel sends
    console.log(
      'Cron request headers:',
      Object.fromEntries(request.headers.entries())
    );

    // Vercel cron jobs send the secret in the Authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    console.log('Auth header present:', !!authHeader);
    console.log('Cron secret configured:', !!cronSecret);

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request:', {
        authHeader: authHeader ? 'present' : 'missing',
        expected: `Bearer ${cronSecret}`,
        received: authHeader,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { error: localError } = await supabase.rpc('update_trending_songs', {
      target_date: today,
    });
    const { error: apiError } = await supabase.rpc(
      'update_api_trending_songs',
      { target_date: today }
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

    // Get the updated trending songs count
    const { count: localCount } = await supabase
      .from('trending_songs')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    const { count: apiCount } = await supabase
      .from('api_trending_songs')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    return NextResponse.json({
      success: true,
      message: 'Trending songs updated successfully',
      date: today,
      localTrendingSongsCount: localCount || 0,
      apiTrendingSongsCount: apiCount || 0,
      totalTrendingSongsCount: (localCount || 0) + (apiCount || 0),
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for manual testing (not used by Vercel cron)
export async function POST(request: NextRequest) {
  try {
    // For manual testing, we can use a different auth method
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'test-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { error: localError } = await supabase.rpc('update_trending_songs', {
      target_date: today,
    });
    const { error: apiError } = await supabase.rpc(
      'update_api_trending_songs',
      { target_date: today }
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

    // Get the updated trending songs count
    const { count: localCount } = await supabase
      .from('trending_songs')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    const { count: apiCount } = await supabase
      .from('api_trending_songs')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    return NextResponse.json({
      success: true,
      message: 'Trending songs updated successfully (manual trigger)',
      date: today,
      localTrendingSongsCount: localCount || 0,
      apiTrendingSongsCount: apiCount || 0,
      totalTrendingSongsCount: (localCount || 0) + (apiCount || 0),
    });
  } catch (error) {
    console.error('Error in manual cron trigger:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
