-- =====================================================
-- Ragava Music Player - Public Database Schema (No Auth)
-- =====================================================
-- This file contains the complete database schema for the Ragava Music Player
-- Run this in your Supabase SQL Editor to set up everything at once
-- This version removes all user authentication dependencies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS playlist_songs CASCADE;
DROP TABLE IF EXISTS public_favorites CASCADE;
DROP TABLE IF EXISTS global_playback_queue CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS global_playback_state CASCADE;
DROP TABLE IF EXISTS songs CASCADE;

-- Create songs table for local music files
CREATE TABLE songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre VARCHAR(100),
    year INTEGER,
    duration INTEGER DEFAULT 0,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50),
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    bitrate INTEGER,
    sample_rate INTEGER,
    channels INTEGER,
    cover_image_url TEXT,
    is_favorite BOOLEAN DEFAULT false,
    play_count INTEGER DEFAULT 0,
    last_played TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create global_playback_state table for real-time sync (no user_id)
CREATE TABLE global_playback_state (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
    playback_time DECIMAL DEFAULT 0,
    is_playing BOOLEAN DEFAULT false,
    volume DECIMAL DEFAULT 0.7,
    repeat_mode TEXT DEFAULT 'off' CHECK (repeat_mode IN ('off', 'single', 'all')),
    shuffle BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlists table (no user_id)
CREATE TABLE playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_url TEXT,
    is_public BOOLEAN DEFAULT true,
    is_auto_generated BOOLEAN DEFAULT false,
    auto_generation_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_songs junction table
CREATE TABLE playlist_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, song_id)
);

-- Create public_favorites table (no user_id)
CREATE TABLE public_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create global_playback_queue table (no user_id)
CREATE TABLE global_playback_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Songs indexes
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_album ON songs(album);
CREATE INDEX idx_songs_genre ON songs(genre);
CREATE INDEX idx_songs_year ON songs(year);
CREATE INDEX idx_songs_duration ON songs(duration);
CREATE INDEX idx_songs_created_at ON songs(created_at);
CREATE INDEX idx_songs_play_count ON songs(play_count);
CREATE INDEX idx_songs_last_played ON songs(last_played);

-- Playlists indexes
CREATE INDEX idx_playlists_name ON playlists(name);
CREATE INDEX idx_playlists_is_public ON playlists(is_public);
CREATE INDEX idx_playlists_is_auto_generated ON playlists(is_auto_generated);
CREATE INDEX idx_playlists_created_at ON playlists(created_at);

-- Playlist songs indexes
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_song_id ON playlist_songs(song_id);
CREATE INDEX idx_playlist_songs_position ON playlist_songs(position);

-- Public favorites indexes
CREATE INDEX idx_public_favorites_song_id ON public_favorites(song_id);
CREATE INDEX idx_public_favorites_created_at ON public_favorites(created_at);

-- Global playback state indexes
CREATE INDEX idx_global_playback_state_current_song_id ON global_playback_state(current_song_id);
CREATE INDEX idx_global_playback_state_updated_at ON global_playback_state(updated_at);

-- Global playback queue indexes
CREATE INDEX idx_global_playback_queue_position ON global_playback_queue(position);
CREATE INDEX idx_global_playback_queue_song_id ON global_playback_queue(song_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_playback_state_updated_at BEFORE UPDATE ON global_playback_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert some sample playlists
INSERT INTO playlists (id, name, description, is_public, is_auto_generated, auto_generation_type) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Favorites', 'Auto-generated playlist of your favorite songs', true, true, 'favorites'),
    ('00000000-0000-0000-0000-000000000002', 'Recently Played', 'Auto-generated playlist of recently played songs', true, true, 'recent'),
    ('00000000-0000-0000-0000-000000000003', 'All Songs', 'Complete music library', true, true, 'all');

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_playback_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_playback_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anyone can read and write)
CREATE POLICY "Public read access" ON songs FOR SELECT USING (true);
CREATE POLICY "Public write access" ON songs FOR ALL USING (true);

CREATE POLICY "Public read access" ON playlists FOR SELECT USING (true);
CREATE POLICY "Public write access" ON playlists FOR ALL USING (true);

CREATE POLICY "Public read access" ON playlist_songs FOR SELECT USING (true);
CREATE POLICY "Public write access" ON playlist_songs FOR ALL USING (true);

CREATE POLICY "Public read access" ON public_favorites FOR SELECT USING (true);
CREATE POLICY "Public write access" ON public_favorites FOR ALL USING (true);

