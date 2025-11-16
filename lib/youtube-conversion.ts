import {
  downloadAndUploadToStorage,
  generateAudioFileName,
} from './supabase-storage';

export interface ConversionRequest {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  thumbnail_url?: string;
}

export interface ConversionResponse {
  success: boolean;
  stream_url?: string;
  file_url?: string; // URL to the stored MP3 file in Supabase storage
  error?: string;
  method?: 'gitlab-ci' | 'rapidapi' | 'cloudconvert' | 'cobalt' | 'fallback';
  stored?: boolean; // Whether the file was successfully stored
}

// Helper function to get safe values
function getSafeValue(value: unknown, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

// Helper function to download and store MP3 file
async function downloadAndStoreMP3(
  downloadUrl: string,
  videoId: string,
  title: string,
  artist: string
): Promise<{ success: boolean; file_url?: string; error?: string }> {
  try {
    console.log('📥 Downloading and storing MP3 file...', {
      downloadUrl,
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
    });

    // Use imported storage utilities

    // Generate filename
    const fileName = generateAudioFileName(videoId, title, artist);

    // Download and upload to storage
    const result = await downloadAndUploadToStorage(downloadUrl, fileName);

    if (result.success && result.fileUrl) {
      console.log('✅ MP3 file stored successfully:', result.fileUrl);
      return {
        success: true,
        file_url: result.fileUrl,
      };
    } else {
      console.log('⚠️ Failed to store MP3 file:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to store MP3 file',
      };
    }
  } catch (error) {
    console.error('❌ MP3 storage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}

// GitLab CI/CD Conversion (Primary)
async function tryGitLabConversion(
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying GitLab CI/CD conversion...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    // Check if GitLab CI/CD is available
    const gitlabEnabled = process.env.YOUTUBE_CONVERSION_ENABLED === 'true';
    if (!gitlabEnabled) {
      console.log('⚠️ GitLab CI/CD not enabled, triggering pipeline...');

      // Try to trigger the pipeline automatically
      try {
        const triggerResponse = await fetch('/api/trigger-pipeline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            branch: 'main',
            reason: `YouTube conversion for: ${getSafeValue(title)}`,
          }),
        });

        if (triggerResponse.ok) {
          const triggerData = await triggerResponse.json();
          console.log('✅ Pipeline triggered successfully:', triggerData);

          // Wait a bit for pipeline to start
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Check pipeline status
          const statusResponse = await fetch('/api/pipeline-status');
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('📋 Pipeline status:', statusData);
          }
        } else {
          console.log(
            '⚠️ Failed to trigger pipeline, falling back to other methods'
          );
        }
      } catch (triggerError) {
        console.log('⚠️ Pipeline trigger failed:', triggerError);
      }

      return {
        success: false,
        error: 'GitLab CI/CD not enabled, pipeline triggered',
      };
    }

    // For now, return failure to try other methods
    // In a real implementation, this would call the GitLab CI/CD pipeline
    console.log('⚠️ GitLab CI/CD conversion not implemented yet');
    return { success: false, error: 'GitLab CI/CD not implemented' };
  } catch (error) {
    console.error('❌ GitLab CI/CD conversion error:', error);
    return { success: false, error: 'GitLab CI/CD conversion failed' };
  }
}

// RapidAPI Conversion (Fallback 1) - Using your existing API Manager
async function tryRapidAPIConversion(
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying RapidAPI conversion with API Manager...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    // Import your existing API manager with 3 endpoints and key rotation
    const { getApiManager } = await import('@/lib/api-manager');
    const apiManager = getApiManager();

    // Use your sophisticated API manager with 3 endpoints and key rotation
    const result = await apiManager.makeRequest(videoId);

    if (result.success && result.data) {
      const {
        link,
        title: apiTitle,
        filesize,
        duration: apiDuration,
      } = result.data;

      if (link) {
        console.log('✅ RapidAPI conversion successful with API Manager:', {
          apiKey: result.apiKey?.host,
          keyIndex: result.apiKey?.keyIndex,
          endpointIndex: result.apiKey?.endpointIndex,
          requestsUsed: result.apiKey?.requestsUsed,
          maxRequests: result.apiKey?.maxRequests,
          link,
          title: apiTitle,
          filesize: filesize || 'unknown',
          duration: apiDuration || 'unknown',
        });

        // Try to download and store the MP3 file
        const storageResult = await downloadAndStoreMP3(
          link,
          videoId,
          title,
          artist
        );

        if (storageResult.success && storageResult.file_url) {
          return {
            success: true,
            stream_url: link, // Keep original download URL as fallback
            file_url: storageResult.file_url, // Supabase storage URL
            stored: true,
          };
        } else {
          console.log(
            '⚠️ Failed to store MP3 file, using direct URL:',
            storageResult.error
          );
          return {
            success: true,
            stream_url: link,
            stored: false,
          };
        }
      }
    }

    console.log(
      '⚠️ RapidAPI conversion failed with API Manager:',
      result.error || 'No error details available'
    );
    return {
      success: false,
      error:
        result.error ||
        'RapidAPI conversion failed - no download link received',
    };
  } catch (error) {
    console.error('❌ RapidAPI conversion error:', error);
    return { success: false, error: 'RapidAPI conversion failed' };
  }
}

