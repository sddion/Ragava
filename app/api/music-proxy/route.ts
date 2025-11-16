import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const endpoint = searchParams.get('endpoint');
  const songId = searchParams.get('songId');
  const limit = searchParams.get('limit');

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Missing endpoint parameter' },
      { status: 400 }
    );
  }

  // Handle different types of requests
  let url: string;
  if (songId) {
    // Song details request
    // If endpoint already contains an ID like /songs/{id}, use it as-is
    const hasIdInPath = /\/songs\/[A-Za-z0-9_-]+$/.test(endpoint);
    if (hasIdInPath) {
      url = endpoint;
    } else if (endpoint.endsWith('/songs')) {
      // Determine query param name based on host
      let host = '';
      try {
        const parsed = new URL(endpoint);
        host = parsed.host;
      } catch {}

      const paramName = host.includes('saavn.dev') ? 'ids' : 'id';
      url = `${endpoint}?${paramName}=${encodeURIComponent(songId)}`;
    } else if (endpoint.includes('/songs/')) {
      // Path parameter format (ensure we don't double-append)
      url = `${endpoint}/${encodeURIComponent(songId)}`;
    } else {
      url = `${endpoint}?ids=${encodeURIComponent(songId)}`;
    }
  } else if (query) {
    // Search request
    const searchParams = new URLSearchParams();
    searchParams.set('query', query);
    if (limit) {
      searchParams.set('limit', limit);
    }
    url = `${endpoint}?${searchParams.toString()}`;
  } else {
    return NextResponse.json(
      { error: 'Missing query or songId parameter' },
      { status: 400 }
    );
  }

  try {
    console.log(`🔍 Music Proxy: Fetching URL: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout to match search-all expectations
    });

    console.log(`🔍 Music Proxy: Response status: ${response.status}`);
    if (!response.ok) {
      console.log(`🔍 Music Proxy: Response not OK: ${response.status}`);
      return NextResponse.json(
        { error: `API endpoint failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`🔍 Music Proxy: Response data keys:`, Object.keys(data));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return NextResponse.json(
          {
            error:
              'Request timeout - the external API is taking too long to respond',
            details:
              'The Saavn API may be experiencing high load or network issues',
          },
          { status: 408 }
        ); // 408 Request Timeout
      }

      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ETIMEDOUT')
      ) {
        return NextResponse.json(
          {
            error: 'Network error - unable to connect to external API',
            details: 'Please check your internet connection and try again',
          },
          { status: 503 }
        ); // 503 Service Unavailable
      }
    }

    return NextResponse.json(
      {
        error: `Failed to fetch from API: ${error instanceof Error ? error.message : String(error)}`,
        details: 'An unexpected error occurred while fetching data',
      },
      { status: 500 }
    );
  }
}
