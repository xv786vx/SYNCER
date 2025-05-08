# Example using FastAPI
import sys
import os
from fastapi import FastAPI, Request

# Add the parent directory of 'functions' to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'functions'))
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.merge_playlists import merge_playlists
from src.functions.download_yt_song import download_yt_song


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
    result = sync_yt_to_sp(playlist_name)
    return {"status": "success", "result": result}

@app.get("/api/sync_sp_to_yt")
def api_sync_sp_to_yt(playlist_name: str):
    result = sync_sp_to_yt(playlist_name)
    return {"status": "success", "result": result}

@app.get("/api/merge_playlists")
def api_merge_playlists(yt_playlist: str, sp_playlist: str):
    result = merge_playlists(yt_playlist, sp_playlist)
    return {"status": "success", "result": result}

@app.get("/api/download_yt_song")
def api_download_yt_song(song_name: str, artists: str):
    result = download_yt_song(song_name, artists)
    return {"status": "success", "result": result}