import { NextRequest, NextResponse } from 'next/server';
import { musicAPI, type StreamableSong } from '@/lib/music-api';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Database types
interface DatabaseSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;
  file_url: string;
  cover_image_url: string | null;
  genre: string | null;
  year: number | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseApiSong {
  id: string;
  external_id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  year: number | null;
  duration: number | null;
  stream_url: string;
  cover_url: string | null;
  preview_url: string | null;
  source: string;
  language: string | null;
  release_date: string | null;
  created_at: string;
  updated_at: string;
}

// Types for normalized responses
interface YTMusicSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover_url: string;
  stream_url: string;
  source: 'ytmusic';
  genre?: string;
  language?: string;
  videoId?: string;
}

// Minimal shape of Saavn raw song objects
interface SaavnRawSong {
  id?: string;
  song_id?: string;
  track_id?: string;
  name?: string;
  title?: string;
  song_name?: string;
  track_name?: string;
  artists?:
    | { primary?: Array<{ name?: string }> }
    | string
    | Array<{ name?: string }>;
  primaryArtists?: string;
  artist?: string;
  singer?: string;
  album?: { name?: string } | string;
  album_name?: string;
  duration?: string | number;
  length?: string | number;
  duration_ms?: string | number;
  image?: Array<{ quality?: string; url?: string; link?: string }>;
  images?: Array<{ quality?: string; url?: string; link?: string }>;
  cover_image?: Array<{ quality?: string; url?: string; link?: string }>;
  thumbnail?: Array<{ quality?: string; url?: string; link?: string }>;
  downloadUrl?: Array<{ quality?: string; url?: string; link?: string }>;
  download_url?: Array<{ quality?: string; url?: string; link?: string }>;
  media_url?: Array<{ quality?: string; url?: string; link?: string }>;
  audio_url?: Array<{ quality?: string; url?: string; link?: string }>;
  language?: string;
  year?: string;
  release_date?: string;
  genre?: string;
  category?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const limit = searchParams.get('limit');
  const source = searchParams.get('source'); // 'saavn', 'ytmusic', 'all'

  if (!query) {
    return NextResponse.json(
      { error: 'Missing query parameter' },
      { status: 400 }
    );
  }

  try {
    const searchLimit = limit ? parseInt(limit) : 1000; // Increased limit to show more results

    // Ensure musicAPI uses the correct proxy origin on the server
    const origin = request.nextUrl.origin;
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      process.env.NEXT_PUBLIC_BASE_URL = origin;
    }

    console.log(
      `🔍 Multi-source search: "${query}" (source: ${source || 'all'})`
    );

