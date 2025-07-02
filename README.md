<div align="center">
<img src="frontend/public/icon128.png" width="100" alt="SYNCER Logo" />

# SYNCER

A Chrome extension that lets you sync and merge your Spotify and YouTube playlists seamlessly — powered by FastAPI, React, and Docker and deployed with Render and Vercel.
## Currently its not on the Chrome Store (will be up within the next 2-6 weeks)
</div>

## 🌐 Live Links & Dashboards

- **Website:** [https://syncer-web-three.vercel.app](https://syncer-26vh.onrender.com)
- **Chrome Extension Releases:** [GitHub Releases](https://github.com/xv786vx/SYNCER/releases)
- **Backend API:** [https://syncer-26vh.onrender.com](https://syncer-26vh.onrender.com)
- **Spotify Developer Dashboard:** [Spotify Dashboard](https://developer.spotify.com/dashboard/applications)
- **Google Cloud Console:** [Google Cloud Console](https://console.cloud.google.com/)
- **Vercel Dashboard (Web Frontend):** [Vercel](https://vercel.com/dashboard)

## 🧩 Chrome Extension Installation

### Option 1: Download from Release

1. Go to the [Releases page](https://github.com/xv786vx/SYNCER/releases).
2. Download the latest `dist.zip` and unzip it.
3. In Chrome, go to `chrome://extensions/`, enable Developer Mode, and click **Load unpacked**.
4. Select the unzipped `dist` folder.

### Option 2: Build from Source

1. Clone this repo:
   ```sh
   git clone https://github.com/xv786vx/SYNCER.git
   cd SYNCER
   ```
2. Install dependencies and build:
   ```sh
   npm install
   npm run build
   ```
3. Load the `dist` folder in Chrome as above.

## 🛠️ Build & Deployment Checklist

### Backend (API)

- [ ] Build Docker image:
  ```sh
  docker build -t yourdockerhub/syncer-backend:latest .
  ```
- [ ] Push Docker image:
  ```sh
  docker push yourdockerhub/syncer-backend:latest
  ```
- [ ] Redeploy on Render (or your cloud provider).

### Frontend (Chrome Extension)

- [ ] Build extension:
  ```sh
  npm run build
  ```
- [ ] Zip the `dist` folder for release.
- [ ] Upload `dist.zip` to [GitHub Releases](https://github.com/yourusername/yourrepo/releases).

### Web (Vercel)

- [ ] Push changes to the `web` directory or main branch on GitHub.
- [ ] Vercel will auto-deploy your changes.

### Spotify/Google Cloud

- [ ] Ensure your redirect URIs are up to date in the [Spotify Dashboard](https://developer.spotify.com/dashboard/applications) and [Google Cloud Console](https://console.cloud.google.com/).

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 🆘 Support

- For issues, open a [GitHub Issue](https://github.com/xv786vx/SYNCER/issues).
- For questions, contact firas.aj76@gmail.com.