CREATE POLICY "Public read access" ON global_playback_state FOR SELECT USING (true);
CREATE POLICY "Public write access" ON global_playback_state FOR ALL USING (true);

CREATE POLICY "Public read access" ON global_playback_queue FOR SELECT USING (true);
CREATE POLICY "Public write access" ON global_playback_queue FOR ALL USING (true);

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions for anonymous users (public access)
GRANT SELECT ON songs TO anon;
GRANT SELECT ON playlists TO anon;
GRANT SELECT ON playlist_songs TO anon;
GRANT SELECT ON public_favorites TO anon;
GRANT ALL ON global_playback_state TO anon; -- Allow anon to update playback state
GRANT SELECT ON global_playback_queue TO anon;

-- Grant permissions for authenticated users (if any)
GRANT ALL ON songs TO authenticated;
GRANT ALL ON playlists TO authenticated;
GRANT ALL ON playlist_songs TO authenticated;
GRANT ALL ON public_favorites TO authenticated;
GRANT ALL ON global_playback_state TO authenticated;
GRANT ALL ON global_playback_queue TO authenticated;

-- Grant permissions for service role
GRANT ALL ON songs TO service_role;
GRANT ALL ON playlists TO service_role;
GRANT ALL ON playlist_songs TO service_role;
GRANT ALL ON public_favorites TO service_role;
GRANT ALL ON global_playback_state TO service_role;
GRANT ALL ON global_playback_queue TO service_role;

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Create storage bucket for music files (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('music-files', 'music-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for public access (read-only for existing files)
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'music-files');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Wave Music Player database schema has been successfully created! Your music app is now public and ready to use.' as message;



-- =====================================================
-- PLAY TRACKING TABLE
-- =====================================================

-- Create play_tracking table to track individual song plays
CREATE TABLE IF NOT EXISTS play_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    play_duration INTEGER DEFAULT 0, -- Duration in seconds (0 if skipped quickly)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRENDING SONGS TABLE
-- =====================================================

-- Create trending_songs table to store daily trending calculations
CREATE TABLE IF NOT EXISTS trending_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    play_count INTEGER NOT NULL DEFAULT 0,
    ranking INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(song_id, date)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Play tracking indexes
CREATE INDEX IF NOT EXISTS idx_play_tracking_song_id ON play_tracking(song_id);
CREATE INDEX IF NOT EXISTS idx_play_tracking_played_at ON play_tracking(played_at);

-- Trending songs indexes
CREATE INDEX IF NOT EXISTS idx_trending_songs_song_id ON trending_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_trending_songs_date ON trending_songs(date);
CREATE INDEX IF NOT EXISTS idx_trending_songs_ranking ON trending_songs(ranking);
CREATE INDEX IF NOT EXISTS idx_trending_songs_play_count ON trending_songs(play_count);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update trending songs for a specific date
CREATE OR REPLACE FUNCTION update_trending_songs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    -- Delete existing trending data for the target date
    DELETE FROM trending_songs WHERE date = target_date;
    
    -- Insert new trending data based on play counts from the last 7 days
    INSERT INTO trending_songs (song_id, play_count, ranking, date)
    SELECT 
        pt.song_id,
        COUNT(*) as play_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as ranking,
        target_date
    FROM play_tracking pt
    WHERE pt.played_at >= (target_date - INTERVAL '7 days')::timestamp
      AND pt.played_at <= (target_date + INTERVAL '1 day')::timestamp
    GROUP BY pt.song_id
    HAVING COUNT(*) > 0
    ORDER BY play_count DESC
    LIMIT 50; -- Top 50 trending songs
END;
$$ LANGUAGE plpgsql;

-- Function to increment play count and track play
CREATE OR REPLACE FUNCTION track_song_play(
    p_song_id UUID,
    p_play_duration INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    -- Update the song's play count
    UPDATE songs 
    SET 
        play_count = play_count + 1,
        last_played = NOW(),
        updated_at = NOW()
    WHERE id = p_song_id;
    
    -- Track the individual play
    INSERT INTO play_tracking (song_id, play_duration)
    VALUES (p_song_id, p_play_duration);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp for trending_songs
CREATE TRIGGER update_trending_songs_updated_at 
    BEFORE UPDATE ON trending_songs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE play_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_songs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public read access" ON play_tracking FOR SELECT USING (true);
CREATE POLICY "Public write access" ON play_tracking FOR ALL USING (true);

CREATE POLICY "Public read access" ON trending_songs FOR SELECT USING (true);
CREATE POLICY "Public write access" ON trending_songs FOR ALL USING (true);

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions for anonymous users
GRANT SELECT ON play_tracking TO anon;
GRANT SELECT ON trending_songs TO anon;

-- Grant permissions for authenticated users
GRANT ALL ON play_tracking TO authenticated;
GRANT ALL ON trending_songs TO authenticated;

-- Grant permissions for service role
GRANT ALL ON play_tracking TO service_role;
GRANT ALL ON trending_songs TO service_role;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create initial trending data for today
SELECT update_trending_songs(CURRENT_DATE);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Trending songs migration completed successfully! Play tracking and trending functionality is now available.' as message;


-- =====================================================
-- API Songs Integration Migration
-- =====================================================
-- This migration adds support for API songs to work with favorites, playlists, and all app features

-- Create api_songs table to store songs from external APIs
CREATE TABLE IF NOT EXISTS api_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL UNIQUE, -- Original API song ID (e.g., "Q6l0a09y")
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre VARCHAR(100),
    year INTEGER,
    duration INTEGER DEFAULT 0,
    stream_url TEXT NOT NULL,
    cover_url TEXT,
    preview_url TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'api', -- 'saavn', 'spotify', etc.
    language VARCHAR(50),
    release_date VARCHAR(50),
    play_count INTEGER DEFAULT 0,
    last_played TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_favorites table for API song favorites
CREATE TABLE IF NOT EXISTS api_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_playlist_songs table for API songs in playlists
CREATE TABLE IF NOT EXISTS api_playlist_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, song_id)
);

