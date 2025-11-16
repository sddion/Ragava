# 🎵 WaveMusic API - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Search for Music

```bash
curl -X POST https://ragava.vercel.app/api/search-all \
  -H "Content-Type: application/json" \
  -d '{"query": "bollywood hits", "limit": 10}'
```

### 2. Get Trending Songs

```bash
curl "https://ragava.vercel.app/api/trending?limit=20"
```

### 3. Add to Favorites

```bash
curl -X POST "https://ragava.vercel.app/api/favorites/song-id-here"
```

## 📱 JavaScript Example

```javascript
// Search and play music
async function searchAndPlay(query) {
  // 1. Search
  const response = await fetch('https://ragava.vercel.app/api/search-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 50 }),
  });

  const data = await response.json();

  // 2. Get first song
  const song = data.sources.ytmusic.songs[0];

  // 3. Play
  const audio = new Audio(song.stream_url);
  audio.play();

  // 4. Track play
  await fetch('https://ragava.vercel.app/api/api-track-play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId: song.id, playDuration: 0 }),
  });
}

// Use it
searchAndPlay('trending music 2024');
```

## 🎯 Key Features

- ✅ **Multi-Source Search**: Local, JioSaavn, YouTube Music
- ✅ **No Authentication**: Public API, no keys required
- ✅ **Real-time Streaming**: Direct audio streaming
- ✅ **Playlist Management**: Create and manage playlists
- ✅ **Favorites System**: Save favorite songs
- ✅ **Trending Analytics**: Real-time trending calculations
- ✅ **Mobile Ready**: Works on all platforms

## 📊 API Endpoints

| Endpoint           | Method              | Description                     |
| ------------------ | ------------------- | ------------------------------- |
| `/api/search-all`  | POST                | Search across all music sources |
| `/api/trending`    | GET                 | Get trending songs              |
| `/api/favorites`   | GET/POST/DELETE     | Manage favorites                |
| `/api/playlists`   | GET/POST/PUT/DELETE | Manage playlists                |
| `/api/stream/[id]` | GET                 | Stream audio files              |
| `/api/health`      | GET                 | Health check                    |

## 🔗 Integration Examples

### React

```jsx
function MusicApp() {
  const [songs, setSongs] = useState([]);

  const search = async query => {
    const response = await fetch('/api/search-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    setSongs(data.sources.ytmusic.songs);
  };

  return (
    <div>
      <input onKeyPress={e => e.key === 'Enter' && search(e.target.value)} />
      {songs.map(song => (
        <div key={song.id} onClick={() => new Audio(song.stream_url).play()}>
          {song.title} - {song.artist}
        </div>
      ))}
    </div>
  );
}
```

### Python

```python
import requests

# Search for music
response = requests.post('https://ragava.vercel.app/api/search-all',
  json={'query': 'bollywood hits', 'limit': 20})
data = response.json()

# Print results
for song in data['sources']['ytmusic']['songs']:
    print(f"{song['title']} by {song['artist']}")
```

### Mobile (React Native)

```javascript
import { Audio } from 'expo-av';

const playMusic = async song => {
  const { sound } = await Audio.Sound.createAsync({ uri: song.stream_url });
  await sound.playAsync();
};
```

## 📈 Response Format

```json
{
  "success": true,
  "query": "bollywood hits",
  "sources": {
    "local": { "songs": [...], "total": 5 },
    "api": { "songs": [...], "total": 50 },
    "saavn": { "songs": [...], "total": 100 },
    "ytmusic": { "songs": [...], "total": 200 }
  },
  "totalResults": 355
}
```

## 🛠️ Advanced Usage

### Rate Limiting

```javascript
class WaveMusicAPI {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async request(url, options) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { url, options, resolve, reject } = this.queue.shift();

    try {
      const response = await fetch(url, options);
      resolve(response);
    } catch (error) {
      reject(error);
    }

    this.processing = false;
    setTimeout(() => this.processQueue(), 100); // 100ms delay
  }
}
```

### Error Handling

```javascript
async function robustSearch(query) {
  try {
    const response = await fetch('/api/search-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 100 }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      // Handle partial failures
      const availableSources = Object.keys(data.sources).filter(
        source => data.sources[source].total > 0
      );

      if (availableSources.length === 0) {
        throw new Error('No music sources available');
      }
    }

    return data;
  } catch (error) {
    console.error('Search failed:', error);
    return { success: false, error: error.message };
  }
}
```

## 📚 Full Documentation

For complete API documentation with all endpoints, data models, and examples, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

## 🆘 Support

- **GitLab Repository**: [https://gitlab.com/sju17051/wavemusic](https://gitlab.com/sju17051/wavemusic)
- **Issues**: [GitLab Issues](https://gitlab.com/sju17051/wavemusic/-/issues)
- **Documentation**: [Full API Docs](./API_DOCUMENTATION.md)
- **Health Check**: [https://ragava.vercel.app/api/health](https://ragava.vercel.app/api/health)

## ⚡ Quick Links

- [Search API](#search-api)
- [Streaming API](#streaming-api)
- [Playlist API](#playlist-api)
- [Favorites API](#favorites-api)
- [Trending API](#trending-api)

---

**Ready to build amazing music apps? Start with the search endpoint and explore!** 🎵
