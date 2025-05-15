import sys
import os
from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Optional

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


class SongStatus(BaseModel):
    name: str
    status: str # 'found', 'not_found', 'skipped'
    requires_manual_search: Optional[bool] = False

class SyncResponse(BaseModel):
    playlist: str
    songs: List[SongStatus]

app = FastAPI()

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
    return {"name": "Syncer", "authenticated": session_store["authenticated"]}

@app.get("/api/authenticate")
def authenticate(): 
    session_store["authenticated"] = True
    return session_store

@app.get("/api/sync_yt_to_sp")
def api_sync_yt_to_sp(playlist_name: str):
    results = sync_yt_to_sp(playlist_name)
    return {
        'playlist': playlist_name,
        'songs': results
    }

@app.post("/api/finalize_yt_to_sp")
def finalize_yt_to_sp(playlist_name: str = Body(...), sp_ids: list = Body(...)):
    sp = SpotifyProvider()
    # Ensure playlist exists (or create it)
    pl_info = sp.get_playlist_by_name(playlist_name)
    if pl_info is None:
        pl_info = sp.create_playlist(playlist_name)
    playlist_id = pl_info['id']
    # Add all found/matched songs to the playlist
    sp.add_to_playlist(playlist_id, sp_ids)
    return {"status": "success", "message": f"Playlist '{playlist_name}' created/updated with {len(sp_ids)} songs."}


@app.get("/api/sync_sp_to_yt")
def api_sync_sp_to_yt(playlist_name: str):
    results = sync_sp_to_yt(playlist_name)
    return {
        'playlist': playlist_name,
        'songs': results
    }

@app.post("/api/finalize_sp_to_yt")
def finalize_sp_to_yt(playlist_name: str = Body(...), yt_ids: list = Body(...)):
    yt = YoutubeProvider()
    # Ensure playlist exists (or create it)
    pl_info = yt.get_playlist_by_name(playlist_name)
    if pl_info is None:
        pl_info = yt.create_playlist(playlist_name)
    playlist_id = pl_info['id']
    # Add all found/matched songs to the playlist
    yt.add_to_playlist(playlist_id, yt_ids)
    return {"status": "success", "message": f"Playlist '{playlist_name}' created/updated with {len(yt_ids)} songs."}


@app.get("/api/merge_playlists")
def api_merge_playlists(yt_playlist: str, sp_playlist: str):
    result = merge_playlists(yt_playlist, sp_playlist)
    return {"status": "success", "result": result}

@app.get("/api/download_yt_song")
def api_download_yt_song(song_name: str, artists: str):
    result = download_yt_song(song_name, artists)
    return {"status": "success", "result": result}

@app.get("/api/manual_search_sp_to_yt")
def manual_search_sp_to_yt(song: str, artist: str):
    yt = YoutubeProvider()
    result = yt.search_manual(song, artist)
    if result:
        return {"status": "found", "yt_id": result}
    else:
        return {"status": "not_found"}

@app.get("/api/manual_search_yt_to_sp")
def manual_search_yt_to_sp(song: str, artist: str):
    sp = SpotifyProvider()
    result = sp.search_manual(song, artist)
    if result:
        return {"status": "found", "sp_id": result}
    else:
        return {"status": "not_found"}