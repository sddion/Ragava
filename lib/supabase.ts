import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}


export interface Song {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  file_url: string
  cover_url?: string
  created_at: string
  updated_at: string
}

export interface Playlist {
  id: string
  name: string
  description?: string
  cover_url?: string
  user_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface PlaylistSong {
  id: string
  playlist_id: string
  song_id: string
  position: number
  added_at: string
}

export interface UserFavorite {
  id: string
  user_id: string
  song_id: string
  created_at: string
}

export interface User {
  id: string
  email: string
  username?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Legacy export for backward compatibility
export const supabase = createClient()
