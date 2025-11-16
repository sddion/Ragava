# 🏗️ WaveMusic API Architecture

## System Overview

WaveMusic is a sophisticated multi-source music streaming API that aggregates content from multiple providers and provides a unified interface for music discovery and playback.

## Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Applications]
        MOBILE[Mobile Apps]
        API_CLIENT[Third-party Clients]
    end

    subgraph "API Gateway Layer"
        SEARCH[Search API]
        STREAM[Stream API]
        PLAYLIST[Playlist API]
        FAVORITES[Favorites API]
        TRENDING[Trending API]
        PROXY[Proxy APIs]
    end

    subgraph "External Music Sources"
        SAAVN[JioSaavn API]
        YTMUSIC[YouTube Music API]
        RAPIDAPI[RapidAPI Services]
        COBALT[Cobalt.tools]
    end

    subgraph "Data Layer"
        SUPABASE[(Supabase Database)]
        STORAGE[(File Storage)]
        CACHE[(Redis Cache)]
    end

    subgraph "Processing Layer"
        CONVERTER[Audio Converter]
        TRACKER[Play Tracker]
        ANALYTICS[Analytics Engine]
    end

    WEB --> SEARCH
    MOBILE --> STREAM
    API_CLIENT --> PLAYLIST

    SEARCH --> PROXY
    STREAM --> PROXY
    PROXY --> SAAVN
    PROXY --> YTMUSIC
    PROXY --> RAPIDAPI
    PROXY --> COBALT

    SEARCH --> SUPABASE
    PLAYLIST --> SUPABASE
    FAVORITES --> SUPABASE
    TRENDING --> SUPABASE

    STREAM --> STORAGE
    CONVERTER --> STORAGE
    TRACKER --> ANALYTICS
    ANALYTICS --> TRENDING
```

## Data Flow Architecture

### Search Flow

```mermaid
sequenceDiagram
    participant Client
    participant SearchAPI
    participant Database
    participant SaavnProxy
    participant YTMusicProxy
    participant Response

    Client->>SearchAPI: POST /api/search-all
    SearchAPI->>Database: Query Local Songs
    SearchAPI->>SaavnProxy: Query JioSaavn
    SearchAPI->>YTMusicProxy: Query YouTube Music

    par Parallel Processing
        Database-->>SearchAPI: Local Results
    and
        SaavnProxy-->>SearchAPI: Saavn Results
    and
        YTMusicProxy-->>SearchAPI: YT Music Results
    end

    SearchAPI->>Database: Cache External Songs
    SearchAPI->>Response: Normalize & Combine
    Response-->>Client: Unified Results
```

### Streaming Flow

```mermaid
sequenceDiagram
    participant Client
    participant StreamAPI
    participant Database
    participant Converter
    participant Storage
    participant External

    Client->>StreamAPI: GET /api/stream/[id]
    StreamAPI->>Database: Check Cache

    alt Song Not Cached
        StreamAPI->>External: Request Conversion
        External-->>Converter: Audio Data
        Converter->>Storage: Store MP3
        Converter->>Database: Save Metadata
    end

    StreamAPI->>Storage: Get Audio File
    Storage-->>StreamAPI: Audio Stream
    StreamAPI-->>Client: Stream Response
```

## API Layer Architecture

### Core APIs

```mermaid
graph LR
    subgraph "Core APIs"
        SEARCH[Search API]
        SONGS[Songs API]
        STREAM[Stream API]
        TRENDING[Trending API]
    end

    subgraph "User APIs"
        FAVORITES[Favorites API]
        PLAYLISTS[Playlist API]
        TRACKING[Tracking API]
    end

    subgraph "External APIs"
        SAAVN_PROXY[Saavn Proxy]
        YT_PROXY[YouTube Proxy]
        CONVERT[Convert API]
    end

    subgraph "Utility APIs"
        HEALTH[Health API]
        LOGS[Logs API]
        CRON[Cron API]
    end
