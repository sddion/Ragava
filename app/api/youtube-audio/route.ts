import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import YTDlpWrap from 'yt-dlp-wrap';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface YouTubeAudioRequest {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface YouTubeAudioResponse {
  success: boolean;
  songId?: string;
  audioUrl?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<YouTubeAudioResponse>> {
  try {
    const body: YouTubeAudioRequest = await request.json();
    const { videoId, title, artist, album, duration, thumbnailUrl } = body;

    if (!videoId || !title || !artist) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: videoId, title, artist',
        },
        { status: 400 }
      );
    }

    logger.info(
      `🎵 Converting YouTube video to audio: ${videoId} - ${title} by ${artist}`
    );

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: existingSong } = await supabase
      .from('api_songs')
      .select('*')
      .eq('external_id', `ytmusic_${videoId}`)
      .eq('source', 'ytmusic')
      .single();

    if (existingSong) {
      logger.info(`📀 Song already exists in database: ${existingSong.id}`);
      return NextResponse.json({
        success: true,
        songId: existingSong.id,
        audioUrl: existingSong.stream_url,
      });
    }

    // Create temporary directory for audio processing
    const tempDir = path.join(os.tmpdir(), 'youtube-audio', randomUUID());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Initialize yt-dlp
      const ytDlpWrap = new YTDlpWrap();

      // Set up output filename
      const audioFileName = `${videoId}_${Date.now()}.%(ext)s`;
      const outputTemplate = path.join(tempDir, audioFileName);

      logger.info(`🔄 Extracting audio from YouTube video: ${videoId}`);

      // Download audio using yt-dlp
      await ytDlpWrap.execPromise([
        `https://www.youtube.com/watch?v=${videoId}`,
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '128K', // Good quality but reasonable file size
        '--output',
        outputTemplate,
        '--no-playlist',
        '--no-warnings',
        '--quiet',
      ]);

      // Find the downloaded audio file
      const files = fs.readdirSync(tempDir);
      const audioFile = files.find(
        file => file.startsWith(`${videoId}_`) && file.endsWith('.mp3')
      );

      if (!audioFile) {
        throw new Error('Audio extraction failed - no audio file generated');
      }

      const audioFilePath = path.join(tempDir, audioFile);
      const audioBuffer = fs.readFileSync(audioFilePath);

      logger.info(
        `📁 Audio extracted successfully: ${audioFile} (${audioBuffer.length} bytes)`
      );

      // Upload to Supabase Storage
      const bucketName = 'music-files';
      const storagePath = `ytmusic/${videoId}/${audioFile}`;

      // Ensure bucket exists (create if not)
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

      if (!bucketExists) {
        const { error: createBucketError } =
          await supabase.storage.createBucket(bucketName, {
            public: true,
          });
        if (createBucketError) {
          logger.warn(
            'Failed to create bucket (may already exist):',
            createBucketError.message
          );
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadError) {
        logger.error(
          'Failed to upload audio to Supabase Storage:',
          uploadError
        );
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('Upload succeeded but no data returned');
      }

      logger.info(`📤 Upload successful: ${uploadData.path}`);

      // Get public URL for the uploaded audio
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

      logger.info(`☁️ Audio uploaded to Supabase Storage: ${publicUrl}`);

      // Save song metadata to api_songs table
      const { data: songData, error: dbError } = await supabase
        .from('api_songs')
        .insert({
          external_id: `ytmusic_${videoId}`,
          title: title,
          artist: artist,
          album: album || 'YouTube Music',
          duration: duration || 0,
          stream_url: publicUrl,
          cover_url: thumbnailUrl,
          source: 'ytmusic',
          language: 'unknown',
          release_date: new Date().getFullYear().toString(),
        })
        .select()
        .single();

      if (dbError) {
        logger.error('Failed to save song to database:', dbError);
        // Try to clean up uploaded file
        await supabase.storage.from(bucketName).remove([storagePath]);
        throw new Error(`Database save failed: ${dbError.message}`);
      }

      logger.info(`✅ YouTube audio conversion completed: ${songData.id}`);

      return NextResponse.json({
        success: true,
        songId: songData.id,
        audioUrl: publicUrl,
      });
    } finally {
      // Clean up temporary files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        logger.info(`🧹 Cleaned up temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        logger.warn(`Failed to clean up temp directory: ${cleanupError}`);
      }
    }
  } catch (error) {
    logger.error('YouTube audio conversion error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check conversion status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing videoId parameter',
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: song, error } = await supabase
      .from('api_songs')
      .select('*')
      .eq('external_id', `ytmusic_${videoId}`)
      .eq('source', 'ytmusic')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      logger.error('Database query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: !!song,
      song: song || null,
    });
  } catch (error) {
    logger.error('YouTube audio status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Status check failed',
      },
      { status: 500 }
    );
  }
}
