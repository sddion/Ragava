<div align="center">
  <img src="../public/R.agavaLogo.png" alt="Ragava Documentation Logo" width="100" height="100" style="border-radius: 15px; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
  <h1>📚 RAGAVA DOCUMENTATION - The Complete Guide</h1>
  <p><em>Because reading code is like reading hieroglyphics without a Rosetta Stone.</em> 📖</p>
  
  <p>
    <a href="https://gitlab.com/sju17051/wavemusic/-/pipelines">
      <img src="https://img.shields.io/badge/GitLab-CI%2FCD-orange?logo=gitlab" alt="GitLab CI/CD">
    </a>
    <a href="https://gitlab.com/sju17051/wavemusic/-/wikis">
      <img src="https://img.shields.io/badge/Documentation-Complete-green" alt="Documentation">
    </a>
    <a href="../LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
    </a>
  </p>
</div>

## 🎯 **Welcome to the Documentation Hub**

This is where all the magic happens. Well, not the actual magic (that's in the code), but the documentation that makes the magic understandable to mere mortals.

### **What You'll Find Here** 📋
- **API Documentation**: Complete endpoint reference (because guessing is for amateurs)
- **Architecture Guides**: How the system actually works (spoiler: it's complicated)
- **Development Workflows**: How to not break things (mostly)
- **YouTube Storage**: How I store MP3s in the cloud (because local storage is for peasants)
- **Git Operations**: How to manage code without losing your mind

## 📖 **Documentation Index**

### **🔌 API Documentation**
- **[API_DOCUMENTATION.md](https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/API_DOCUMENTATION.md)**: Complete API reference with examples
- **[API_README.md](https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/API_README.md)**: Quick start guide for API integration
- **[API_ARCHITECTURE.md](https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/API_ARCHITECTURE.md)**: System architecture and design patterns

### **🏗️ Architecture & Design**
- **[YOUTUBE_STORAGE.md](https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/YOUTUBE_STORAGE.md)**: YouTube MP3 storage implementation
- **[GIT_OPERATIONS.md](https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/GIT_OPERATIONS.md)**: Git operations and pipeline management

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 20px 0; color: white;">
  <h2 style="color: white; margin-top: 0;">🚀 Quick Navigation</h2>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 15px;">
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
      <h3 style="color: white; margin-top: 0;">👨‍💻 For Developers</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/API_README.md" style="color: white; text-decoration: none; font-weight: bold;">📖 Getting Started</a></li>
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/API_DOCUMENTATION.md" style="color: white; text-decoration: none; font-weight: bold;">📚 API Reference</a></li>
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/API_ARCHITECTURE.md" style="color: white; text-decoration: none; font-weight: bold;">🏗️ Architecture</a></li>
      </ul>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
      <h3 style="color: white; margin-top: 0;">🔧 For DevOps</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/GIT_OPERATIONS.md" style="color: white; text-decoration: none; font-weight: bold;">🔀 Git Operations</a></li>
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/YOUTUBE_STORAGE.md" style="color: white; text-decoration: none; font-weight: bold;">🎥 YouTube Storage</a></li>
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/docs/GIT_OPERATIONS.md" style="color: white; text-decoration: none; font-weight: bold;">🚀 CI/CD</a></li>
      </ul>
    </div>
    
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
      <h3 style="color: white; margin-top: 0;">👤 For Users</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/README.md" style="color: white; text-decoration: none; font-weight: bold;">🏠 Main README</a></li>
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/tools/README.md" style="color: white; text-decoration: none; font-weight: bold;">🛠️ Tools README</a></li>
        <li style="margin: 8px 0;"><a href="https://gitlab.com/sju17051/wavemusic/-/blob/main/tools/packaging/debian/INSTALL.md" style="color: white; text-decoration: none; font-weight: bold;">📦 Installation</a></li>
      </ul>
    </div>
  </div>
</div>

## 🎵 **API Endpoints Overview**

### **Core Music APIs** 🎧
- `POST /api/search-all`: Master search across all sources
- `GET /api/trending`: Trending songs with Spotify-like algorithm
- `GET /api/songs`: Local songs with pagination
- `GET /api/stream/[id]`: Audio streaming with range support

### **External Music Sources** 🌐
- `GET /api/music-proxy`: JioSaavn API proxy with fallbacks
- `GET /api/ytmusic-proxy`: YouTube Music API proxy
- `POST /api/youtube-download`: YouTube conversion and storage
- `GET /api/youtube-stream`: YouTube stream management

### **Playlist & Favorites** 📝
- `GET /api/playlists`: Get all playlists
- `POST /api/playlists`: Create playlist
- `GET /api/favorites`: Get local favorites
- `POST /api/favorites/[id]`: Toggle local favorite

### **Analytics & Tracking** 📊
- `POST /api/track-play`: Track song plays
- `GET /api/trending`: Get trending songs
- `POST /api/cron/update-trending`: Update trending calculations

### **System & Utilities** ⚙️
- `GET /api/health`: Health check
- `GET /api/api-status`: API key status and usage
- `POST /api/trigger-pipeline`: Trigger GitLab CI/CD pipeline
- `GET /api/pipeline-status`: Check pipeline status

## 🏗️ **Architecture Highlights**

### **Web Application Stack**
```
Next.js 15 + TypeScript 5 + Tailwind CSS + Radix UI
├── 30+ API endpoints (I'm not messing around)
├── Supabase PostgreSQL + Storage (cloud magic)
├── Zustand + Redux Toolkit (state management chaos)
├── Real-time sync (because 2024)
└── YouTube MP3 storage (permanent cloud storage)
```

### **Desktop Tools Stack**
```
Python 3.8+ + Tkinter + Material Design 3
├── Modular architecture (no 2000-line files here)
├── Cross-platform packaging (Linux DEB, Windows EXE)
├── Database integration (Supabase + SQL fallback)
└── Modern UI components (because I have standards)
```

## 🔧 **Development Workflow**

### **Code Quality Standards**
- **TypeScript**: No `any` types (I'm not a savage)
- **ESLint**: Code must be clean (because messy code is a crime)
- **Prettier**: Code must be formatted (because consistency is sexy)
- **Tests**: Write them (because I'm responsible)
- **Documentation**: Update it (because I'm not a mind reader)

### **Git Workflow**
- **Pre-commit**: Lint-staged with colorized output
- **Pre-push**: Tests, linting, type checking with spinners
- **Auto-format**: Code formatting on commits
- **CI/CD**: GitHub Actions + GitLab CI/CD (because one isn't enough)

## 🔐 **Security & Verification**

### **Package Verification**
- **MD5 Hash**: Quick integrity verification
- **SHA256 Hash**: Enhanced security verification
- **Digital Signatures**: Coming soon™
- **Secure Downloads**: HTTPS for all external resources

### **API Security**
- **Environment Variables**: Sensitive data stays secret
- **Input Validation**: I sanitize everything (OCD level)
- **CORS Policies**: Properly configured (because security matters)
- **Rate Limiting**: API endpoints are protected

## 📊 **Performance & Optimization**

### **Web Application**
- **Lazy Loading**: Components load when needed
- **React.memo()**: Expensive components are optimized
- **Caching Strategies**: API responses are cached
- **Database Optimization**: Queries are indexed
- **Error Boundaries**: App doesn't crash

### **Desktop Tools**
- **Modular Architecture**: Clean, maintainable code
- **Efficient Downloads**: Smart duplicate checking
- **Database Optimization**: Proper indexing and queries
- **Memory Management**: No memory leaks (because I'm responsible)

## 🎯 **Key Features**

### **Multi-Source Music Streaming**
- **Local Files**: Your old MP3s aren't dead weight anymore
- **JioSaavn**: Indian music streaming (because Bollywood is life)
- **YouTube Music**: Because sometimes you need that obscure remix
- **YouTube Conversion**: Download and store MP3s permanently

### **Real-time Features**
- **Global Sync**: Your music follows you around
- **Queue Management**: Global queue that actually works
- **Trending Algorithm**: Spotify-like but without the lies
- **Analytics**: Track what people actually listen to

### **Developer Experience**
- **30+ API Endpoints**: Because I'm an overachiever
- **Comprehensive Documentation**: Because I'm not a savage
- **Automated CI/CD**: Because manual deployment is for peasants
- **Security Scanning**: Because security matters

## 🆘 **Support & Resources**

### **Getting Help**
- **Repository**: [GitLab](https://gitlab.com/sju17051/wavemusic)
- **Issues**: [Report Bugs](https://gitlab.com/sju17051/wavemusic/-/issues)
- **Releases**: [Download](https://gitlab.com/sju17051/wavemusic/-/releases)
- **Documentation**: [Project Wiki](https://gitlab.com/sju17051/wavemusic/-/wikis)
- **Discussions**: [GitLab Discussions](https://gitlab.com/sju17051/wavemusic/-/issues)

### **Contributing**
- **Fork the repository** (because you're awesome)
- **Create a feature branch** (`git checkout -b feature/amazing-feature`)
- **Commit your changes** (`git commit -m 'Add amazing feature'`)
- **Push to the branch** (`git push origin feature/amazing-feature`)
- **Open a Merge Request** (because I want to see your work)

## 🎉 **Acknowledgments**

- **Next.js Team**: For making React actually usable
- **Supabase Team**: For making databases less painful
- **Radix UI Team**: For making components that don't suck
- **Tailwind CSS Team**: For making styling less of a nightmare
- **Python Community**: For making desktop apps possible
- **GitLab**: For hosting my code (because GitHub is mainstream)

---

## 💰 **The Reality Check (Because I'm Honest)**

### **Current Status: Free & Open Source**
- **No ads** (for now)
- **No subscription fees** (for now)
- **No hidden costs** (for now)
- **No data selling** (I'm not Google)

### **Future Plans (When I Get Desperate)**
- **Premium Features**: Advanced analytics, priority support, custom themes
- **Optional Donations**: Because servers cost money and I'm not made of it
- **Enterprise Version**: For companies that want to pretend they're cool
- **Ads**: Maybe, if I can't figure out how to pay for bandwidth
- **Subscription**: Possibly, if I get too popular and servers explode

### **What I Promise**
- **Core features will always be free** (because I'm not a monster)
- **Open source forever** (because I believe in transparency)
- **No data harvesting** (because I'm not Facebook)
- **No surprise charges** (because I'm not Adobe)

### **What I Don't Promise**
- **Free forever** (because reality is harsh)
- **No ads ever** (because I might get desperate)
- **No premium features** (because I need to eat)
- **No changes** (because I'm not dead yet)

## 🎵 **Final Words**

This documentation exists because I believe in transparency, clarity, and not making people guess how things work. Because at the end of the day, good documentation is what separates the professionals from the amateurs.

So dive in, explore, learn, and most importantly, don't be afraid to ask questions. Because the only stupid question is the one you don't ask.

**Happy coding!** 🚀✨

---

*Made with ❤️ and a healthy dose of sarcasm by the Ragava Team*

**Repository**: [GitLab](https://gitlab.com/sju17051/wavemusic)  
**Issues**: [Report Bugs](https://gitlab.com/sju17051/wavemusic/-/issues)  
**Releases**: [Download](https://gitlab.com/sju17051/wavemusic/-/releases)