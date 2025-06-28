import sys
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi import Body
from google_auth_oauthlib.flow import Flow
from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from spotipy.oauth2 import SpotifyOauthError
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.responses import FileResponse
from jobs import router as jobs_router

load_dotenv()
sys.path.append(os.path.join(os.path.dirname(__file__), 'functions'))

from src.functions.download_yt_song import download_yt_song
from src.functions.helpers.yt_provider import YoutubeProvider
from src.functions.helpers.sp_provider import SpotifyProvider, is_spotify_authenticated
from src.functions.helpers.quota_tracker import get_total_quota_used, set_total_quota_value, YT_API_QUOTA_COSTS, quota_usage
from src.db.youtube_token import save_youtube_token, get_youtube_token, is_youtube_authenticated
from src.db.youtube_quota import get_total_quota_used, set_total_quota_value

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
app.include_router(jobs_router)


# TEMPORARY SESSION STORE (replace with DB or secure storage in production)
session_store = {"authenticated": False}

# In-memory sync status store (per user)
sync_status_store = {}

# Check if we're in CORS dev mode (more permissive settings)
chrome_extension_id = os.getenv("CHROME_EXTENSION_ID", "default_extension_id")
cors_dev_mode = os.environ.get("CORS_DEV_MODE", "false").lower() == "true"
logger.info(f"CORS Dev Mode: {cors_dev_mode}")

if cors_dev_mode:
    # Development/debugging CORS settings - very permissive
    logger.info("Using permissive CORS settings (development mode)")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
        expose_headers=["*"],  # Expose all headers
        max_age=86400  # 24 hours in seconds
    )
else:
    # More restricted CORS settings for production
    logger.info("Using restricted CORS settings (production mode)")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # React dev server (if used)
            "http://localhost:8000",  # Backend server (for testing)
            f"chrome-extension://{chrome_extension_id}",  # Your Chrome extension
            "https://syncer-26vh.onrender.com",  # Your deployed backend URL
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"],
        expose_headers=["Content-Length", "Content-Disposition"],
        max_age=86400  # 24 hours in seconds
    )


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


# api usage endpoint
@app.get("/api/youtube_quota_usage")
def youtube_quota_usage(db: Session = Depends(get_db)):
    # The quota limit is typically 10,000 for YouTube Data API v3
    YT_API_DAILY_LIMIT = 10000
    used = get_total_quota_used(db)
    return {
        "total": used,
        "limit": YT_API_DAILY_LIMIT
    }

@app.get("/health")
async def health_check():
    """A simple health check endpoint to confirm the server is running."""
    return {"status": "ok"}

# Endpoint to set quota value manually
@app.post("/api/set_youtube_quota")
def set_youtube_quota(quota_value: int = Body(...), db: Session = Depends(get_db)):
    try:
        set_total_quota_value(db, quota_value)
        return {"status": "success", "message": f"YouTube API quota set to {quota_value}"}
    except Exception as e:
        logger.error(f"Error setting YouTube quota: {str(e)}")
        raise APIError(f"Failed to set YouTube quota: {str(e)}")

@app.get("/api/sp_playlist_track_count")
def get_sp_playlist_track_count(playlist_name: str, user_id: str):
    try:
        sp = SpotifyProvider(user_id)
        if not is_spotify_authenticated(user_id):
            raise AuthenticationError("Spotify is not authenticated.")
        
        count = sp.get_playlist_track_count(playlist_name)
        
        if count is None:
            raise ResourceNotFoundError(f"Playlist '{playlist_name}' not found.")
            
        return {"track_count": count}
    except SpotifyOauthError as e:
        logger.error(f"Spotify auth error for user {user_id}: {e}")
        raise AuthenticationError("Spotify authentication failed.")
    except Exception as e:
        logger.error(f"Error getting track count for playlist '{playlist_name}' for user {user_id}: {e}")
        raise APIError("Failed to get playlist track count.")

