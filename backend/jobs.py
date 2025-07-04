from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db_models import Job, SessionLocal
import datetime
import uuid
import time
import re
from pydantic import BaseModel
import logging
from tasks import run_sync_sp_to_yt_job, run_sync_yt_to_sp_job, run_merge_playlists_job, run_finalize_job
from src.db.youtube_quota import get_total_quota_used, reserve_quota_atomic
from src.functions.helpers.sp_provider import get_spotify_client
from spotipy import SpotifyException
import math

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

class SyncRequest(BaseModel):
    playlist_name: str
    user_id: str

class MergeRequest(BaseModel):
    yt_playlist: str
    sp_playlist: str
    new_playlist_name: str
    user_id: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def validate_playlist_name(playlist_name: str):
    """Raises HTTPException if the playlist name contains invalid characters."""
    # This regex looks for characters that are often problematic in file paths or URLs.
    if re.search(r'[\\/\[\]+?#&%*|<>"\']', playlist_name):
        raise HTTPException(
            status_code=400,
            detail=f"Playlist name ''{playlist_name}'' contains invalid characters. Please rename the playlist and try again."
        )

@router.post("/sync_sp_to_yt", status_code=202)
def start_sync_sp_to_yt(request: SyncRequest, db: Session = Depends(get_db)):
    validate_playlist_name(request.playlist_name)


    QUOTA_PER_SONG_SP_TO_YT = 51  # 1 for list, 50 for insert
    QUOTA_LIMIT = 10000
    QUOTA_BUFFER = 500

    try:
        sp = get_spotify_client(request.user_id)
        if not sp:
            raise HTTPException(status_code=401, detail="Spotify authentication required.")
        playlists = sp.current_user_playlists()
        target_playlist = next((p for p in playlists.get('items', []) if p['name'] == request.playlist_name), None)
        if not target_playlist:
            raise HTTPException(status_code=404, detail=f"Spotify playlist '{request.playlist_name}' not found.")
        track_count = target_playlist['tracks']['total']
        estimated_cost = track_count * QUOTA_PER_SONG_SP_TO_YT

        # --- Atomic Quota Reservation ---
        job_notes = None
        # Try to reserve quota for the full request
        if not reserve_quota_atomic(db, estimated_cost, QUOTA_LIMIT - QUOTA_BUFFER):
            # Not enough quota for full request, try partial
            available_quota = QUOTA_LIMIT - QUOTA_BUFFER - get_total_quota_used(db)
            songs_to_sync = math.floor(available_quota / QUOTA_PER_SONG_SP_TO_YT)
            if songs_to_sync < 1:
                raise HTTPException(
                    status_code=429,
                    detail="Insufficient YouTube API quota to sync any songs. Please try again after the quota resets."
                )
            partial_cost = songs_to_sync * QUOTA_PER_SONG_SP_TO_YT
            if not reserve_quota_atomic(db, partial_cost, QUOTA_LIMIT - QUOTA_BUFFER):
                raise HTTPException(
                    status_code=429,
                    detail="Insufficient YouTube API quota to sync any songs. Please try again after the quota resets."
                )
            job_notes = f"Sync limited to {songs_to_sync} of {track_count} songs due to YouTube API quota."
            logger.info(f"Partial sync for playlist '{request.playlist_name}'. Song limit: {songs_to_sync}")
            song_limit = min(songs_to_sync, 50)
        else:
            song_limit = min(track_count, 50)

    except SpotifyException as e:
        logger.error(f"Spotify API error for user {request.user_id}: {e}")
        raise HTTPException(status_code=401, detail="Could not connect to Spotify. Please re-authenticate.")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during quota pre-calculation for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while checking API quotas.")

    if track_count == 0:
        job_id = uuid.uuid4()
        logger.info(f"No songs to sync for playlist '{request.playlist_name}'. Creating completed job {job_id}.")
        job = Job(
            job_id=job_id,
            user_id=request.user_id,
            type="sync_sp_to_yt",
            status="completed",
            playlist_name=request.playlist_name,
            job_notes="No songs to sync. All songs already exist on YouTube or playlist is empty.",
            result={"songs": [], "note": "No songs to sync."}
        )
        db.add(job)
        db.commit()
        logger.info(f"Created completed job {job_id} in database (no songs to sync)")
        return {"job_id": str(job_id)}

    job_id = uuid.uuid4()
    logger.info(f"Starting sync job {job_id} for playlist '{request.playlist_name}'")
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="sync_sp_to_yt",
        status="pending",
        playlist_name=request.playlist_name,
        job_notes=job_notes
    )
    db.add(job)
    db.commit()
    logger.info(f"Created job {job_id} in database")
    logger.info(f"Queueing task run_sync_sp_to_yt_job for job {job_id}")
    result = run_sync_sp_to_yt_job.apply_async(
        args=(str(job_id), request.playlist_name, request.user_id, song_limit),
        queue='jobs'
    )
    logger.info(f"Task queued with task_id: {result.id}")
    return {"job_id": str(job_id)}

