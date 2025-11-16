/**
 * API Manager for handling multiple RapidAPI keys and request counting
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import crypto from 'crypto';

interface ApiKey {
  key: string;
  host: string;
  endpoint: string;
  method: string;
  requestsUsed: number;
  maxRequests: number;
  isActive: boolean;
  keyIndex: number;
  endpointIndex: number;
  isUnlimited: boolean;
}

interface ApiUsage {
  [key: string]: number;
}

interface DatabaseApiUsage {
  id: number;
  api_key_hash: string;
  host: string;
  endpoint: string;
  method: string;
  requests_used: number;
  max_requests: number;
  is_active: boolean;
  key_index: number;
  endpoint_index: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface ApiResponseData {
  status: string;
  link?: string;
  title?: string;
  filesize?: number;
  duration?: number;
  url?: string;
  download_url?: string;
  filename?: string;
  size?: number;
  video_title?: string;
  file_size?: number;
  video_duration?: number;
  mp3_url?: string;
}

class ApiManager {
  private apiKeys: ApiKey[] = [];
  private currentKeyIndex = 0;
  private isInitialized = false;

  constructor() {
    this.initializeApiKeys();
    // Don't call loadUsage() in constructor - it will be called lazily when needed
  }

  private async getSupabaseClient() {
    return await createServerSupabaseClient();
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.loadUsage();
      this.isInitialized = true;
    }
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private initializeApiKeys() {
    // Only initialize APIs if environment variables are properly set
    if (!process.env.RAPIDAPI_KEY) {
      console.warn('⚠️ RAPIDAPI_KEY not found in environment variables');
      return;
    }

    // Define the available API keys
    const availableKeys = [
      process.env.RAPIDAPI_KEY,
      process.env.RAPIDAPI_KEY_2,
      process.env.RAPIDAPI_KEY_3,
    ].filter(Boolean); // Remove undefined keys

    // Define the endpoints (prioritize working endpoint, then others)
    const endpoints = [
      {
        host: 'youtube-mp36.p.rapidapi.com',
        endpoint: 'https://youtube-mp36.p.rapidapi.com/dl',
        method: 'GET',
        isUnlimited: false,
        maxRequests: 100, // 100 request limit (Primary - working)
      },
      {
        host: 'youtube-mp3-2025.p.rapidapi.com',
        endpoint:
          'https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio',
        method: 'POST',
        isUnlimited: false,
        maxRequests: 100, // 100 request limit (Secondary)
      },
      {
        host: 'youtube-to-mp315.p.rapidapi.com',
        endpoint: 'https://youtube-to-mp315.p.rapidapi.com/status',
        method: 'GET',
        isUnlimited: true, // Free unlimited endpoint (Tertiary - not working with my format)
      },
    ];

    // Create API configurations for each key-endpoint combination
    availableKeys.forEach((key, keyIndex) => {
      if (key) {
        // Ensure key is not undefined
        endpoints.forEach((endpoint, endpointIndex) => {
          this.apiKeys.push({
            key: key,
            host: endpoint.host,
            endpoint: endpoint.endpoint,
            method: endpoint.method,
            requestsUsed: 0,
            maxRequests: endpoint.isUnlimited
              ? 999999
              : endpoint.maxRequests || 100, // Use endpoint-specific limit
            isActive: true,
            keyIndex: keyIndex,
            endpointIndex: endpointIndex,
            isUnlimited: endpoint.isUnlimited,
          });
        });
      }
    });

    console.log(
      `📊 Initialized ${this.apiKeys.length} API configurations with ${availableKeys.length} keys`
    );
  }

  private async loadUsage() {
    try {
      // Load API usage from Supabase database
      const supabase = await this.getSupabaseClient();
      const { data: usageData, error } = await supabase
        .from('api_usage')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Failed to load API usage from database:', error);
        return;
      }

      // Update in-memory API keys with database data
      if (usageData && usageData.length > 0) {
        this.apiKeys.forEach(apiKey => {
          const dbRecord = usageData.find(
            (record: DatabaseApiUsage) =>
              record.api_key_hash === this.hashApiKey(apiKey.key) &&
              record.host === apiKey.host
          );

          if (dbRecord) {
            apiKey.requestsUsed = dbRecord.requests_used;
            apiKey.maxRequests = dbRecord.max_requests;
            apiKey.isActive = dbRecord.is_active;
          }
        });
      } else {
        // No data in database, initialize with default values
        await this.initializeDatabase();
      }

      console.log(
        '📊 API Manager initialized with',
        this.apiKeys.length,
        'configurations'
      );
    } catch (error) {
      console.error('Failed to load API usage:', error);
    }
  }

  private async initializeDatabase() {
    try {
      console.log('🔄 Initializing API usage database...');

      // Insert all API configurations into the database
      const insertData = this.apiKeys.map(apiKey => ({
        api_key_hash: this.hashApiKey(apiKey.key),
        host: apiKey.host,
        endpoint: apiKey.endpoint,
        method: apiKey.method,
        requests_used: apiKey.requestsUsed,
        max_requests: apiKey.maxRequests,
        is_active: apiKey.isActive,
        key_index: apiKey.keyIndex,
        endpoint_index: apiKey.endpointIndex,
      }));

      const supabase = await this.getSupabaseClient();
      const { error } = await supabase.from('api_usage').insert(insertData);

      if (error) {
        console.error('Failed to initialize database:', error);
      } else {
        console.log(
          '✅ Database initialized with',
          insertData.length,
          'API configurations'
        );
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async saveUsage() {
    try {
      // Save API usage to Supabase database
      const supabase = await this.getSupabaseClient();

      for (const apiKey of this.apiKeys) {
        const { error } = await supabase
          .from('api_usage')
          .update({
            requests_used: apiKey.requestsUsed,
            max_requests: apiKey.maxRequests,
            is_active: apiKey.isActive,
            last_used_at: new Date().toISOString(),
          })
          .eq('api_key_hash', this.hashApiKey(apiKey.key))
          .eq('host', apiKey.host);

        if (error) {
          console.error(
            'Failed to save API usage for',
            apiKey.host,
            ':',
            error
          );
        }
      }

      console.log('💾 API usage saved to database');
    } catch (error) {
      console.error('Failed to save API usage:', error);
    }
  }

  public getCurrentApiKey(): ApiKey | null {
    if (this.apiKeys.length === 0) {
      console.error(
        '❌ No API keys configured. Please set RAPIDAPI_KEY environment variable.'
      );
      return null;
    }

    // Try endpoints in order (first endpoint is now the working one)
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
      const apiKey = this.apiKeys[keyIndex];

      if (apiKey.isActive && apiKey.requestsUsed < apiKey.maxRequests) {
        return apiKey;
      }
    }

    console.warn('⚠️ All API keys have exceeded their limits or are inactive');
    return null;
  }

  public async recordRequest(apiKey: ApiKey, success: boolean = true) {
    await this.ensureInitialized();
    if (success) {
      apiKey.requestsUsed++;
      console.log(
        `📈 API Key ${apiKey.host} usage: ${apiKey.requestsUsed}/${apiKey.maxRequests}`
      );

      if (apiKey.requestsUsed >= apiKey.maxRequests) {
        console.log(
          `🚫 API Key ${apiKey.host} limit reached, switching to next key`
        );
        apiKey.isActive = false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      }
    }

    // Save to database immediately
    await this.saveUsage();
  }

  public getApiStatus() {
    return this.apiKeys.map(key => ({
      host: key.host,
      requestsUsed: key.requestsUsed,
      maxRequests: key.maxRequests,
      isActive: key.isActive,
      remaining: key.maxRequests - key.requestsUsed,
      isUnlimited: key.isUnlimited,
    }));
  }

  public async makeRequest(
    videoId: string
  ): Promise<{
    success: boolean;
    data?: ApiResponseData;
    error?: string;
    apiKey?: ApiKey;
  }> {
    await this.ensureInitialized();
    const apiKey = this.getCurrentApiKey();

    if (!apiKey) {
      if (this.apiKeys.length === 0) {
        return {
          success: false,
          error:
            'No API keys configured. Please set RAPIDAPI_KEY environment variable.',
        };
      }
      return {
        success: false,
        error: 'All API keys have exceeded their limits',
      };
    }

    try {
      let url: string;
      const options: FetchOptions = {
        method: apiKey.method,
        headers: {
          'x-rapidapi-key': apiKey.key,
          'x-rapidapi-host': apiKey.host,
        },
      };

      // Build URL and options based on endpoint type
      if (apiKey.host === 'youtube-to-mp315.p.rapidapi.com') {
        url = `${apiKey.endpoint}/${videoId}`;
      } else if (apiKey.host === 'youtube-mp36.p.rapidapi.com') {
        url = `${apiKey.endpoint}?id=${videoId}`;
      } else if (apiKey.host === 'youtube-mp3-2025.p.rapidapi.com') {
        // POST endpoint: URL without query, body carries id
        url = `${apiKey.endpoint}`;
      } else {
        url = `${apiKey.endpoint}?id=${videoId}`;
      }

      // Add Content-Type for POST requests
      if (apiKey.method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        // Build POST body per endpoint
        if (apiKey.host === 'youtube-mp3-2025.p.rapidapi.com') {
          // This endpoint expects { id }
          options.body = JSON.stringify({ id: videoId });
        } else {
          options.body = JSON.stringify({});
        }
      }

      const endpointType = apiKey.isUnlimited ? '🆓 UNLIMITED' : '📊 LIMITED';
      console.log(
        `🎯 Using API: ${apiKey.host} ${endpointType} (${apiKey.requestsUsed + 1}/${apiKey.maxRequests}) - Key ${apiKey.keyIndex + 1}: ${apiKey.key.substring(0, 8)}***`
      );

      const response = await fetch(url, options);

      if (!response.ok) {
        const error = `API request failed: ${response.status} ${response.statusText}`;
        console.error(`❌ ${apiKey.host}: ${error}`);
        await this.recordRequest(apiKey, false);
        return { success: false, error, apiKey };
      }

      const data: ApiResponseData = await response.json();

      // Normalize response format for different endpoints
      let normalizedData: ApiResponseData = data;
      if (apiKey.host === 'youtube-to-mp315.p.rapidapi.com') {
        // This endpoint returns different format, normalize to match expected format
        normalizedData = {
          status: 'ok',
          link: data.url || data.link || data.download_url || data.mp3_url,
          title:
            data.title || data.filename || data.video_title || 'YouTube Audio',
          filesize: data.filesize || data.size || data.file_size || undefined,
          duration: data.duration || data.video_duration || undefined,
        };
      } else if (apiKey.host === 'youtube-mp3-2025.p.rapidapi.com') {
        // Normalize youtube-mp3-2025 response (prefers linkDownload/linkStream)
        const responseData = data as {
          linkDownload?: string;
          linkStream?: string;
          url?: string;
          link?: string;
          download_url?: string;
          title?: string;
          video_title?: string;
          filesize?: number;
          size?: number;
          file_size?: number;
          lengthSeconds?: string;
          duration?: number;
          video_duration?: number;
        };
        normalizedData = {
          status: 'ok',
          link:
            responseData.linkDownload ||
            responseData.linkStream ||
            responseData.url ||
            responseData.link ||
            responseData.download_url,
          title:
            responseData.title || responseData.video_title || 'YouTube Audio',
          filesize:
            responseData.filesize ||
            responseData.size ||
            responseData.file_size ||
            undefined,
          duration: responseData.lengthSeconds
            ? Number(responseData.lengthSeconds)
            : responseData.duration || responseData.video_duration || undefined,
        };
      }

      await this.recordRequest(apiKey, true);

      return { success: true, data: normalizedData, apiKey };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${apiKey.host}: ${errorMessage}`);
      await this.recordRequest(apiKey, false);
      return { success: false, error: errorMessage, apiKey };
    }
  }
}

// Export singleton instance with lazy initialization
let _apiManager: ApiManager | null = null;

export function getApiManager(): ApiManager {
  if (!_apiManager) {
    _apiManager = new ApiManager();
  }
  return _apiManager;
}

// For backward compatibility, export a getter
export const apiManager = {
  get makeRequest() {
    return getApiManager().makeRequest.bind(getApiManager());
  },
  get recordRequest() {
    return getApiManager().recordRequest.bind(getApiManager());
  },
  get getApiStatus() {
    return getApiManager().getApiStatus.bind(getApiManager());
  },
  get getCurrentApiKey() {
    return getApiManager().getCurrentApiKey.bind(getApiManager());
  },
};

export type { ApiKey, ApiUsage };