// CloudConvert Conversion (Fallback 2)
async function tryCloudConvertConversion(
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying CloudConvert conversion...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    const cloudConvertApiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!cloudConvertApiKey) {
      console.log('⚠️ CloudConvert API key not configured');
      return { success: false, error: 'CloudConvert API key not configured' };
    }

    // Try Live API first
    const liveResult = await tryCloudConvertLive(
      cloudConvertApiKey,
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    if (liveResult.success) {
      return liveResult;
    }

    // Try Sandbox API
    const sandboxResult = await tryCloudConvertSandbox(
      cloudConvertApiKey,
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    return sandboxResult;
  } catch (error) {
    console.error('❌ CloudConvert conversion error:', error);
    return { success: false, error: 'CloudConvert conversion failed' };
  }
}

// Helper function to poll CloudConvert job status
async function pollCloudConvertJob(
  apiKey: string,
  jobId: string,
  isSandbox: boolean = false
): Promise<string | null> {
  const baseUrl = isSandbox
    ? 'https://api.sandbox.cloudconvert.com'
    : 'https://api.cloudconvert.com';

  const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute timeout
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${baseUrl}/v2/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.log(
          `⚠️ CloudConvert job status check failed: ${response.status}`
        );
        return null;
      }

      const jobData = await response.json();
      const status = jobData.data?.status;

      console.log(`🔄 CloudConvert job ${jobId} status: ${status}`);

      if (status === 'finished') {
        // Get the download URL from the export task
        const tasks = jobData.data?.tasks || [];
        const exportTask = tasks.find(
          (task: {
            operation: string;
            result?: { files?: Array<{ url: string }> };
          }) => task.operation === 'export/url'
        );

        if (
          exportTask &&
          exportTask.result?.files &&
          exportTask.result.files.length > 0
        ) {
          const downloadUrl = exportTask.result.files[0].url;
          console.log(
            '✅ CloudConvert job completed, download URL:',
            downloadUrl
          );
          return downloadUrl;
        }
      } else if (status === 'error') {
        console.log('❌ CloudConvert job failed');
        return null;
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error('❌ Error polling CloudConvert job:', error);
      return null;
    }
  }

  console.log('⚠️ CloudConvert job polling timed out');
  return null;
}

// CloudConvert Live API
async function tryCloudConvertLive(
  apiKey: string,
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying CloudConvert Live API...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    // Check if API key is valid
    if (!apiKey || apiKey.length < 10) {
      console.log('⚠️ CloudConvert API key is invalid or missing');
      return { success: false, error: 'CloudConvert API key invalid' };
    }

    const response = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-youtube': {
            operation: 'import/url',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            filename: `${getSafeValue(title)}.mp4`,
          },
          'convert-audio': {
            operation: 'convert',
            input: 'import-youtube',
            output_format: 'mp3',
            audio_codec: 'mp3',
            audio_bitrate: 320,
            audio_frequency: 44100,
          },
          'export-url': {
            operation: 'export/url',
            input: 'convert-audio',
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: 'youtube-conversion',
        webhook_url: null,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        '⚠️ CloudConvert Live API failed:',
        response.status,
        errorText
      );
      return {
        success: false,
        error: `CloudConvert Live API failed: ${response.status}`,
      };
    }

    const data = await response.json();
    if (data.data && data.data.id) {
      console.log('✅ CloudConvert Live API job created:', data.data.id);

      // Poll for job completion and get the download URL
      const downloadUrl = await pollCloudConvertJob(
        apiKey,
        data.data.id,
        false
      );
      if (downloadUrl) {
        // Try to download and store the MP3 file
        const storageResult = await downloadAndStoreMP3(
          downloadUrl,
          videoId,
          title,
          artist
        );

        if (storageResult.success && storageResult.file_url) {
          return {
            success: true,
            stream_url: downloadUrl, // Keep original download URL as fallback
            file_url: storageResult.file_url, // Supabase storage URL
            stored: true,
          };
        } else {
          console.log(
            '⚠️ Failed to store MP3 file, using direct URL:',
            storageResult.error
          );
          return {
            success: true,
            stream_url: downloadUrl,
            stored: false,
          };
        }
      } else {
        return {
          success: false,
          error: 'CloudConvert job failed or timed out',
        };
      }
    }

    console.log('⚠️ CloudConvert Live API failed:', data);
    return { success: false, error: 'CloudConvert Live API failed' };
  } catch (error) {
    console.error('❌ CloudConvert Live API error:', error);
    return { success: false, error: 'CloudConvert Live API failed' };
  }
}

