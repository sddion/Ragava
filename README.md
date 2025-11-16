<div align="center">
  <img src="public/R.agavaLogo.png" alt="Ragava Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <h1>🎵 RAGAVA - The Music Platform That Actually Works</h1>
  <p><em>Because who needs another broken music app? I've got you covered.</em> 🎧</p>
  
  <p>
    <a href="https://gitlab.com/sju17051/wavemusic/-/pipelines">
      <img src="https://img.shields.io/badge/GitLab-CI%2FCD-orange?logo=gitlab" alt="GitLab CI/CD">
    </a>
    <a href="https://python.org">
      <img src="https://img.shields.io/badge/Python-3.8+-blue?logo=python" alt="Python">
    </a>
    <a href="https://nextjs.org">
      <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
    </a>
    <a href="https://typescriptlang.org">
      <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
    </a>
  </p>
</div>

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 20px 0; color: white;">
  <h2 style="color: white; margin-top: 0;">🚀 What the Heck is Ragava?</h2>
  <p style="margin-bottom: 0; font-size: 1.1em;">Ragava is a <strong> music streaming platform</strong> that doesn't suck. I've got both a web application and desktop tools because apparently, one wasn't enough to satisfy my coding addiction.</p>
</div>

### **The Web App** 🌐

- **Multi-source streaming**: Local files, JioSaavn, YouTube Music (because why choose?)
- **Real-time sync**: Because your music should follow you around like a loyal pet
- **Trending algorithm**: Spotify-like but without the "you'll love this" lies
- **30+ API endpoints**: Because I'm an overachiever
- **No authentication required**: I'm not your parent, I don't need to know who you are

### **The Desktop Tools** 🖥️

- **YouTube downloader**: Because sometimes you want to keep that song forever
- **Music manager**: Organize your chaos with style
- **Modern Material Design 3 UI**: Because basic styling is for basic people
- **Cross-platform**: Linux DEB packages and Windows EXE (coming soon™)

