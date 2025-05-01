# Example using FastAPI
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: ["chrome-extension://<your-extension-id>"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {"message": "Welcome to SYNCER! brah brah"}


@app.get("/api/sync_playlist")
def sync_playlist(playlist_name: str):
    # Logic to sync playlist
    return {"status": "success", "message": f"Playlist '{playlist_name}' synced."}
