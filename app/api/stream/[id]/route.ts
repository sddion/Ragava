import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // const { searchParams } = new URL(request.url)
    const range = request.headers.get('range');

    const supabase = await createServerSupabaseClient();

    // Get song metadata
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('file_path, file_size, file_type')
      .eq('id', id)
      .single();

    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Get file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('audio-files')
      .download(song.file_path);

    if (fileError || !fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    // Handle range requests for streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const chunk = fileBuffer.slice(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': song.file_type || 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // Full file response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': song.file_type || 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error streaming audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
