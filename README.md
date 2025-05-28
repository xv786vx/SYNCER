<center>
    <h1 align="center">SYNCER 🎛️</h1>
    <h3 align="center"> <strong>Music across platforms.</strong> </h4>
    <h4 align="center">Helps users sync playlists (mostly) automatically across Spotify and YouTube.</h5>
</center>

## 📃 Features

- Sync playlists between Spotify and YouTube with no song limit
- Download YouTube videos as audio files
- Merge playlists from both platforms into a new playlist
- Smart matching of songs across platforms

## 🤖 Installation and Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher) for the frontend
- [Python](https://www.python.org/) (v3.8 or higher) for the backend
- [FFMPEG](https://ffmpeg.org/download.html) for YouTube audio downloads

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Install required dependencies:

   ```
   pip install -r requirements.txt
   ```

3. Start the backend server with CORS development mode:

   ```
   # On Windows PowerShell
   $env:CORS_DEV_MODE="true"; python server.py

   # On Linux/macOS
   CORS_DEV_MODE=true python server.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open your browser at the URL displayed in the console (typically http://localhost:5173)

## 🔄 CORS Configuration

To ensure proper communication between the frontend and backend:

1. The backend server must run with CORS development mode enabled:

   - Set environment variable `CORS_DEV_MODE="true"` before starting the server
   - This enables permissive CORS settings allowing requests from any origin

2. For production deployment:
   - Update the API base URL in `frontend/src/utils/apiClient.ts` to point to your deployed backend
   - Configure the backend's CORS settings in `backend/server.py` to allow specific origins
