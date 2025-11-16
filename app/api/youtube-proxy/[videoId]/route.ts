import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { apiManager } from '@/lib/api-manager';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * YouTube Audio Stream Proxy
 *
 * Uses RapidAPI's YouTube to MP3 converter for reliable audio streaming.
 * This is a working, Vercel-compatible solution.
 */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-rapidapi-key, x-rapidapi-host',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
): Promise<NextResponse> {
  try {
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        {
          error: 'Missing video ID',
        },
        { status: 400 }
      );
    }

    logger.info(`🎧 Getting audio stream for: ${videoId}`);

    // 1) If already saved in DB, stream directly from storage
    try {
      const supabase = await createServerSupabaseClient();
      const externalId = `ytmusic_${videoId}`;
      const { data: existing } = await supabase
        .from('api_songs')
        .select('id, title, artist, stream_url')
        .eq('external_id', externalId)
        .maybeSingle();

      if (existing?.stream_url) {
        logger.info(
          `📦 Found stored stream for ${videoId}, streaming from storage`
        );
        const stored = await fetch(existing.stream_url);
        if (stored.ok) {
          const contentType =
            stored.headers.get('content-type') || 'audio/mpeg';
          return new NextResponse(stored.body, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
              'Content-Disposition': `inline; filename="${encodeURIComponent(existing.title || videoId)}.mp3"`,
              'Content-Length': stored.headers.get('content-length') || '',
            },
          });
        }
        logger.warn(
          `Stored stream not accessible (${stored.status}). Will regenerate.`
        );
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      logger.warn('DB check failed, proceeding to generate stream', err);
    }

    const apiResult = await apiManager.makeRequest(videoId);

    if (!apiResult.success) {
      logger.warn(
        `🚫 All RapidAPI keys failed for ${videoId}: ${apiResult.error}`
      );
      logger.info(`🔄 Using Cobalt.tools fallback for ${videoId}`);

      const cobaltUrl = 'https://co.wuk.sh/api/json';
      const cobaltOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          vQuality: 'best',
          vFormat: 'mp4',
          aFormat: 'mp3',
          isAudioOnly: true,
          isNoTTWatermark: true,
          isTTFullAudio: true,
        }),
      };

      const cobaltResponse = await fetch(cobaltUrl, cobaltOptions);

      if (!cobaltResponse.ok) {
        logger.error(
          `Both RapidAPI and Cobalt.tools failed for ${videoId}: ${cobaltResponse.status} ${cobaltResponse.statusText}`
        );
        throw new Error(
          `All conversion services failed: ${cobaltResponse.status} ${cobaltResponse.statusText}`
        );
      }

      // Handle Cobalt.tools response
      interface CobaltData {
        status?: string;
        url?: string;
        text?: string;
      }
      const cobaltData = (await cobaltResponse.json()) as CobaltData;

      if (cobaltData.status === 'success' && cobaltData.url) {
        logger.info(
          `✅ Cobalt.tools success for ${videoId}: ${cobaltData.text}`
        );

        // Proxy the MP3 stream from Cobalt.tools
        const audioResponse = await fetch(cobaltData.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://co.wuk.sh/',
          },
        });

        if (audioResponse.ok) {
          const contentType =
            audioResponse.headers.get('content-type') || 'audio/mpeg';

          return new NextResponse(audioResponse.body, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
              'Content-Disposition': `inline; filename="${encodeURIComponent(cobaltData.text || videoId)}.mp3"`,
              'Content-Length':
                audioResponse.headers.get('content-length') || '',
            },
          });
        } else {
          throw new Error(
            `Cobalt.tools MP3 stream not accessible: ${audioResponse.status}`
          );
        }
      } else {
        throw new Error(
          `Cobalt.tools failed: ${cobaltData.text || 'Unknown error'}`
        );
      }
    }

    // If we reach here, RapidAPI was successful
    logger.info(
      `✅ RapidAPI is available and working for ${videoId} using ${apiResult.apiKey?.host}`
    );

    interface RapidData {
      status?: string;
      title?: string;
      link?: string;
      linkStream?: string;
      filesize?: number;
      duration?: number;
    }
    const data = apiResult.data as RapidData;

    if (!data) {
      logger.error(`RapidAPI returned no data for ${videoId}`);
      throw new Error('RapidAPI returned no data');
    }

    logger.info(`📥 RapidAPI response for ${videoId}:`, {
      status: data.status,
      title: data.title,
      hasLink: !!data.link || !!data.linkStream,
      filesize: data.filesize,
      duration: data.duration,
      apiUsed: apiResult.apiKey?.host,
    });

    // If provider gave any direct URL, prefer redirect for immediate playback and background-save
    const directUrl: string | undefined = data.link || data.linkStream;
    if (typeof directUrl === 'string' && directUrl.length > 0) {
      const title = data.title || 'YouTube Audio';
      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://ragava.vercel.app';
      fetch(`${baseUrl}/api/youtube-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, title, artist: 'Unknown' }),
      }).catch(() => {});
      return NextResponse.redirect(directUrl, { status: 302 });
    }

    // Validate RapidAPI response
    if (data.status === 'ok' && data.link) {
      logger.info(`🎵 Got MP3 link for ${videoId}: ${data.title}`);

      // Download once, store to Supabase, persist api_songs, and then stream
      try {
        const providerLink: string | undefined =
          typeof data.link === 'string' ? data.link : undefined;
        if (!providerLink) {
          throw new Error('Provider did not return a valid link');
        }
        const audioResponse = await fetch(providerLink, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://youtube-mp36.p.rapidapi.com/',
          },
        });

        if (!audioResponse.ok) {
          logger.error(
            `Audio stream fetch failed: ${audioResponse.status} ${audioResponse.statusText}`
          );
          // As a fallback, redirect client directly to the provider link so the browser streams it
          // Fire-and-forget background store for future plays
          const baseUrl =
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000'
              : 'https://ragava.vercel.app';
          fetch(`${baseUrl}/api/youtube-download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_id: videoId,
              title: data.title || 'YouTube Audio',
              artist: 'Unknown',
            }),
          }).catch(() => {});
          return NextResponse.redirect(providerLink, { status: 302 });
        }

        // Read into buffer and upload
        const arrayBuf = await audioResponse.arrayBuffer();
        const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });

        const supabase = await createServerSupabaseClient();
        const bucket = 'music-files';
        const safeTitle = (data.title || `youtube-${videoId}`).replace(
          /[^a-z0-9-_\s]/gi,
          '_'
        );
        const filename = `${safeTitle}.mp3`;
        const filePath = `youtube-music/${videoId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, blob, { contentType: 'audio/mpeg', upsert: false });

        if (uploadError) {
          logger.error('Supabase upload error:', uploadError);
          throw new Error('Failed to upload MP3 to storage');
        }

        const { data: pub } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        const publicUrl: string | undefined = pub?.publicUrl;

        // Persist in api_songs
        const externalId = `ytmusic_${videoId}`;
        const { error: insertError } = await supabase.from('api_songs').insert({
          external_id: externalId,
          title: data.title || 'YouTube Audio',
          artist: 'Unknown',
          album: null,
          duration:
            typeof data.duration === 'number' ? Math.round(data.duration) : 0,
          stream_url: publicUrl,
          cover_url: null,
          source: 'youtube',
        });

        if (insertError) {
          logger.warn(
            'Insert api_songs failed (may already exist):',
            insertError
          );
        }

        // Finally stream from storage (re-fetch ensures proper headers)
        if (!publicUrl) {
          const baseUrl =
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000'
              : 'https://ragava.vercel.app';
          fetch(`${baseUrl}/api/youtube-download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_id: videoId,
              title: data.title || 'YouTube Audio',
              artist: 'Unknown',
            }),
          }).catch(() => {});
          return NextResponse.redirect(providerLink, { status: 302 });
        }
        const stored = await fetch(publicUrl as string);
        if (!stored.ok) {
          // As a fallback, redirect to provider link
          const baseUrl =
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:3000'
              : 'https://ragava.vercel.app';
          fetch(`${baseUrl}/api/youtube-download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              video_id: videoId,
              title: data.title || 'YouTube Audio',
              artist: 'Unknown',
            }),
          }).catch(() => {});
          return NextResponse.redirect(providerLink, { status: 302 });
        }
        const contentType = stored.headers.get('content-type') || 'audio/mpeg';
        return new NextResponse(stored.body, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Content-Disposition': `inline; filename="${encodeURIComponent(data.title || videoId)}.mp3"`,
            'Content-Length': stored.headers.get('content-length') || '',
          },
        });
      } catch (fetchError) {
        logger.error(`MP3 stream fetch error:`, fetchError);
        throw new Error(
          `Failed to fetch MP3 stream: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`
        );
      }
    } else {
      logger.warn(
        `⚠️ RapidAPI returned invalid response for ${videoId}:`,
        data
      );

      // If provider gave a link or stream, redirect immediately so browser can play
      const possibleLink: string | undefined =
        typeof data.link === 'string'
          ? data.link
          : typeof data.linkStream === 'string'
            ? data.linkStream
            : undefined;
      if (possibleLink && possibleLink.length > 0) {
        const title = data.title || 'YouTube Audio';
        const baseUrl =
          process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://ragava.vercel.app';
        fetch(`${baseUrl}/api/youtube-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: videoId, title, artist: 'Unknown' }),
        }).catch(() => {});
        return NextResponse.redirect(possibleLink, { status: 302 });
      }

      logger.info(
        `🔄 Falling back to Cobalt.tools due to invalid RapidAPI response`
      );

      // Try Cobalt.tools as fallback for invalid RapidAPI response
      try {
        const cobaltUrl = 'https://co.wuk.sh/api/json';
        const cobaltOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            vQuality: 'best',
            vFormat: 'mp4',
            aFormat: 'mp3',
            isAudioOnly: true,
            isNoTTWatermark: true,
            isTTFullAudio: true,
          }),
        };

        const cobaltResponse = await fetch(cobaltUrl, cobaltOptions);

        if (!cobaltResponse.ok) {
          throw new Error(
            `Cobalt.tools also failed: ${cobaltResponse.status} ${cobaltResponse.statusText}`
          );
        }

        const cobaltData = await cobaltResponse.json();

        if (cobaltData.status === 'success' && cobaltData.url) {
          logger.info(
            `✅ Cobalt.tools fallback success for ${videoId}: ${cobaltData.text}`
          );

          // Download once, store to Supabase, persist api_songs, and then stream
          const audioResponse = await fetch(cobaltData.url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Referer: 'https://co.wuk.sh/',
            },
          });
          if (!audioResponse.ok) {
            return NextResponse.redirect(cobaltData.url, { status: 302 });
          }

          const arrayBuf = await audioResponse.arrayBuffer();
          const blob = new Blob([arrayBuf], { type: 'audio/mpeg' });

          const supabase = await createServerSupabaseClient();
          const bucket = 'music-files';
          const safeTitle = (cobaltData.text || `youtube-${videoId}`).replace(
            /[^a-z0-9-_\s]/gi,
            '_'
          );
          const filename = `${safeTitle}.mp3`;
          const filePath = `youtube-music/${videoId}/${filename}`;
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, blob, {
              contentType: 'audio/mpeg',
              upsert: false,
            });
          if (uploadError) throw new Error('Failed to upload MP3 to storage');

          const { data: pub } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          const publicUrl = pub?.publicUrl || '';

          const externalId = `ytmusic_${videoId}`;
          const { error: insertError } = await supabase
            .from('api_songs')
            .insert({
              external_id: externalId,
              title: cobaltData.text || 'YouTube Audio',
              artist: 'Unknown',
              album: null,
              duration: 0,
              stream_url: publicUrl,
              cover_url: null,
              source: 'youtube',
            });
          if (insertError)
            logger.warn(
              'Insert api_songs failed (may already exist):',
              insertError
            );

          const stored = await fetch(publicUrl);
          if (!stored.ok) {
            return NextResponse.redirect(cobaltData.url, { status: 302 });
          }
          const contentType =
            stored.headers.get('content-type') || 'audio/mpeg';
          return new NextResponse(stored.body, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
              'Content-Disposition': `inline; filename="${encodeURIComponent(cobaltData.text || videoId)}.mp3"`,
              'Content-Length': stored.headers.get('content-length') || '',
            },
          });
        } else {
          throw new Error(
            `Cobalt.tools fallback failed: ${cobaltData.text || 'Unknown error'}`
          );
        }
      } catch (fallbackError) {
        logger.error(
          `Both RapidAPI and Cobalt.tools failed for ${videoId}:`,
          fallbackError
        );
        throw new Error(
          `All conversion services failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    logger.error('YouTube proxy error:', error);

    // Return proper error response - NO HTML fallbacks
    const { videoId: errorVideoId } = await params;
    return NextResponse.json(
      {
        error: 'Failed to get audio stream',
        videoId: errorVideoId,
        details: error instanceof Error ? error.message : 'Unknown error',
        message:
          'Direct MP3 streaming failed - check RapidAPI key and video availability',
      },
      { status: 500 }
    );
  }
}
