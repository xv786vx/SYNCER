from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from src.db import Job, Base
from src.db.youtube_token import SessionLocal  # or your session factory
import datetime
import uuid
from celery_worker import celery_app
import time
from pydantic import BaseModel
import logging
from tasks import run_sync_sp_to_yt_job, run_sync_yt_to_sp_job, run_merge_playlists_job
from src.functions.helpers.yt_provider import YoutubeProvider
from src.functions.helpers.sp_provider import SpotifyProvider

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

@router.post("/sync_sp_to_yt", status_code=202)
def start_sync_sp_to_yt(request: SyncRequest, db: Session = Depends(get_db)):
    job_id = uuid.uuid4()
    logger.info(f"Starting sync job {job_id} for playlist '{request.playlist_name}'")
    
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="sync_sp_to_yt",
        status="pending",
        playlist_name=request.playlist_name,
    )
    db.add(job)
    db.commit()
    logger.info(f"Created job {job_id} in database")
    
    logger.info(f"Queueing task run_sync_sp_to_yt_job for job {job_id}")
    result = run_sync_sp_to_yt_job.apply_async(
        args=(str(job_id), request.playlist_name, request.user_id),
        queue='jobs'
    )
    logger.info(f"Task queued with task_id: {result.id}")
    
    return {"job_id": str(job_id)}

@router.post("/sync_yt_to_sp", status_code=202)
def start_sync_yt_to_sp(request: SyncRequest, db: Session = Depends(get_db)):
    job_id = uuid.uuid4()
    logger.info(f"Starting sync job {job_id} for playlist '{request.playlist_name}'")
    
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="sync_yt_to_sp",
        status="pending",
        playlist_name=request.playlist_name,
    )
    db.add(job)
    db.commit()
    logger.info(f"Created job {job_id} in database")
    
    logger.info(f"Queueing task run_sync_yt_to_sp_job for job {job_id}")
    result = run_sync_yt_to_sp_job.apply_async(
        args=(str(job_id), request.playlist_name, request.user_id),
        queue='jobs'
    )
    logger.info(f"Task queued with task_id: {result.id}")
    
    return {"job_id": str(job_id)}

@router.post("/merge_playlists", status_code=202)
def start_merge_playlists(request: MergeRequest, db: Session = Depends(get_db)):
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
        raise HTTPException(status_code=400, detail="Job is not ready to finalize")
    
    try:
        # Get the songs from the job result
        songs = job.result.get("songs", []) if job.result else []
        
        if job.type == "sync_sp_to_yt":
            # Finalize Spotify to YouTube sync
            yt_ids = [song.get("yt_id") for song in songs if song.get("status") == "found" and song.get("yt_id")]
            if yt_ids:
                yt = YoutubeProvider(job.user_id)
                pl_info = yt.get_playlist_by_name(job.playlist_name, db)
                if pl_info is None:
                    pl_info = yt.create_playlist(job.playlist_name, db)
                playlist_id = pl_info['id']
                yt.add_to_playlist(playlist_id, yt_ids, db)
                
        elif job.type == "sync_yt_to_sp":
            # Finalize YouTube to Spotify sync
            sp_ids = [song.get("sp_id") for song in songs if song.get("status") == "found" and song.get("sp_id")]
            if sp_ids:
                sp = SpotifyProvider(job.user_id)
                pl_info = sp.get_playlist_by_name(job.playlist_name)
                if pl_info is None:
                    pl_info = sp.create_playlist(job.playlist_name)
                playlist_id = pl_info['id']
                sp.add_to_playlist(playlist_id, sp_ids)
        
        # Mark job as done
        job.status = "completed"
        job.updated_at = datetime.datetime.utcnow()
        db.commit()
        
        return {"job_id": job_id, "status": "completed", "message": f"Playlist '{job.playlist_name}' created/updated successfully"}
        
    except Exception as e:
        logger.error(f"Error finalizing job {job_id}: {str(e)}")
        job.status = "error"
        job.error = str(e)
        job.updated_at = datetime.datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to finalize sync: {str(e)}")