# Ravana Changelog

## [Unreleased]

### Added
- YouTube Music integration via RapidAPI with direct MP3 streaming
- JioSaavn API integration with comprehensive search
- Universal play button functionality for all song sources
- Enhanced search results display with total count across all sources
- Loading indicators and visual feedback for song playback
- Comprehensive error handling and debugging for API integrations
- Database integration for YouTube Music songs with metadata storage
- Enhanced favorites functionality for all song types (local, API, YouTube Music)

### Changed
- **Search Results Enhancement**: Added prominent total results counter showing combined results from all sources (local + API + Saavn + YouTube Music)
- **Home Screen Consolidation**: Removed separate YouTube Music and JioSaavn sections, integrated all songs into existing "Recently Played" and "Personal Recommendations" sections
- **Enhanced Queue System**: Updated to handle both local and API songs seamlessly
- **Improved Trending Algorithm**: Implemented Spotify-like algorithm considering play count, recency, song age, and variety
- **Favorites System Overhaul**: Fixed to work with all song sources including proper database UUID handling
- **YouTube Music Integration**: Complete database integration with metadata storage and audio URL management
- **Error Handling**: Enhanced error messages and conflict resolution for database operations

### Fixed
- **Critical Favorites Bug**: Fixed favorites functionality for JioSaavn and YouTube Music songs
- **Database UUID Handling**: Resolved foreign key constraint errors when adding API songs to favorites
- **Search Results Display**: Fixed search results to show comprehensive total count across all sources
- **YouTube Music Playback**: Fixed YouTube Music songs to be properly saved to database with metadata
- **API Song Detection**: Enhanced logic to detect API songs by both prefixed IDs and database UUIDs
- **Source Preservation**: Fixed source field preservation in MusicSong objects for proper UI badges
- **React Linting**: Fixed unescaped quotes in JSX components

### Removed
- Random song and random playlist features
- Separate YouTube Music and JioSaavn sections (consolidated into existing sections)

## [1.0.0] - 2023-12-15

### Added
- Initial release with basic music player functionality
- Local song library support
- Playlist management
- Basic trending algorithm