```

## Database Schema

### Core Tables

```mermaid
erDiagram
    songs {
        uuid id PK
        varchar title
        varchar artist
        varchar album
        integer duration
        text file_url
        text cover_image_url
        integer play_count
        timestamp created_at
    }

    api_songs {
        uuid id PK
        varchar external_id UK
        varchar title
        varchar artist
        varchar album
        text stream_url
        varchar source
        integer play_count
        timestamp created_at
    }

    playlists {
        uuid id PK
        varchar name
        text description
        boolean is_public
        timestamp created_at
    }

    playlist_songs {
        uuid id PK
        uuid playlist_id FK
        uuid song_id FK
        integer position
    }

    public_favorites {
        uuid id PK
        uuid song_id FK
        timestamp created_at
    }

    trending_songs {
        uuid id PK
        uuid song_id FK
        integer play_count
        integer ranking
        date date
    }

    songs ||--o{ playlist_songs : contains
    songs ||--o{ public_favorites : favorited
    songs ||--o{ trending_songs : trending
    playlists ||--o{ playlist_songs : contains
    api_songs ||--o{ api_favorites : favorited
    api_songs ||--o{ api_trending_songs : trending
```

## External Integration Architecture

### JioSaavn Integration

```mermaid
graph TD
    A[Client Request] --> B[Music Proxy API]
    B --> C{Endpoint Type}
    C -->|Search| D[Saavn Search API]
    C -->|Details| E[Saavn Details API]
    D --> F[Parse Response]
    E --> F
    F --> G[Normalize Format]
    G --> H[Return to Client]

    subgraph "Fallback Chain"
        I[Primary API]
        J[Backup API 1]
        K[Backup API 2]
        L[Backup API 3]
    end

    D --> I
    I -->|Fail| J
    J -->|Fail| K
    K -->|Fail| L
```

### YouTube Music Integration

```mermaid
graph TD
    A[YouTube Request] --> B[Check Cache]
    B --> C{Cached?}
    C -->|Yes| D[Stream from Storage]
    C -->|No| E[Start Conversion]

    E --> F[RapidAPI Service 1]
    F --> G{Success?}
    G -->|Yes| H[Download MP3]
    G -->|No| I[RapidAPI Service 2]

    I --> J{Success?}
    J -->|Yes| H
    J -->|No| K[Cobalt.tools]

    K --> L{Success?}
    L -->|Yes| H
    L -->|No| M[Return Error]

    H --> N[Upload to Storage]
    N --> O[Save to Database]
    O --> P[Stream to Client]

    D --> P
```

## Performance Architecture

### Caching Strategy

```mermaid
graph LR
    A[Client Request] --> B{Check Cache}
    B -->|Hit| C[Return Cached Data]
    B -->|Miss| D[Process Request]
    D --> E[Update Cache]
    E --> F[Return Data]

    subgraph "Cache Layers"
        G[Memory Cache]
        H[Database Cache]
        I[CDN Cache]
    end

    B --> G
    G -->|Miss| H
    H -->|Miss| I
```

### Rate Limiting

```mermaid
graph TD
    A[Incoming Request] --> B[Check Rate Limit]
    B --> C{Within Limit?}
    C -->|Yes| D[Process Request]
    C -->|No| E[Return 429 Error]
    D --> F[Update Rate Counter]
    F --> G[Return Response]

    subgraph "Rate Limit Buckets"
        H[Search: 1000/hour]
        I[Stream: 100/hour]
        J[Other: No limit]
    end

    B --> H
    B --> I
    B --> J
```

## Security Architecture

### API Security

```mermaid
graph TD
    A[Client Request] --> B[CORS Check]
    B --> C[Rate Limiting]
    C --> D[Input Validation]
    D --> E[Process Request]
    E --> F[Response Sanitization]
    F --> G[Return Response]

    subgraph "Security Layers"
        H[CORS Headers]
        I[Rate Limiting]
        J[Input Validation]
        K[Output Sanitization]
    end
```

## Monitoring & Analytics

### Analytics Pipeline

```mermaid
graph LR
    A[User Actions] --> B[Event Tracking]
    B --> C[Data Processing]
    C --> D[Analytics Storage]
    D --> E[Trending Calculations]
    E --> F[API Responses]

    subgraph "Tracked Events"
        G[Song Plays]
        H[Search Queries]
        I[Favorites]
        J[Playlist Actions]
    end

    A --> G
    A --> H
    A --> I
    A --> J
```

## Deployment Architecture

### Production Setup

```mermaid
graph TB
    subgraph "CDN Layer"
        CLOUDFLARE[Cloudflare CDN]
    end

    subgraph "Application Layer"
        VERCEL[Vercel Functions]
        EDGE[Edge Functions]
    end

    subgraph "Database Layer"
        SUPABASE_PROD[Supabase Production]
        SUPABASE_EDGE[Supabase Edge]
    end

    subgraph "Storage Layer"
        SUPABASE_STORAGE[Supabase Storage]
        CDN_STORAGE[CDN Storage]
    end

    CLOUDFLARE --> VERCEL
    VERCEL --> EDGE
    EDGE --> SUPABASE_PROD
    EDGE --> SUPABASE_EDGE
    VERCEL --> SUPABASE_STORAGE
    SUPABASE_STORAGE --> CDN_STORAGE
```

## Error Handling Architecture

### Error Flow

```mermaid
graph TD
    A[Request] --> B[Process]
    B --> C{Success?}
    C -->|Yes| D[Return Success]
    C -->|No| E[Error Handler]
    E --> F{Error Type}
    F -->|Validation| G[400 Bad Request]
    F -->|Not Found| H[404 Not Found]
    F -->|Timeout| I[408 Timeout]
    F -->|Server| J[500 Server Error]
    F -->|External| K[503 Service Unavailable]

    G --> L[Error Response]
    H --> L
    I --> L
    J --> L
    K --> L
```

## Scalability Considerations

### Horizontal Scaling

- **API Functions**: Auto-scaling Vercel functions
- **Database**: Supabase auto-scaling
- **Storage**: CDN distribution
- **Caching**: Redis cluster (future)

### Performance Optimization

- **Parallel Processing**: Concurrent API calls
- **Caching**: Multi-layer caching strategy
- **CDN**: Global content distribution
- **Database Indexing**: Optimized queries

---

This architecture ensures high availability, scalability, and performance while maintaining simplicity for developers using the API.
