import { NextRequest, NextResponse } from 'next/server';
import { convertYouTubeVideo } from '@/lib/youtube-conversion';

interface ConversionRequest {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConversionRequest = await request.json();
    const { videoId, title, artist, album, duration, thumbnail_url } = body;

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log('🎵 Starting YouTube conversion for:', title);

    const result = await convertYouTubeVideo(
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ YouTube conversion error:', error);
    return NextResponse.json(
      { success: false, error: 'Conversion failed' },
      { status: 500 }
    );
  }
}
