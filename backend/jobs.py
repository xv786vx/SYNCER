from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from backend.src.db import Job, Base
from backend.src.db.youtube_token import SessionLocal  # or your session factory
import datetime
import uuid
from celery_worker import celery_app
import time
from backend.src.functions.sync_sp_to_yt import sync_sp_to_yt
from backend.src.functions.sync_yt_to_sp import sync_yt_to_sp
from backend.src.functions.merge_playlists import merge_playlists
from backend.tasks import run_sync_sp_to_yt_job, run_sync_yt_to_sp_job, run_merge_playlists_job
from pydantic import BaseModel


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

@celery_app.task
def run_sync_sp_to_yt_job(job_id: str, user_id: str, playlist_name: str):
    session = SessionLocal()
    try:
        job = session.query(Job).filter_by(job_id=job_id).first()
        if not job:
            return
        # --- Actual sync logic ---
        result = sync_sp_to_yt(playlist_name, user_id)  # Adjust args as needed
        job.status = "ready_to_finalize"
        job.result = result  # Should be serializable (e.g., dict of found songs)
        job.updated_at = datetime.datetime.utcnow()
        session.commit()
    except Exception as e:
        job.status = "error"
        job.error = str(e)
        session.commit()
    finally:
        session.close()

@celery_app.task
def run_sync_yt_to_sp_job(job_id: str, user_id: str, playlist_name: str):
    session = SessionLocal()
    try:
        job = session.query(Job).filter_by(job_id=job_id).first()
        if not job:
            return
        result = sync_yt_to_sp(playlist_name, user_id)
        job.status = "ready_to_finalize"
        job.result = result
        job.updated_at = datetime.datetime.utcnow()
        session.commit()
    except Exception as e:
        job.status = "error"
        job.error = str(e)
        session.commit()
    finally:
        session.close()

@celery_app.task
def run_merge_playlists_job(job_id: str, user_id: str, yt_playlist: str, sp_playlist: str, merge_name: str):
    session = SessionLocal()
    try:
        job = session.query(Job).filter_by(job_id=job_id).first()
        if not job:
            return
        result = merge_playlists(yt_playlist, sp_playlist, merge_name, user_id)
        job.status = "ready_to_finalize"
        job.result = result
        job.updated_at = datetime.datetime.utcnow()
        session.commit()
    except Exception as e:
        job.status = "error"
        job.error = str(e)
        session.commit()
    finally:
        session.close()

@router.post("/sync_sp_to_yt", status_code=202)
def start_sync_sp_to_yt(request: SyncRequest, db: Session = Depends(get_db)):
    job_id = uuid.uuid4()
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="sync_sp_to_yt",
        status="pending",
        playlist_name=request.playlist_name,
    )
    db.add(job)
    db.commit()
    
    run_sync_sp_to_yt_job.delay(job_id=str(job_id), playlist_name=request.playlist_name, user_id=request.user_id)
    return {"job_id": str(job_id)}

@router.post("/sync_yt_to_sp", status_code=202)
def start_sync_yt_to_sp(request: SyncRequest, db: Session = Depends(get_db)):
    job_id = uuid.uuid4()
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="sync_yt_to_sp",
        status="pending",
        playlist_name=request.playlist_name,
    )
    db.add(job)
    db.commit()
    
    run_sync_yt_to_sp_job.delay(job_id=str(job_id), playlist_name=request.playlist_name, user_id=request.user_id)
    return {"job_id": str(job_id)}

@router.post("/merge_playlists", status_code=202)
def start_merge_playlists(request: MergeRequest, db: Session = Depends(get_db)):
    job_id = uuid.uuid4()
    job = Job(
        job_id=job_id,
        user_id=request.user_id,
        type="merge",
        status="pending",
        playlist_name=request.new_playlist_name,
    )
    db.add(job)
    db.commit()

    run_merge_playlists_job.delay(
        job_id=str(job_id), 
        yt_playlist=request.yt_playlist, 
        sp_playlist=request.sp_playlist,
        new_playlist_name=request.new_playlist_name,
        user_id=request.user_id
    )
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

@router.post("/jobs/{job_id}/finalize")
def finalize_job(job_id: str):
    session = SessionLocal()
    job = session.query(Job).filter_by(job_id=job_id).first()
    if not job:
        session.close()
        raise HTTPException(status_code=404, detail="Job not found")
    # Do the finalization work here (e.g., actually create the playlist)
    job.status = "done"
    job.updated_at = datetime.datetime.utcnow()
    session.commit()
    session.close()
    return {"job_id": job_id, "status": "done"}