-- Create api_play_tracking table for API song play tracking
CREATE TABLE IF NOT EXISTS api_play_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    play_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_trending_songs table for API song trending
CREATE TABLE IF NOT EXISTS api_trending_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    play_count INTEGER NOT NULL DEFAULT 0,
    ranking INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(song_id, date)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- API songs indexes
CREATE INDEX IF NOT EXISTS idx_api_songs_external_id ON api_songs(external_id);
CREATE INDEX IF NOT EXISTS idx_api_songs_title ON api_songs(title);
CREATE INDEX IF NOT EXISTS idx_api_songs_artist ON api_songs(artist);
CREATE INDEX IF NOT EXISTS idx_api_songs_album ON api_songs(album);
CREATE INDEX IF NOT EXISTS idx_api_songs_genre ON api_songs(genre);
CREATE INDEX IF NOT EXISTS idx_api_songs_year ON api_songs(year);
CREATE INDEX IF NOT EXISTS idx_api_songs_duration ON api_songs(duration);
CREATE INDEX IF NOT EXISTS idx_api_songs_source ON api_songs(source);
CREATE INDEX IF NOT EXISTS idx_api_songs_created_at ON api_songs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_songs_play_count ON api_songs(play_count);
CREATE INDEX IF NOT EXISTS idx_api_songs_last_played ON api_songs(last_played);

-- API favorites indexes
CREATE INDEX IF NOT EXISTS idx_api_favorites_song_id ON api_favorites(song_id);
CREATE INDEX IF NOT EXISTS idx_api_favorites_created_at ON api_favorites(created_at);

-- API playlist songs indexes
CREATE INDEX IF NOT EXISTS idx_api_playlist_songs_playlist_id ON api_playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_api_playlist_songs_song_id ON api_playlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_api_playlist_songs_position ON api_playlist_songs(position);

-- API play tracking indexes
CREATE INDEX IF NOT EXISTS idx_api_play_tracking_song_id ON api_play_tracking(song_id);
CREATE INDEX IF NOT EXISTS idx_api_play_tracking_played_at ON api_play_tracking(played_at);