@app.get("/api/yt_playlist_track_count")
def get_yt_playlist_track_count(playlist_name: str, user_id: str, db: Session = Depends(get_db)):
    try:
        if not is_youtube_authenticated(user_id):
            raise AuthenticationError("YouTube is not authenticated.")
        
        yt = YoutubeProvider(user_id)
        count = yt.get_playlist_track_count(playlist_name, db)
        
        if count is None:
            raise ResourceNotFoundError(f"Playlist '{playlist_name}' not found.")
            
        return {"track_count": count}
    except APIError as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting YT track count for playlist '{playlist_name}' for user {user_id}: {e}")
        raise APIError("Failed to get YouTube playlist track count.")


# app endpoints
@app.get("/")
def root():
    try:
        return {"name": "Syncer", "authenticated": session_store["authenticated"], "version": "1.0.1"}
    except Exception as e:
        logger.error(f"Error in root endpoint: {str(e)}")
        raise APIError("Failed to get application status")

@app.get("/api/download_yt_song")
def api_download_yt_song(song_name: str, artists: str, user_id: str):
    logger.info(f"Downloading YouTube song: {song_name} by {artists} for user {user_id}")
    result = download_yt_song(song_name, artists, user_id)
    return {"result": result}

@app.get("/api/manual_search_sp_to_yt")
def manual_search_sp_to_yt(song: str, artist: str, user_id: str):
    logger.info(f"Manual search for '{song}' by '{artist}' for user_id: {user_id}")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    try:
        yt = YoutubeProvider(user_id)
        results = yt.search_manual(song, artist)
        return JSONResponse(content=results)
    except Exception as e:
        logger.error(f"Error during manual search for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to perform manual search")

@app.get("/api/manual_search_yt_to_sp")
def manual_search_yt_to_sp(song: str, artist: str, user_id: str):
    logger.info(f"Manual search for '{song}' by '{artist}' for user_id: {user_id}")
    if not song or not artist or not user_id:
        raise ValidationError("Song name, artist, and user_id are required")
    try:
        sp = SpotifyProvider(user_id)
        results = sp.search_manual(song, artist)
        return JSONResponse(content=results)
    except Exception as e:
        logger.error(f"Error in manual search YouTube to Spotify: {str(e)}")
        raise APIError(f"Failed to perform manual search: {str(e)}")

@app.get("/api/spotify_auth_url")
def get_spotify_auth_url(user_id: str):
    """Return the Spotify authorization URL for the frontend/extension to redirect the user."""
    try:
        sp = SpotifyProvider(user_id)
        url = sp.get_auth_url(state=user_id)
        return {"auth_url": url}
    except Exception as e:
        logger.error(f"Error generating Spotify auth URL: {str(e)}")
        raise APIError(f"Failed to generate Spotify auth URL: {str(e)}")

@app.get("/spotify_callback")
def spotify_callback(code: str, state: str = None, user_id: str = None):
    """
    Handle the redirect from Spotify, exchange code for tokens, and store them.
    """
    try:
        # Use state as user_id if user_id is not provided
        if not user_id and state:
            user_id = state
        if not code or not user_id:
            raise Exception("No code or user_id provided in callback.")
        from src.functions.helpers.sp_provider import SpotifyProvider
        sp = SpotifyProvider(user_id)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/spotify-auth-success?user_id={user_id}")
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/spotify_auth_status")
def spotify_auth_status(user_id: str):
    """
    Check if the user is authenticated with Spotify.
    Returns: { "authenticated": true/false }
    """
    is_authenticated = is_spotify_authenticated(user_id)
    return {"authenticated": is_authenticated}