    switch (source) {
      case 'saavn':
        // Search only JioSaavn
        const saavnResult = await musicAPI.searchSongs(query, 1, searchLimit);
        return NextResponse.json({
          success: true,
          query,
          sources: {
            saavn: {
              songs: saavnResult.songs,
              total: saavnResult.total,
            },
          },
          totalResults: saavnResult.songs.length,
        });

      case 'ytmusic':
        // Search only YouTube Music
        try {
          const ytmusicResponse = await fetch(
            `${request.nextUrl.origin}/api/ytmusic-proxy?action=search&query=${encodeURIComponent(query)}&limit=${searchLimit}`,
            { signal: AbortSignal.timeout(15000) }
          );

          if (!ytmusicResponse.ok) {
            const errorData = await ytmusicResponse.json().catch(() => ({}));
            console.warn(
              `YouTube Music search failed (${ytmusicResponse.status}):`,
              errorData.error || 'Unknown error'
            );
            return NextResponse.json({
              success: false,
              query,
              error: `YouTube Music search failed: ${errorData.error || 'Unknown error'}`,
              sources: {
                ytmusic: { songs: [], total: 0 },
              },
            });
          }

          const ytmusicData = await ytmusicResponse.json();

          return NextResponse.json({
            success: true,
            query,
            sources: {
              ytmusic: {
                songs: ytmusicData.success ? ytmusicData.songs : [],
                total: ytmusicData.success ? ytmusicData.total : 0,
              },
            },
            totalResults: ytmusicData.success ? ytmusicData.songs.length : 0,
          });
        } catch (ytmusicError) {
          console.error('YouTube Music search error:', ytmusicError);
          return NextResponse.json({
            success: true,
            query,
            sources: {
              ytmusic: {
                songs: [],
                total: 0,
                error: 'YouTube Music search failed',
              },
            },
            totalResults: 0,
          });
        }

      case 'all':
      default:
        // Search all sources in parallel: local database, Saavn, and YouTube Music
        const supabase = await createServerSupabaseClient();

        // Search local database songs
        const localSongsPromise = supabase
          .from('songs')
          .select('*')
          .or(
            `title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`
          )
          .limit(searchLimit)
          .then(
            ({
              data: localSongs,
              error,
            }: {
              data: DatabaseSong[] | null;
              error: Error | null;
            }) => {
              if (error) {
                console.error('Error searching local songs:', error);
                return { songs: [], total: 0 };
              }
              const normalizedLocalSongs: StreamableSong[] = (
                localSongs || []
              ).map((song: DatabaseSong) => ({
                id: song.id,
                title: song.title,
                artist: song.artist,
                album: song.album || 'Unknown Album',
                duration: song.duration || 0,
                cover_url: song.cover_image_url || '/default-album-art.svg',
                stream_url: song.file_url,
                source: 'local' as const,
                language: 'unknown',
                release_date: song.year?.toString(),
                genre: song.genre || 'unknown',
              }));
              return {
                songs: normalizedLocalSongs,
                total: normalizedLocalSongs.length,
              };
            }
          );

        // Search API songs from database
        const apiSongsPromise = supabase
          .from('api_songs')
          .select('*')
          .or(
            `title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`
          )
          .limit(searchLimit)
          .then(
            ({
              data: apiSongs,
              error,
            }: {
              data: DatabaseApiSong[] | null;
              error: Error | null;
            }) => {
              if (error) {
                console.error('Error searching API songs:', error);
                return { songs: [], total: 0 };
              }
              const normalizedApiSongs: StreamableSong[] = (apiSongs || []).map(
                (song: DatabaseApiSong) => ({
                  id: song.id,
                  title: song.title,
                  artist: song.artist,
                  album: song.album || 'Unknown Album',
                  duration: song.duration || 0,
                  cover_url: song.cover_url || '/default-album-art.svg',
                  stream_url: song.stream_url,
                  source: song.source as 'api' | 'ytmusic',
                  language: song.language || 'unknown',
                  release_date: song.release_date || undefined,
                  genre: song.genre || 'unknown',
                  videoId:
                    song.source === 'ytmusic' ? song.external_id : undefined,
                })
              );
              return {
                songs: normalizedApiSongs,
                total: normalizedApiSongs.length,
              };
            }
          );

        // Saavn via proxy directly (normalize shapes)
        console.log(`🔍 Search API: Starting Saavn search for "${query}"`);

        const saavnViaProxy = fetch(
          `${origin}/api/music-proxy?endpoint=${encodeURIComponent('https://saavn.dev/api/search/songs')}&query=${encodeURIComponent(query)}&limit=${searchLimit}`,
          { signal: AbortSignal.timeout(10000) }
        ).then(
          async (
            response
          ): Promise<{ songs: StreamableSong[]; total: number }> => {
            console.log(
              `🔍 Search API: Saavn response status: ${response.status}`
            );
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.warn(
                `Saavn search failed (${response.status}):`,
                errorData.error || 'Unknown error'
              );
              return { songs: [], total: 0 };
            }
            const raw = await response.json();
            console.log(
              '🔍 Search API: Saavn raw response:',
              JSON.stringify(raw, null, 2)
            );
            const rawResults: SaavnRawSong[] = (raw?.data?.results ||
              raw?.songs?.results ||
              raw?.results ||
              []) as SaavnRawSong[];
            console.log(
              'Saavn rawResults count:',
              Array.isArray(rawResults) ? rawResults.length : 0
            );
            const mapSong = (item: SaavnRawSong): StreamableSong | null => {
              const songId = item?.id || item?.song_id || item?.track_id;
              const songName =
                item?.name ||
                item?.title ||
                item?.song_name ||
                item?.track_name;
              // Derive primary artist from various schema shapes
              let artistPrimary: string | undefined;
              const artistsField = item?.artists;
              if (Array.isArray(artistsField)) {
                // Array of { name }
                artistPrimary = artistsField[0]?.name;
              } else if (
                typeof artistsField === 'object' &&
                artistsField &&
                'primary' in artistsField
              ) {
                const primaryArr = (
                  artistsField as { primary?: Array<{ name?: string }> }
                ).primary;
                if (Array.isArray(primaryArr)) {
                  artistPrimary = primaryArr[0]?.name;
                }
              } else if (typeof artistsField === 'string') {
                artistPrimary = artistsField;
              }
              const artist: string =
                artistPrimary ??
                item?.primaryArtists ??
                item?.artist ??
                (typeof artistsField === 'string' ? artistsField : undefined) ??
                item?.singer ??
                'Unknown Artist';
              const album: string =
                (typeof item?.album === 'string'
                  ? item.album
                  : item?.album?.name) ??
                item?.album_name ??
                'Unknown Album';
              const duration = Number(
                (item?.duration as number | string) ||
                  (item?.length as number | string) ||
                  (item?.duration_ms as number | string) ||
                  0
              );
              const images = (item?.image ||
                item?.images ||
                item?.cover_image ||
                item?.thumbnail ||
                []) as Array<{ quality?: string; url?: string; link?: string }>;
              let cover: string = '/default-album-art.svg';
              if (Array.isArray(images) && images.length > 0) {
                const best =
                  images.find(
                    (img: { quality?: string; url?: string; link?: string }) =>
                      img.quality === '500x500'
                  ) || images[0];
                cover = best?.url ?? best?.link ?? cover;
              }
              const downloads = (item?.downloadUrl ||
                item?.download_url ||
                item?.media_url ||
                item?.audio_url ||
                []) as
                | Array<{ quality?: string; url?: string; link?: string }>
                | string;
              let stream: string = '';
              if (Array.isArray(downloads)) {
                const qualityPref = [
                  '320kbps',
                  '256kbps',
                  '192kbps',
                  '160kbps',
                  '128kbps',
                  '96kbps',
                  '64kbps',
                  '48kbps',
                  '32kbps',
                  '16kbps',
                  '12kbps',
                ];
                for (const q of qualityPref) {
                  const hit = downloads.find(
                    d => (d.quality || '').toLowerCase() === q
                  );
                  if (hit && (hit.url || hit.link)) {
                    stream = hit.url ?? hit.link ?? '';
                    break;
                  }
                }
                if (!stream && downloads[0])
                  stream = downloads[0]?.url ?? downloads[0]?.link ?? '';
              } else if (typeof downloads === 'string') {
                stream = downloads;
              }
              if (!songId || !songName) return null;
              const title: string = songName ?? 'Unknown Title';
              return {
                id: `api_${songId}`,
                title,
                artist: typeof artist === 'string' ? artist : 'Unknown Artist',
                album: typeof album === 'string' ? album : 'Unknown Album',
                duration: Number.isFinite(duration) ? duration : 0,
                cover_url: cover,
                stream_url: stream,
                source: 'api' as const,
                language: item?.language || 'unknown',
                release_date: item?.year || item?.release_date,
                genre:
                  item?.genre || item?.category || item?.language || 'unknown',
              };
            };
            const songs: StreamableSong[] = (rawResults as SaavnRawSong[])
              .map(mapSong)
              .filter((s): s is StreamableSong => Boolean(s));
            console.log(
              '🔍 Search API: Saavn mapped songs count:',
              songs.length
            );
            console.log(
              '🔍 Search API: Saavn mapped songs:',
              songs.map(s => ({ title: s.title, artist: s.artist, id: s.id }))
            );
            return { songs, total: songs.length };
          }
        );