<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; margin: 20px 0; color: white;">
  <h2 style="color: white; margin-top: 0;">🎯 Why Should You Care?</h2>
  <p style="margin-bottom: 15px; font-size: 1.1em;">Look, I get it. There are a million music apps out there. But here's why Ragava is different:</p>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px;">
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ Actually works</strong> (revolutionary, I know)
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ No ads</strong> (because your sanity matters - for now, at least)
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ No subscription fees</strong> (I'm not trying to drain your wallet - yet)
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ Open source</strong> (transparency is sexy)
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ Real-time sync</strong> (your music follows you like a shadow)
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ YouTube integration</strong> (because sometimes you need that obscure remix)
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px;">
      <strong>✅ Local file support</strong> (your old MP3s aren't dead weight anymore)
    </div>
    <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px;">
      <strong>⚠️ Free for now</strong> (because I'm still figuring out how to pay for servers)
    </div>
    <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px;">
      <strong>⚠️ No guarantees</strong> (I might add ads later if I get desperate)
    </div>
  </div>
</div>

## 🏗️ **Architecture (Because I'm Fancy)**

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

## 🚀 Quick Start (For the Impatient)

### 🌐 Web Application

```bash
# Clone this beauty
git clone https://gitlab.com/sju17051/wavemusic.git
cd wavemusic

# Install dependencies (because magic doesn't happen by itself)
npm install

# Set up environment variables (copy the example, you know the drill)
cp .env.example .env.local

# Start the development server
npm run dev

# Open your browser and enjoy
# http://localhost:3000
```

### 🖥️ Desktop Tools

```bash
# Navigate to tools directory
cd tools

# Install Python dependencies
pip3 install -r requirements.txt

# Run the GUI (it's actually pretty)
python3 gui/guipy.py

# Or build a DEB package (because you're fancy)
python3 packaging/build.py --bump
```

## 🔧 **Environment Setup (The Boring Part)**

Create a `.env.local` file with these variables (because security matters):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# RapidAPI Configuration (3 keys for rotation because I'm paranoid)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_KEY_2=your_rapidapi_key_2
RAPIDAPI_KEY_3=your_rapidapi_key_3

# Conversion APIs
CLOUDCONVERT_API_KEY=your_cloudconvert_key

# Application URLs
NEXT_PUBLIC_APP_URL=your_app_url
NEXT_PUBLIC_BASE_URL=your_base_url

# GitLab CI/CD
GITLAB_TOKEN=your_gitlab_token
YOUTUBE_CONVERSION_ENABLED=true
```

## 📦 **Installation Options (Pick Your Poison)**

### **Option 1: From Source (For Developers)**

```bash
git clone https://gitlab.com/sju17051/wavemusic.git
cd wavemusic
npm install
npm run build
```

### **Option 2: DEB Package (For Linux Users)**

```bash
# Download from releases (when I actually create them)
wget https://gitlab.com/sju17051/wavemusic/-/releases

# Install the package
sudo dpkg -i ragava-tools-*.deb
sudo apt-get install -f  # Fix dependencies

# Run the application
ragava-tools
```

### **Option 3: Docker (For Container Enthusiasts)**

```bash
# Coming soon™ (I'm working on it, promise)
```

## 🎵 **Features That Actually Matter**

### **Music Sources**

- **Local Files**: Your old MP3s aren't dead weight anymore
- **JioSaavn**: Indian music streaming (because Bollywood is life)
- **YouTube Music**: Because sometimes you need that obscure remix
- **YouTube Conversion**: Download and store MP3s permanently in cloud storage

### **Smart Features**

- **Real-time Sync**: Your music follows you around like a loyal pet
- **Trending Algorithm**: Spotify-like but without the "you'll love this" lies
- **Playlist Management**: Organize your chaos with style
- **Favorites System**: Dual favorites for local and API songs (because I'm thorough)
- **Queue Management**: Global queue that actually works

### **Developer Features**

- **30+ API Endpoints**: Because I'm an overachiever
- **Real-time Analytics**: Track what people actually listen to
- **Automated CI/CD**: GitHub Actions + GitLab CI/CD (because one isn't enough)
- **Security Scanning**: Trivy vulnerability scanner (because security matters)
- **Coverage Reports**: Codecov integration (because I like numbers)

## 🛠️ **Development (For the Brave)**

### **Prerequisites**

- Node.js 20+ (because I'm modern)
- Python 3.8+ (for desktop tools)
- Git (obviously)
- A functioning brain (optional but recommended)

### **Development Commands**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests (because I'm responsible)
npm run test

# Lint code (because messy code is a crime)
npm run lint

# Format code (because consistency is sexy)
npm run format

# Build for production
npm run build
```

### **Desktop Tools Development**

```bash
# Navigate to tools directory
cd tools

# Install Python dependencies
pip3 install -r requirements.txt

# Run GUI in development mode
python3 gui/guipy.py

# Build DEB package
python3 packaging/build.py --bump

# Test hash verification
md5sum -c packaging/debian/*.md5
```

## 🔐 **Security (Because I'm Not an Amateur)**

- **Environment Variables**: Sensitive data stays secret
- **Input Validation**: I sanitize everything (OCD level)
- **CORS Policies**: Properly configured (because security matters)
- **Rate Limiting**: API endpoints are protected
- **HTTPS**: All external API calls are secure
- **Hash Verification**: DEB packages have MD5 and SHA256 verification

## 📊 **Performance (Because Speed Matters)**

- **Lazy Loading**: Components load when needed (because I'm efficient)
- **React.memo()**: Expensive components are optimized
- **Caching Strategies**: API responses are cached (because I'm smart)
- **Database Optimization**: Queries are indexed (because I'm not a savage)
- **Error Boundaries**: App doesn't crash (because I'm responsible)

## 🤝 **Contributing (I Want Your Help)**

1. **Fork the repository** (because you're awesome)
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request** (because I want to see your work)

### **Code Standards (Because I Have Standards)**

- **TypeScript**: No `any` types (I'm not a savage)
- **ESLint**: Code must be clean (because messy code is a crime)
- **Prettier**: Code must be formatted (because consistency is sexy)
- **Tests**: Write them (because I'm responsible)
- **Documentation**: Update it (because I'm not a mind reader)

## 📝 **License (The Legal Stuff)**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 10px; margin: 20px 0; color: white;">
  <h2 style="color: white; margin-top: 0;">🆘 Support (Because I'm Human)</h2>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
      <h4 style="color: white; margin-top: 0;">🐛 Issues</h4>
      <a href="https://gitlab.com/sju17051/wavemusic/-/issues" style="color: white; text-decoration: none; font-weight: bold;">GitLab Issues</a>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
      <h4 style="color: white; margin-top: 0;">💬 Discussions</h4>
      <a href="https://gitlab.com/sju17051/wavemusic/-/issues" style="color: white; text-decoration: none; font-weight: bold;">GitLab Discussions</a>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
      <h4 style="color: white; margin-top: 0;">📚 Documentation</h4>
      <a href="https://gitlab.com/sju17051/wavemusic/-/wikis" style="color: white; text-decoration: none; font-weight: bold;">Project Wiki</a>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center;">
      <h4 style="color: white; margin-top: 0;">📦 Releases</h4>
      <a href="https://gitlab.com/sju17051/wavemusic/-/releases" style="color: white; text-decoration: none; font-weight: bold;">GitLab Releases</a>
    </div>
  </div>
</div>

## 🎉 **Acknowledgments (Because I'm Grateful)**

- **Next.js Team**: For making React actually usable
- **Supabase Team**: For making databases less painful
- **Radix UI Team**: For making components that don't suck
- **Tailwind CSS Team**: For making styling less of a nightmare
- **Python Community**: For making desktop apps possible
- **GitLab**: For hosting my code (because GitHub is mainstream)

## 🔮 **Roadmap (The Future is Bright)**

- [ ] **Windows EXE Package**: Because Linux isn't the only OS
- [ ] **Docker Support**: Because containers are cool
- [ ] **Mobile App**: Because I'm ambitious
- [ ] **Spotify Integration**: Because why not?
- [ ] **AI Recommendations**: Because algorithms are the future
- [ ] **Social Features**: Because music is better with friends
- [ ] **Offline Mode**: Because internet is unreliable
- [ ] **Voice Commands**: Because I'm living in the future

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

---

## 🎵 **Final Words**

Ragava is more than just a music platform. It's a statement. A statement that says "I can build something that actually works, looks good, and doesn't suck."

So go ahead, clone it, build it, use it, break it, fix it, and make it your own. Because at the end of the day, music should be about the music, not about fighting with broken apps.

**Happy listening!** 🎧✨

---

_Made with ❤️ and a healthy dose of sarcasm by the Ragava Team_

**Repository**: [GitLab](https://gitlab.com/sju17051/wavemusic)  
**Issues**: [Report Bugs](https://gitlab.com/sju17051/wavemusic/-/issues)  
**Releases**: [Download](https://gitlab.com/sju17051/wavemusic/-/releases)