def ensure_youtube_client_secrets():
    import os, json
    yt_client_id = os.getenv("YT_CLIENT_ID")
    yt_project_id = os.getenv("YT_PROJECT_ID")
    yt_auth_uri = os.getenv("YT_AUTH_URI")
    yt_token_uri = os.getenv("YT_TOKEN_URI")
    yt_auth_provider_x509_cert_url = os.getenv("YT_AUTH_PROVIDER_X509_CERT_URL")
    yt_client_secret = os.getenv("YT_CLIENT_SECRET")
    yt_redirect_uri = os.getenv("YT_REDIRECT_URIS")
    token_dir = os.path.join(os.path.dirname(__file__), 'src', 'auth_tokens')
    os.makedirs(token_dir, exist_ok=True)
    client_secrets_file = os.path.join(token_dir, 'desktop_client_secrets.json')
    if not os.path.exists(client_secrets_file):
        redirect_uris = [uri.strip() for uri in yt_redirect_uri.split(',')]
        client_secrets = {
            "web": {
                "client_id": yt_client_id,
                "project_id": yt_project_id,
                "auth_uri": yt_auth_uri,
                "token_uri": yt_token_uri,
                "auth_provider_x509_cert_url": yt_auth_provider_x509_cert_url,
                "client_secret": yt_client_secret,
                "redirect_uris": redirect_uris
            }
        }
        with open(client_secrets_file, 'w') as f:
            json.dump(client_secrets, f, indent=2)
    return client_secrets_file

@app.get("/api/youtube_auth_url")
def get_youtube_auth_url(user_id: str):
    """Return the YouTube authorization URL for the frontend/extension to redirect the user."""
    try:
        client_secrets_file = ensure_youtube_client_secrets()
        scopes = [
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.readonly',
        ]
        redirect_uri = os.environ.get("YT_WEB_REDIRECT_URI", "https://syncer-26vh.onrender.com/youtube_callback")
        # Do NOT append user_id as a query param. Use state instead.
        flow = Flow.from_client_secrets_file(
            client_secrets_file,
            scopes=scopes,
            redirect_uri=redirect_uri
        )
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=user_id  # Pass user_id as state
        )
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Error generating YouTube auth URL: {str(e)}")
        raise APIError(f"Failed to generate YouTube auth URL: {str(e)}")

@app.get("/youtube_callback")
def youtube_callback(code: str, state: str = None, user_id: str = None):
    """Handle the redirect from YouTube, exchange code for tokens, and store them."""
    try:
        if not state:
            raise ValidationError("user_id (state) is required for YouTube callback.")
        user_id = state
        client_secrets_file = os.path.join(os.path.dirname(__file__), 'src', 'auth_tokens', 'desktop_client_secrets.json')
        scopes = [
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.readonly',
        ]
        redirect_uri = os.environ.get("YT_WEB_REDIRECT_URI", "https://syncer-26vh.onrender.com/youtube_callback")
        flow = Flow.from_client_secrets_file(
            client_secrets_file,
            scopes=scopes,
            redirect_uri=redirect_uri
        )
        flow.fetch_token(code=code)
        creds = flow.credentials
        # Save creds for user_id in the database
        save_youtube_token(user_id, creds.to_json())
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}/youtube-auth-success?user_id={user_id}")
    except Exception as e:
        logger.error(f"YouTube callback error: {str(e)}")
        raise APIError(f"Failed to complete YouTube OAuth: {str(e)}")

@app.get("/api/youtube_auth_status")
def youtube_auth_status(user_id: str):
    """
    Check if the user is authenticated with YouTube.
    Returns: { "authenticated": true/false }
    """
    logger.info(f"Checking YouTube auth status for user_id: {user_id}")
    try:
        # First check if we have a token in the database
        token = get_youtube_token(user_id)
        if not token:
            logger.info(f"No token found in database for user_id: {user_id}")
            return {"authenticated": False}
        
        # Try to create a YouTube provider to validate the token
        yt = YoutubeProvider(user_id)
        is_authenticated = yt._check_authenticated()
        logger.info(f"YouTube auth status for user_id {user_id}: {is_authenticated}")
        return {"authenticated": is_authenticated}
    except Exception as e:
        logger.error(f"Error checking YouTube auth status for user_id {user_id}: {str(e)}")
        return {"authenticated": False}
