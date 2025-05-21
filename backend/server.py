import sys
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
sys.path.append(os.path.join(os.path.dirname(__file__), 'functions'))
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi import Body
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.merge_playlists import merge_playlists
from src.functions.download_yt_song import download_yt_song
from src.functions.helpers.yt_provider import YoutubeProvider
from src.functions.helpers.sp_provider import SpotifyProvider

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(logs_dir, 'app.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SongStatus(BaseModel):
    name: str
    status: str # 'found', 'not_found', 'skipped'
    requires_manual_search: Optional[bool] = False

class SyncResponse(BaseModel):
    playlist: str
    songs: List[SongStatus]

app = FastAPI()

# Custom exception classes
class APIError(Exception):
    def __init__(self, message: str, status_code: int = 500, details: Dict[str, Any] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class AuthenticationError(APIError):
    def __init__(self, message: str = "Authentication failed", details: Dict[str, Any] = None):
        super().__init__(message, status_code=401, details=details)

class ValidationError(APIError):
    def __init__(self, message: str = "Validation error", details: Dict[str, Any] = None):
        super().__init__(message, status_code=400, details=details)

class ResourceNotFoundError(APIError):
    def __init__(self, message: str = "Resource not found", details: Dict[str, Any] = None):
        super().__init__(message, status_code=404, details=details)

class QuotaExceededError(APIError):
    def __init__(self, message: str = "YouTube API quota exceeded. Please try again later.", details: Dict[str, Any] = None):
        super().__init__(message, status_code=429, details=details)

# Error handling middleware
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    logger.error(f"API Error: {exc.message}", extra={
        "status_code": exc.status_code,
        "details": exc.details,
        "path": request.url.path,
        "method": request.method
    })
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {str(exc)}", extra={
        "path": request.url.path,
        "method": request.method
    })
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "message": "Validation error",
                "details": exc.errors(),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected Error: {str(exc)}", extra={
        "path": request.url.path,
        "method": request.method
    }, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "Internal server error",
                "details": str(exc) if os.getenv("DEBUG", "False").lower() == "true" else None,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )


# TEMPORARY SESSION STORE (replace with DB or secure storage in production)
session_store = {"authenticated": False}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: ["chrome-extension://<your-extension-id>"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    try:
        return {"name": "Syncer", "authenticated": session_store["authenticated"]}
    except Exception as e:
        logger.error(f"Error in root endpoint: {str(e)}")
        raise APIError("Failed to get application status")

@app.get("/api/authenticate")
def authenticate(): 
    try:
        session_store["authenticated"] = True
        return session_store
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise AuthenticationError("Failed to authenticate user")

@app.get("/api/sync_yt_to_sp")
def api_sync_yt_to_sp(playlist_name: str):
    if not playlist_name:
        raise ValidationError("Playlist name is required")
    
    try:
        results = sync_yt_to_sp(playlist_name)
        if not results:
            raise ResourceNotFoundError(f"No songs found in playlist: {playlist_name}")
        return {
            'playlist': playlist_name,
            'songs': results
        }
    except Exception as e:
        logger.error(f"Error syncing YouTube to Spotify: {str(e)}")
        raise APIError(f"Failed to sync playlist: {str(e)}")

@app.post("/api/finalize_yt_to_sp")
def finalize_yt_to_sp(playlist_name: str = Body(...), sp_ids: list = Body(...)):
    if not playlist_name or not sp_ids:
        raise ValidationError("Playlist name and song IDs are required")
    
    try:
        sp = SpotifyProvider()
        pl_info = sp.get_playlist_by_name(playlist_name)
        if pl_info is None:
            pl_info = sp.create_playlist(playlist_name)
        playlist_id = pl_info['id']
        sp.add_to_playlist(playlist_id, sp_ids)
        return {"status": "success", "message": f"Playlist '{playlist_name}' created/updated with {len(sp_ids)} songs."}
    except Exception as e:
        logger.error(f"Error finalizing YouTube to Spotify sync: {str(e)}")
        raise APIError(f"Failed to finalize sync: {str(e)}")

@app.get("/api/sync_sp_to_yt")
def api_sync_sp_to_yt(playlist_name: str):
    if not playlist_name:
        raise ValidationError("Playlist name is required")
    
    try:
        results = sync_sp_to_yt(playlist_name)
        if not results:
            raise ResourceNotFoundError(f"No songs found in playlist: {playlist_name}")
        return {
            'playlist': playlist_name,
            'songs': results
        }
    except Exception as e:
        logger.error(f"Error syncing Spotify to YouTube: {str(e)}")
        raise APIError(f"Failed to sync playlist: {str(e)}")

@app.post("/api/finalize_sp_to_yt")
def finalize_sp_to_yt(playlist_name: str = Body(...), yt_ids: list = Body(...)):
    if not playlist_name or not yt_ids:
        raise ValidationError("Playlist name and song IDs are required")
    
    try:
        yt = YoutubeProvider()
        pl_info = yt.get_playlist_by_name(playlist_name)
        if pl_info is None:
            pl_info = yt.create_playlist(playlist_name)
        playlist_id = pl_info['id']
        yt.add_to_playlist(playlist_id, yt_ids)
        return {"status": "success", "message": f"Playlist '{playlist_name}' created/updated with {len(yt_ids)} songs."}
    except Exception as e:
        logger.error(f"Error finalizing Spotify to YouTube sync: {str(e)}")
        raise APIError(f"Failed to finalize sync: {str(e)}")

@app.get("/api/merge_playlists")
def api_merge_playlists(yt_playlist: str, sp_playlist: str, merge_name: str):
    if not yt_playlist or not sp_playlist:
        raise ValidationError("Both playlist names are required")
    
    try:
        result = merge_playlists(yt_playlist, sp_playlist, merge_name)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Error merging playlists: {str(e)}")
        if 'RATE_LIMIT_EXCEEDED' in str(e):
            raise QuotaExceededError()
        raise APIError(f"Failed to merge playlists: {str(e)}")

@app.get("/api/download_yt_song")
def api_download_yt_song(song_name: str, artists: str):
    if not song_name or not artists:
        raise ValidationError("Song name and artists are required")
    
    try:
        result = download_yt_song(song_name, artists)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Error downloading YouTube song: {str(e)}")
        raise APIError(f"Failed to download song: {str(e)}")

@app.get("/api/manual_search_sp_to_yt")
def manual_search_sp_to_yt(song: str, artist: str):
    if not song or not artist:
        raise ValidationError("Song name and artist are required")
    
    try:
        yt = YoutubeProvider()
        result = yt.search_manual(song, artist)
        if result:
            return {"status": "found", "yt_id": result}
        else:
            return {"status": "not_found"}
    except Exception as e:
        logger.error(f"Error in manual search Spotify to YouTube: {str(e)}")
        raise APIError(f"Failed to perform manual search: {str(e)}")

@app.get("/api/manual_search_yt_to_sp")
def manual_search_yt_to_sp(song: str, artist: str):
    if not song or not artist:
        raise ValidationError("Song name and artist are required")
    
    try:
        sp = SpotifyProvider()
        result = sp.search_manual(song, artist)
        if result:
            return {"status": "found", "sp_id": result}
        else:
            return {"status": "not_found"}
    except Exception as e:
        logger.error(f"Error in manual search YouTube to Spotify: {str(e)}")
        raise APIError(f"Failed to perform manual search: {str(e)}")