        const [localSongsResult, apiSongsResult, saavnPromise, ytmusicPromise] =
          await Promise.allSettled([
            localSongsPromise,
            apiSongsPromise,
            saavnViaProxy,
            fetch(
              `${request.nextUrl.origin}/api/ytmusic-proxy?action=search&query=${encodeURIComponent(query)}&limit=${searchLimit}`,
              { signal: AbortSignal.timeout(15000) }
            ).then(
              async (
                response
              ): Promise<{ songs: YTMusicSong[]; total: number }> => {
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  console.warn(
                    `YouTube Music search failed (${response.status}):`,
                    errorData.error || 'Unknown error'
                  );
                  return { songs: [], total: 0 };
                }
                const data = await response.json();
                if (!data.success) throw new Error('YouTube Music API error');
                return {
                  songs: (data.songs || []) as YTMusicSong[],
                  total: Number(data.total || 0),
                };
              }
            ),
          ]);

        // Process local database results
        const localData =
          localSongsResult.status === 'fulfilled'
            ? localSongsResult.value
            : { songs: [], total: 0 };

        // Process API songs from database results
        const apiData =
          apiSongsResult.status === 'fulfilled'
            ? apiSongsResult.value
            : { songs: [], total: 0 };

        // Process JioSaavn results
        const saavnData =
          saavnPromise.status === 'fulfilled'
            ? saavnPromise.value
            : { songs: [], total: 0 };

        // Process YouTube Music results
        let ytmusicData: {
          songs: YTMusicSong[];
          total: number;
          error: string | null;
        } = { songs: [], total: 0, error: null };
        if (ytmusicPromise.status === 'fulfilled') {
          ytmusicData = {
            songs: ytmusicPromise.value.songs || [],
            total: ytmusicPromise.value.total || 0,
            error: null,
          };
        } else {
          ytmusicData.error = 'YouTube Music search failed';
          console.error('YouTube Music search failed:', ytmusicPromise.reason);
        }

        const totalResults =
          localData.songs.length +
          apiData.songs.length +
          saavnData.songs.length +
          ytmusicData.songs.length;

        return NextResponse.json({
          success: true,
          query,
          sources: {
            local: {
              songs: localData.songs,
              total: localData.total,
            },
            api: {
              songs: apiData.songs,
              total: apiData.total,
            },
            saavn: {
              songs: saavnData.songs,
              total: saavnData.total,
            },
            ytmusic: {
              songs: ytmusicData.songs,
              total: ytmusicData.total,
              ...(ytmusicData.error && { error: ytmusicData.error }),
            },
          },
          totalResults,
          timestamp: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('❌ Multi-source search error:', error);

    // Provide more specific error messages based on error type
    let errorMessage = 'Search failed due to an unexpected error';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage =
          'Search timeout - external APIs are taking too long to respond';
        statusCode = 408;
      } else if (
        error.message.includes('fetch failed') ||
        error.message.includes('ETIMEDOUT')
      ) {
        errorMessage =
          'Network error - unable to connect to external music services';
        statusCode = 503;
      } else {
        errorMessage = `Search failed: ${error.message}`;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        query,
        details: error instanceof Error ? error.message : 'Unknown error',
        sources: {
          local: { songs: [], total: 0 },
          api: { songs: [], total: 0 },
          saavn: { songs: [], total: 0 },
          ytmusic: { songs: [], total: 0 },
        },
      },
      { status: statusCode }
    );
  }
}

// POST endpoint for complex search requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit, source } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // Convert POST request to GET request with query parameters
    const searchParams = new URLSearchParams();
    searchParams.set('query', query);
    if (limit) searchParams.set('limit', limit.toString());
    if (source) searchParams.set('source', source);

    const getRequest = new NextRequest(
      `${request.url}?${searchParams.toString()}`,
      { method: 'GET' }
    );

    return GET(getRequest);
  } catch (error) {
    console.error('❌ Multi-source search POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