// CloudConvert Sandbox API
async function tryCloudConvertSandbox(
  apiKey: string,
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying CloudConvert Sandbox API...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    // Check if API key is valid
    if (!apiKey || apiKey.length < 10) {
      console.log('⚠️ CloudConvert Sandbox API key is invalid or missing');
      return { success: false, error: 'CloudConvert Sandbox API key invalid' };
    }

    const response = await fetch(
      'https://api.sandbox.cloudconvert.com/v2/jobs',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: {
            'import-youtube': {
              operation: 'import/url',
              url: `https://www.youtube.com/watch?v=${videoId}`,
              filename: `${getSafeValue(title)}.mp4`,
            },
            'convert-audio': {
              operation: 'convert',
              input: 'import-youtube',
              output_format: 'mp3',
              audio_codec: 'mp3',
              audio_bitrate: 320,
              audio_frequency: 44100,
            },
            'export-url': {
              operation: 'export/url',
              input: 'convert-audio',
              inline: false,
              archive_multiple_files: false,
            },
          },
          tag: 'youtube-conversion-sandbox',
          webhook_url: null,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        '⚠️ CloudConvert Sandbox API failed:',
        response.status,
        errorText
      );
      return {
        success: false,
        error: `CloudConvert Sandbox API failed: ${response.status}`,
      };
    }

    const data = await response.json();
    if (data.data && data.data.id) {
      console.log('✅ CloudConvert Sandbox API job created:', data.data.id);

      // Poll for job completion and get the download URL
      const downloadUrl = await pollCloudConvertJob(apiKey, data.data.id, true);
      if (downloadUrl) {
        // Try to download and store the MP3 file
        const storageResult = await downloadAndStoreMP3(
          downloadUrl,
          videoId,
          title,
          artist
        );

        if (storageResult.success && storageResult.file_url) {
          return {
            success: true,
            stream_url: downloadUrl, // Keep original download URL as fallback
            file_url: storageResult.file_url, // Supabase storage URL
            stored: true,
          };
        } else {
          console.log(
            '⚠️ Failed to store MP3 file, using direct URL:',
            storageResult.error
          );
          return {
            success: true,
            stream_url: downloadUrl,
            stored: false,
          };
        }
      } else {
        return {
          success: false,
          error: 'CloudConvert sandbox job failed or timed out',
        };
      }
    }

    console.log('⚠️ CloudConvert Sandbox API failed:', data);
    return { success: false, error: 'CloudConvert Sandbox API failed' };
  } catch (error) {
    console.error('❌ CloudConvert Sandbox API error:', error);
    return { success: false, error: 'CloudConvert Sandbox API failed' };
  }
}