@router.post("/sync_yt_to_sp", status_code=202)
def start_sync_yt_to_sp(request: SyncRequest, db: Session = Depends(get_db)):
    validate_playlist_name(request.playlist_name)


    QUOTA_PER_SONG_YT_TO_SP = 1  # Adjust as needed for your actual quota cost
    QUOTA_LIMIT = 10000
    QUOTA_BUFFER = 500

    try:
        # You need to implement a way to get the YouTube playlist and its track count for the user
        # For now, let's assume you have a function get_yt_playlist_track_count(user_id, playlist_name)
        from src.db.youtube_quota import get_yt_playlist_track_count
        track_count = get_yt_playlist_track_count(request.user_id, request.playlist_name)
        estimated_cost = track_count * QUOTA_PER_SONG_YT_TO_SP

        job_notes = None
        # Try to reserve quota for the full request
        if not reserve_quota_atomic(db, estimated_cost, QUOTA_LIMIT - QUOTA_BUFFER):
            # Not enough quota for full request, try partial
            available_quota = QUOTA_LIMIT - QUOTA_BUFFER - get_total_quota_used(db)
            songs_to_sync = math.floor(available_quota / QUOTA_PER_SONG_YT_TO_SP)
            if songs_to_sync < 1:
                raise HTTPException(
                    status_code=429,
                    detail="Insufficient YouTube API quota to sync any songs. Please try again after the quota resets."
                )
            partial_cost = songs_to_sync * QUOTA_PER_SONG_YT_TO_SP
            if not reserve_quota_atomic(db, partial_cost, QUOTA_LIMIT - QUOTA_BUFFER):
                raise HTTPException(
                    status_code=429,
                    detail="Insufficient YouTube API quota to sync any songs. Please try again after the quota resets."
                )
            job_notes = f"Sync limited to {songs_to_sync} of {track_count} songs due to YouTube API quota."
            logger.info(f"Partial sync for playlist '{request.playlist_name}'. Song limit: {songs_to_sync}")
            song_limit = min(songs_to_sync, 50)
        else:
            song_limit = min(track_count, 50)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error during quota pre-calculation for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while checking API quotas.")

    if track_count == 0:
        job_id = uuid.uuid4()
        logger.info(f"No songs to sync for playlist '{request.playlist_name}'. Creating completed job {job_id}.")
        job = Job(
            job_id=job_id,
            user_id=request.user_id,
            type="sync_yt_to_sp",
            status="completed",
            playlist_name=request.playlist_name,
            job_notes="No songs to sync. All songs already exist on Spotify or playlist is empty.",
            result={"songs": [], "note": "No songs to sync."}
        )
        db.add(job)
        db.commit()
        logger.info(f"Created completed job {job_id} in database (no songs to sync)")
        return {"job_id": str(job_id)}

    job_id = uuid.uuid4()
    logger.info(f"Starting sync job {job_id} for playlist '{request.playlist_name}'")
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="sync_yt_to_sp",
        status="pending",
        playlist_name=request.playlist_name,
        job_notes=job_notes
    )
    db.add(job)
    db.commit()
    logger.info(f"Created job {job_id} in database")
    logger.info(f"Queueing task run_sync_yt_to_sp_job for job {job_id}")
    result = run_sync_yt_to_sp_job.apply_async(
        args=(str(job_id), request.playlist_name, request.user_id, song_limit),
        queue='jobs'
    )
    logger.info(f"Task queued with task_id: {result.id}")
    return {"job_id": str(job_id)}

@router.post("/merge_playlists", status_code=202)
def start_merge_playlists(request: MergeRequest, db: Session = Depends(get_db)):
    validate_playlist_name(request.new_playlist_name)
    validate_playlist_name(request.yt_playlist)
    validate_playlist_name(request.sp_playlist)
    job_id = uuid.uuid4()
    logger.info(f"Starting merge job {job_id} for '{request.new_playlist_name}'")
    
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="merge",
        status="pending",
        playlist_name=request.new_playlist_name,
    )
    db.add(job)
    db.commit()
    logger.info(f"Created job {job_id} in database")

    logger.info(f"Queueing task run_merge_playlists_job for job {job_id}")
    result = run_merge_playlists_job.apply_async(
        args=(str(job_id), request.yt_playlist, request.sp_playlist, request.new_playlist_name, request.user_id),
        queue='jobs'
    )
    logger.info(f"Task queued with task_id: {result.id}")
    
    return {"job_id": str(job_id)}

@router.get("/{job_id}")
def get_job_status(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": str(job.job_id),
        "status": job.status,
        "result": job.result,
        "error": job.error,
        "type": job.type,
        "playlist_name": job.playlist_name,
        "updated_at": job.updated_at
    }

@router.get("/latest/{user_id}")
def get_latest_job(user_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.user_id == user_id).order_by(Job.created_at.desc()).first()
    if not job:
        raise HTTPException(status_code=404, detail="No jobs found for user")
    return get_job_status(job.job_id, db)

@router.post("/{job_id}/finalize")
def finalize_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter_by(job_id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "ready_to_finalize":
        raise HTTPException(status_code=400, detail=f"Job is not ready to finalize, current status is {job.status}")

    # Update status to 'finalizing' and queue the background task
    job.status = "finalizing"
    job.updated_at = datetime.datetime.utcnow()
    db.commit()

    run_finalize_job.apply_async(args=[job_id], queue='jobs')

    logger.info(f"Queued finalization for job {job_id}")
    return {"job_id": job_id, "status": "finalizing"}