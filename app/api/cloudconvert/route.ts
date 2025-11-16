import { NextRequest, NextResponse } from 'next/server';
import CloudConvert from 'cloudconvert';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getApiManager } from '@/lib/api-manager';

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_SANDBOX_API_KEY = process.env.CLOUDCONVERT_SANDBOX_API_KEY;
const CLOUDCONVERT_DAILY_LIMIT = 10; // 10 conversions per day for production

async function checkAndIncrementUsage(
  serviceName: string,
  dailyLimit: number
): Promise<{ canUse: boolean; usage: number; fallback: boolean }> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  try {
    // Get today's usage
    const { data: usageData, error } = await supabase
      .from('api_usage')
      .select('usage_count')
      .eq('api_name', serviceName)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error(`Error checking ${serviceName} usage:`, error);
      return { canUse: false, usage: 0, fallback: true };
    }

    const currentUsage = usageData?.usage_count || 0;

    if (currentUsage >= dailyLimit) {
      console.log(
        `${serviceName} daily limit reached: ${currentUsage}/${dailyLimit}`
      );
      return { canUse: false, usage: currentUsage, fallback: true };
    }

    // Increment usage
    const { error: upsertError } = await supabase.from('api_usage').upsert({
      api_name: serviceName,
      date: today,
      usage_count: currentUsage + 1,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error(`Error updating ${serviceName} usage:`, upsertError);
      return { canUse: false, usage: currentUsage, fallback: true };
    }

    return { canUse: true, usage: currentUsage + 1, fallback: false };
  } catch (error) {
    console.error(`${serviceName} usage check error:`, error);
    return { canUse: false, usage: 0, fallback: true };
  }
}

async function convertWithRapidAPI(
  input_url: string,
  title: string,
  artist: string,
  video_id: string
) {
  console.log('🔄 Using RapidAPI via API Manager for conversion');

  const apiManager = getApiManager();
  const result = await apiManager.makeRequest(video_id);

  if (!result.success || !result.data?.link) {
    throw new Error(
      `RapidAPI conversion failed: ${result.error || 'No download link'}`
    );
  }

  // Ensure safe values for filename and metadata
  const safeTitle = title || 'Unknown Title';
  const safeArtist = artist || 'Unknown Artist';
  const safeVideoId = video_id || 'unknown';

  return {
    success: true,
    download_url: result.data.link,
    source: `rapidapi-${result.apiKey?.host || 'unknown'}`,
    filename: `${safeTitle} - ${safeArtist}.mp3`,
    metadata: {
      title: safeTitle,
      artist: safeArtist,
      video_id: safeVideoId,
    },
  };
}