// Cobalt.tools Conversion (Fallback 3)
async function tryCobaltToolsConversion(
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying Cobalt.tools conversion...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    // Try the correct Cobalt.tools domain
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        vFormat: 'mp3',
        vQuality: '320',
        aFormat: 'mp3',
        aQuality: '320',
        isAudioOnly: true,
        isNoTTWatermark: true,
        isTTFullAudio: true,
        isAudioMuted: false,
        disableMetadata: false,
      }),
    });

    if (!response.ok) {
      console.log('⚠️ Cobalt.tools conversion failed:', response.status);
      return { success: false, error: 'Cobalt.tools conversion failed' };
    }

    const data = await response.json();
    if (data.status === 'success' && data.url) {
      console.log('✅ Cobalt.tools conversion successful');

      // Try to download and store the MP3 file
      const storageResult = await downloadAndStoreMP3(
        data.url,
        videoId,
        title,
        artist
      );

      if (storageResult.success && storageResult.file_url) {
        return {
          success: true,
          stream_url: data.url, // Keep original download URL as fallback
          file_url: storageResult.file_url, // Supabase storage URL
          stored: true,
        };
      } else {
        console.log(
          '⚠️ Failed to store MP3 file, using direct URL:',
          storageResult.error
        );
        return {
          success: true,
          stream_url: data.url,
          stored: false,
        };
      }
    }

    console.log('⚠️ Cobalt.tools conversion failed:', data);
    return { success: false, error: 'Cobalt.tools conversion failed' };
  } catch (error) {
    console.error('❌ Cobalt.tools conversion error:', error);
    return { success: false, error: 'Cobalt.tools conversion failed' };
  }
}

// Fallback Conversion (Final)
async function tryFallbackConversion(
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    console.log('🔄 Trying fallback conversion...', {
      videoId,
      title: getSafeValue(title),
      artist: getSafeValue(artist),
      album: getSafeValue(album),
      duration,
      thumbnail_url: getSafeValue(thumbnail_url),
    });

    // Use the existing YouTube proxy endpoint as fallback
    const proxyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ragava.vercel.app'}/api/youtube-proxy/${videoId}`;

    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stream_url || data.url) {
          console.log('✅ Fallback conversion successful via YouTube proxy');
          return {
            success: true,
            stream_url: data.stream_url || data.url,
          };
        }
      }
    } catch (proxyError) {
      console.log('⚠️ YouTube proxy fallback failed:', proxyError);
    }

    // If proxy fails, try a simple YouTube URL as last resort
    console.log(
      '⚠️ All conversion methods failed, using YouTube URL as fallback'
    );
    return {
      success: true,
      stream_url: `https://youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    console.error('❌ Fallback conversion error:', error);
    return { success: false, error: 'Fallback conversion failed' };
  }
}

// Main conversion function
export async function convertYouTubeVideo(
  videoId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
  thumbnail_url?: string
): Promise<ConversionResponse> {
  try {
    if (!videoId) {
      return { success: false, error: 'Video ID is required' };
    }

    console.log('🎵 Starting YouTube conversion for:', title);

    // Try your existing RapidAPI with API Manager first (Primary)
    const rapidApiResult = await tryRapidAPIConversion(
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    if (rapidApiResult.success) {
      console.log('✅ RapidAPI conversion successful');
      return { ...rapidApiResult, method: 'rapidapi' };
    }

    console.log(
      '⚠️ RapidAPI conversion failed:',
      rapidApiResult.error,
      'trying GitLab CI/CD...'
    );

    // Fallback 1: GitLab CI/CD
    const gitlabResult = await tryGitLabConversion(
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    if (gitlabResult.success) {
      console.log('✅ GitLab CI/CD conversion successful');
      return { ...gitlabResult, method: 'gitlab-ci' };
    }

    console.log(
      '⚠️ GitLab CI/CD conversion failed:',
      gitlabResult.error,
      'trying CloudConvert...'
    );

    // Fallback 2: CloudConvert (Live + Sandbox)
    const cloudConvertResult = await tryCloudConvertConversion(
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    if (cloudConvertResult.success) {
      return { ...cloudConvertResult, method: 'cloudconvert' };
    }

    console.log('⚠️ CloudConvert conversion failed, trying Cobalt.tools...');

    // Fallback 3: Cobalt.tools
    const cobaltResult = await tryCobaltToolsConversion(
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    if (cobaltResult.success) {
      return { ...cobaltResult, method: 'cobalt' };
    }

    console.log('⚠️ Cobalt.tools conversion failed, using final fallback...');

    // Final fallback - use existing youtube-proxy
    const fallbackResult = await tryFallbackConversion(
      videoId,
      title,
      artist,
      album,
      duration,
      thumbnail_url
    );
    return { ...fallbackResult, method: 'fallback' };
  } catch (error) {
    console.error('❌ YouTube conversion error:', error);
    return { success: false, error: 'Conversion failed' };
  }
}
