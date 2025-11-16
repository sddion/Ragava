import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface StorageUploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
}

/**
 * Downloads a file from a URL and uploads it to Supabase storage
 */
export async function downloadAndUploadToStorage(
  downloadUrl: string,
  fileName: string,
  bucketName: string = 'audio-files'
): Promise<StorageUploadResult> {
  try {
    console.log(`📥 Downloading file from: ${downloadUrl}`);

    // Download the file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`
      );
    }

    const fileBuffer = await response.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: 'audio/mpeg' });

    console.log(`📤 Uploading file to Supabase storage: ${fileName}`);

    // Upload to Supabase storage
    const { data: uploadData, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBlob, {
        contentType: 'audio/mpeg',
        upsert: true, // Overwrite if file exists
      });

    if (error) {
      console.error('❌ Supabase storage upload error:', error);
      return {
        success: false,
        error: `Storage upload failed: ${error.message}`,
      };
    }

    // Log successful upload with file path
    console.log(`✅ File uploaded successfully to path: ${uploadData.path}`);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);

    return {
      success: true,
      fileUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('❌ Download and upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Uploads a file buffer directly to Supabase storage
 */
export async function uploadBufferToStorage(
  buffer: ArrayBuffer,
  fileName: string,
  bucketName: string = 'audio-files'
): Promise<StorageUploadResult> {
  try {
    console.log(`📤 Uploading buffer to Supabase storage: ${fileName}`);

    const fileBlob = new Blob([buffer], { type: 'audio/mpeg' });

    const { data: uploadData, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) {
      console.error('❌ Supabase storage upload error:', error);
      return {
        success: false,
        error: `Storage upload failed: ${error.message}`,
      };
    }

    // Log successful upload with file path
    console.log(`✅ Buffer uploaded successfully to path: ${uploadData.path}`);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);

    return {
      success: true,
      fileUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('❌ Buffer upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Deletes a file from Supabase storage
 */
export async function deleteFromStorage(
  fileName: string,
  bucketName: string = 'audio-files'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🗑️ Deleting file from storage: ${fileName}`);

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error('❌ Storage deletion error:', error);
      return {
        success: false,
        error: `Storage deletion failed: ${error.message}`,
      };
    }

    console.log(`✅ File deleted successfully: ${fileName}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generates a unique filename for audio files
 */
export function generateAudioFileName(
  videoId: string,
  title: string,
  artist: string
): string {
  // Sanitize filename components
  const sanitize = (str: string) =>
    str
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

  const sanitizedTitle = sanitize(title);
  const sanitizedArtist = sanitize(artist);

  return `youtube_${videoId}_${sanitizedArtist}_${sanitizedTitle}.mp3`;
}

/**
 * Checks if a file exists in Supabase storage
 */
export async function fileExistsInStorage(
  fileName: string,
  bucketName: string = 'audio-files'
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(bucketName).list('', {
      search: fileName,
    });

    if (error) {
      console.error('❌ Storage check error:', error);
      return false;
    }

    return data.some(file => file.name === fileName);
  } catch (error) {
    console.error('❌ File existence check error:', error);
    return false;
  }
}