async function convertWithCloudConvertProduction(
  input_url: string,
  title: string,
  artist: string,
  video_id: string
) {
  if (!CLOUDCONVERT_API_KEY) {
    throw new Error('CloudConvert Production API key not configured');
  }

  // Ensure safe values for CloudConvert job
  const safeTitle = title || 'Unknown Title';
  const safeArtist = artist || 'Unknown Artist';
  const safeVideoId = video_id || 'unknown';

  const cloudConvert = new CloudConvert(CLOUDCONVERT_API_KEY, false); // Production mode with live key

  // Create a job with import, convert, and export tasks
  const job = await cloudConvert.jobs.create({
    tasks: {
      'import-youtube-video': {
        operation: 'import/url',
        url: input_url,
        filename: `${safeTitle} - ${safeArtist}.mp4`,
      },
      'convert-to-mp3': {
        operation: 'convert',
        input: 'import-youtube-video',
        input_format: 'mp4',
        output_format: 'mp3',
        audio_codec: 'mp3',
        audio_bitrate: 128,
      },
      'export-mp3': {
        operation: 'export/url',
        input: 'convert-to-mp3',
      },
    },
  });

  console.log('CloudConvert Production job created:', job.id);

  // Poll for job completion with timeout
  const startTime = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes timeout

  while (Date.now() - startTime < timeout) {
    const jobStatus = await cloudConvert.jobs.get(job.id);

    if (jobStatus.status === 'finished') {
      const exportTask = jobStatus.tasks.find(
        (task: { operation: string }) => task.operation === 'export/url'
      );
      if (exportTask && exportTask.result && exportTask.result.files) {
        const exportUrls = exportTask.result.files;
        const downloadUrl = exportUrls[0].url;
        const filename = exportUrls[0].filename;

        return {
          success: true,
          download_url: downloadUrl,
          source: 'cloudconvert-production',
          filename: filename,
          metadata: {
            title: safeTitle,
            artist: safeArtist,
            video_id: safeVideoId,
          },
        };
      }
    } else if (jobStatus.status === 'error') {
      throw new Error(
        `CloudConvert Production job failed: ${(jobStatus as { message?: string }).message || 'Unknown error'}`
      );
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('CloudConvert Production job timeout');
}

async function convertWithCloudConvertSandbox(
  input_url: string,
  title: string,
  artist: string,
  video_id: string
) {
  if (!CLOUDCONVERT_SANDBOX_API_KEY) {
    throw new Error('CloudConvert Sandbox API key not configured');
  }

  console.log('🔧 Using CloudConvert Sandbox API with sandbox key (unlimited)');

  // Ensure safe values for CloudConvert job
  const safeTitle = title || 'Unknown Title';
  const safeArtist = artist || 'Unknown Artist';
  const safeVideoId = video_id || 'unknown';

  const cloudConvert = new CloudConvert(CLOUDCONVERT_SANDBOX_API_KEY, true); // Sandbox mode with sandbox key

  // Create a job with import, convert, and export tasks
  const job = await cloudConvert.jobs.create({
    tasks: {
      'import-youtube-video': {
        operation: 'import/url',
        url: input_url,
        filename: `${safeTitle} - ${safeArtist}.mp4`,
      },
      'convert-to-mp3': {
        operation: 'convert',
        input: 'import-youtube-video',
        input_format: 'mp4',
        output_format: 'mp3',
        audio_codec: 'mp3',
        audio_bitrate: 128,
      },
      'export-mp3': {
        operation: 'export/url',
        input: 'convert-to-mp3',
      },
    },
  });

  console.log('CloudConvert Sandbox job created:', job.id);

  // Poll for job completion with timeout
  const startTime = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes timeout

  while (Date.now() - startTime < timeout) {
    const jobStatus = await cloudConvert.jobs.get(job.id);

    if (jobStatus.status === 'finished') {
      const exportTask = jobStatus.tasks.find(
        (task: { operation: string }) => task.operation === 'export/url'
      );
      if (exportTask && exportTask.result && exportTask.result.files) {
        const exportUrls = exportTask.result.files;
        const downloadUrl = exportUrls[0].url;
        const filename = exportUrls[0].filename;

        return {
          success: true,
          download_url: downloadUrl,
          source: 'cloudconvert-sandbox',
          filename: filename,
          metadata: {
            title: safeTitle,
            artist: safeArtist,
            video_id: safeVideoId,
          },
        };
      }
    } else if (jobStatus.status === 'error') {
      throw new Error(
        `CloudConvert Sandbox job failed: ${(jobStatus as { message?: string }).message || 'Unknown error'}`
      );
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('CloudConvert Sandbox job timeout');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      input_url,
      title,
      artist,
      album,
      duration,
      thumbnail_url,
      video_id,
    } = body;

    // Validate required fields
    if (!input_url || !video_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: input_url, video_id',
        },
        { status: 400 }
      );
    }

    // Validate input_url is a valid URL
    try {
      new URL(input_url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input_url format',
        },
        { status: 400 }
      );
    }

    // Set default values for optional fields
    const safeTitle = title || 'Unknown Title';
    const safeArtist = artist || 'Unknown Artist';
    const safeAlbum = album || 'Unknown Album';
    const safeDuration = duration || '0';
    const safeThumbnailUrl = thumbnail_url || '';

    // Log the safe values for debugging
    console.log('Using safe values:', {
      safeTitle,
      safeArtist,
      safeAlbum,
      safeDuration,
      safeThumbnailUrl,
    });

    // Smart fallback system - try services in order of preference
    const services = [
      {
        name: 'CloudConvert Production',
        check: () =>
          checkAndIncrementUsage(
            'cloudconvert-production',
            CLOUDCONVERT_DAILY_LIMIT
          ),
        execute: async () =>
          await convertWithCloudConvertProduction(
            input_url,
            safeTitle,
            safeArtist,
            video_id
          ),
      },
      {
        name: 'RapidAPI (via API Manager)',
        check: () =>
          Promise.resolve({ canUse: true, usage: 0, fallback: false }), // API Manager handles its own rate limiting
        execute: async () =>
          await convertWithRapidAPI(input_url, safeTitle, safeArtist, video_id),
      },
      {
        name: 'CloudConvert Sandbox',
        check: () =>
          Promise.resolve({ canUse: true, usage: 0, fallback: false }), // Always available
        execute: async () =>
          await convertWithCloudConvertSandbox(
            input_url,
            safeTitle,
            safeArtist,
            video_id
          ),
      },
    ];

    // Try each service until one works
    for (const service of services) {
      try {
        console.log(`🔄 Trying ${service.name}...`);

        const usageCheck = await service.check();

        if (!usageCheck.canUse) {
          console.log(
            `❌ ${service.name} not available (limit reached or error)`
          );
          continue;
        }

        console.log(`✅ ${service.name} available, attempting conversion...`);

        // Try to execute the service
        const result = await service.execute();

        // If successful, return the result
        console.log(`🎉 ${service.name} conversion successful!`);
        return NextResponse.json({
          ...result,
          usage: usageCheck.usage,
          service_used: service.name,
        });
      } catch (error) {
        console.error(`❌ ${service.name} failed:`, error);
        // Continue to next service
        continue;
      }
    }

    // If all services failed
    return NextResponse.json(
      {
        success: false,
        error: 'All conversion services failed. Please try again later.',
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('CloudConvert API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