-- API trending songs indexes
CREATE INDEX IF NOT EXISTS idx_api_trending_songs_song_id ON api_trending_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_api_trending_songs_date ON api_trending_songs(date);
CREATE INDEX IF NOT EXISTS idx_api_trending_songs_ranking ON api_trending_songs(ranking);
CREATE INDEX IF NOT EXISTS idx_api_trending_songs_play_count ON api_trending_songs(play_count);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get or create API song
CREATE OR REPLACE FUNCTION get_or_create_api_song(
    p_external_id VARCHAR(255),
    p_title VARCHAR(255),
    p_artist VARCHAR(255),
    p_album VARCHAR(255) DEFAULT NULL,
    p_genre VARCHAR(100) DEFAULT NULL,
    p_year INTEGER DEFAULT NULL,
    p_duration INTEGER DEFAULT 0,
    p_stream_url TEXT DEFAULT NULL,
    p_cover_url TEXT DEFAULT NULL,
    p_preview_url TEXT DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'api',
    p_language VARCHAR(50) DEFAULT NULL,
    p_release_date VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    song_id UUID;
BEGIN
    -- Try to find existing song
    SELECT id INTO song_id 
    FROM api_songs 
    WHERE external_id = p_external_id;
    
    -- If not found, create new song
    IF song_id IS NULL THEN
        INSERT INTO api_songs (
            external_id, title, artist, album, genre, year, duration,
            stream_url, cover_url, preview_url, source, language, release_date
        ) VALUES (
            p_external_id, p_title, p_artist, p_album, p_genre, p_year, p_duration,
            p_stream_url, p_cover_url, p_preview_url, p_source, p_language, p_release_date
        ) RETURNING id INTO song_id;
    END IF;
    
    RETURN song_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track API song play
CREATE OR REPLACE FUNCTION track_api_song_play(
    p_song_id UUID,
    p_play_duration INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    -- Update the song's play count
    UPDATE api_songs 
    SET 
        play_count = play_count + 1,
        last_played = NOW(),
        updated_at = NOW()
    WHERE id = p_song_id;
    
    -- Track the individual play
    INSERT INTO api_play_tracking (song_id, play_duration)
    VALUES (p_song_id, p_play_duration);
END;
$$ LANGUAGE plpgsql;

-- Function to update API trending songs
CREATE OR REPLACE FUNCTION update_api_trending_songs(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    -- Delete existing trending data for the target date
    DELETE FROM api_trending_songs WHERE date = target_date;
    
    -- Insert new trending data based on play counts from the last 7 days
    INSERT INTO api_trending_songs (song_id, play_count, ranking, date)
    SELECT 
        pt.song_id,
        COUNT(*) as play_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as ranking,
        target_date
    FROM api_play_tracking pt
    WHERE pt.played_at >= (target_date - INTERVAL '7 days')::timestamp
      AND pt.played_at <= (target_date + INTERVAL '1 day')::timestamp
    GROUP BY pt.song_id
    HAVING COUNT(*) > 0
    ORDER BY play_count DESC
    LIMIT 50; -- Top 50 trending API songs
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp for api_songs
CREATE TRIGGER update_api_songs_updated_at 
    BEFORE UPDATE ON api_songs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp for api_trending_songs
CREATE TRIGGER update_api_trending_songs_updated_at 
    BEFORE UPDATE ON api_trending_songs
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE api_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_play_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_trending_songs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Public read access" ON api_songs FOR SELECT USING (true);
CREATE POLICY "Public write access" ON api_songs FOR ALL USING (true);

CREATE POLICY "Public read access" ON api_favorites FOR SELECT USING (true);
CREATE POLICY "Public write access" ON api_favorites FOR ALL USING (true);

CREATE POLICY "Public read access" ON api_playlist_songs FOR SELECT USING (true);
CREATE POLICY "Public write access" ON api_playlist_songs FOR ALL USING (true);

CREATE POLICY "Public read access" ON api_play_tracking FOR SELECT USING (true);
CREATE POLICY "Public write access" ON api_play_tracking FOR ALL USING (true);

CREATE POLICY "Public read access" ON api_trending_songs FOR SELECT USING (true);
CREATE POLICY "Public write access" ON api_trending_songs FOR ALL USING (true);

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant permissions for anonymous users
GRANT SELECT ON api_songs TO anon;
GRANT SELECT ON api_favorites TO anon;
GRANT SELECT ON api_playlist_songs TO anon;
GRANT SELECT ON api_play_tracking TO anon;
GRANT SELECT ON api_trending_songs TO anon;

-- Grant permissions for authenticated users
GRANT ALL ON api_songs TO authenticated;
GRANT ALL ON api_favorites TO authenticated;
GRANT ALL ON api_playlist_songs TO authenticated;
GRANT ALL ON api_play_tracking TO authenticated;
GRANT ALL ON api_trending_songs TO authenticated;

-- Grant permissions for service role
GRANT ALL ON api_songs TO service_role;
GRANT ALL ON api_favorites TO service_role;
GRANT ALL ON api_playlist_songs TO authenticated;
GRANT ALL ON api_play_tracking TO service_role;
GRANT ALL ON api_trending_songs TO service_role;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'API songs integration migration completed successfully! API songs can now be added to favorites and playlists.' as message;


-- Add API songs support to existing schema
-- Run this in your Supabase SQL Editor

-- Create api_songs table to store songs from external APIs
CREATE TABLE IF NOT EXISTS api_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL UNIQUE, -- Original API song ID (e.g., "JVlSr23X")
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre VARCHAR(100),
    year INTEGER,
    duration INTEGER DEFAULT 0,
    stream_url TEXT NOT NULL,
    cover_url TEXT,
    preview_url TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'api', -- 'saavn', 'spotify', etc.
    language VARCHAR(50),
    release_date VARCHAR(50),
    play_count INTEGER DEFAULT 0,
    last_played TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_favorites table for API song favorites
CREATE TABLE IF NOT EXISTS api_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_playlist_songs table for API songs in playlists
CREATE TABLE IF NOT EXISTS api_playlist_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, song_id)
);

-- Create api_play_tracking table for API song play tracking
CREATE TABLE IF NOT EXISTS api_play_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    play_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_trending_songs table for API song trending
CREATE TABLE IF NOT EXISTS api_trending_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    song_id UUID NOT NULL REFERENCES api_songs(id) ON DELETE CASCADE,
    play_count INTEGER NOT NULL DEFAULT 0,
    ranking INTEGER NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(song_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_songs_external_id ON api_songs(external_id);
CREATE INDEX IF NOT EXISTS idx_api_songs_title ON api_songs(title);
CREATE INDEX IF NOT EXISTS idx_api_songs_artist ON api_songs(artist);
CREATE INDEX IF NOT EXISTS idx_api_favorites_song_id ON api_favorites(song_id);
CREATE INDEX IF NOT EXISTS idx_api_playlist_songs_playlist_id ON api_playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_api_playlist_songs_song_id ON api_playlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_api_play_tracking_song_id ON api_play_tracking(song_id);
CREATE INDEX IF NOT EXISTS idx_api_trending_songs_song_id ON api_trending_songs(song_id);

-- Function to get or create API song
CREATE OR REPLACE FUNCTION get_or_create_api_song(
    p_external_id VARCHAR(255),
    p_title VARCHAR(255),
    p_artist VARCHAR(255),
    p_album VARCHAR(255) DEFAULT NULL,
    p_genre VARCHAR(100) DEFAULT NULL,
    p_year INTEGER DEFAULT NULL,
    p_duration INTEGER DEFAULT 0,
    p_stream_url TEXT DEFAULT NULL,
    p_cover_url TEXT DEFAULT NULL,
    p_preview_url TEXT DEFAULT NULL,
    p_source VARCHAR(50) DEFAULT 'api',
    p_language VARCHAR(50) DEFAULT NULL,
    p_release_date VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    song_id UUID;
BEGIN
    -- Try to find existing song
    SELECT id INTO song_id 
    FROM api_songs 
    WHERE external_id = p_external_id;
    
    -- If not found, create new song
    IF song_id IS NULL THEN
        INSERT INTO api_songs (
            external_id, title, artist, album, genre, year, duration,
            stream_url, cover_url, preview_url, source, language, release_date
        ) VALUES (
            p_external_id, p_title, p_artist, p_album, p_genre, p_year, p_duration,
            p_stream_url, p_cover_url, p_preview_url, p_source, p_language, p_release_date
        ) RETURNING id INTO song_id;
    END IF;
    
    RETURN song_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track API song play
CREATE OR REPLACE FUNCTION track_api_song_play(
    p_song_id UUID,
    p_play_duration INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    -- Update the song's play count
    UPDATE api_songs 
    SET 
        play_count = play_count + 1,
        last_played = NOW(),
        updated_at = NOW()
    WHERE id = p_song_id;
    
    -- Track the individual play
    INSERT INTO api_play_tracking (song_id, play_duration)
    VALUES (p_song_id, p_play_duration);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE api_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_play_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_trending_songs ENABLE ROW LEVEL SECURITY;


-- Grant permissions
GRANT ALL ON api_songs TO anon, authenticated, service_role;
GRANT ALL ON api_favorites TO anon, authenticated, service_role;
GRANT ALL ON api_playlist_songs TO anon, authenticated, service_role;
GRANT ALL ON api_play_tracking TO anon, authenticated, service_role;
GRANT ALL ON api_trending_songs TO anon, authenticated, service_role;

SELECT 'API songs tables created successfully!' as message;

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  api_key_hash VARCHAR(64) NOT NULL, -- Hash of the API key for security
  host VARCHAR(255) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  requests_used INTEGER DEFAULT 0,
  max_requests INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  key_index INTEGER NOT NULL,
  endpoint_index INTEGER NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_usage_key_hash ON api_usage(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_active ON api_usage(is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_requests ON api_usage(requests_used, max_requests);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_api_usage_updated_at 
    BEFORE UPDATE ON api_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial API configurations (will be populated by the application)
-- This is just a template, actual data will be inserted by the API manager

