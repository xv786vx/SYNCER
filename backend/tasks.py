from celery_worker import celery_app
from src.db import Job
from src.db.youtube_token import SessionLocal
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.merge_playlists import merge_playlists
from sqlalchemy.orm import Session
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _update_job_status(db: Session, job_id: str, status: str, result: dict = None, error: str = None):
    """Helper to update a job's status, result, and error message."""
    try:
        job = db.query(Job).filter(Job.job_id == job_id).first()
        if job:
            job.status = status
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error
            db.commit()
            logger.info(f"Updated job {job_id} to status {status}")
        else:
            logger.error(f"Job {job_id} not found in database")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update job {job_id}: {e}")

@celery_app.task
def run_sync_sp_to_yt_job(job_id: str, playlist_name: str, user_id: str):
    logger.info(f"=== TASK STARTED: run_sync_sp_to_yt_job ===")
    logger.info(f"Job ID: {job_id}")
    logger.info(f"Playlist: {playlist_name}")
    logger.info(f"User ID: {user_id}")
    
    db = SessionLocal()
    try:
        logger.info(f"Starting Spotify to YouTube sync for playlist '{playlist_name}'")
        songs = sync_sp_to_yt(playlist_name, user_id)
        logger.info(f"Sync completed, found {len(songs) if songs else 0} songs")
        _update_job_status(db, job_id, 'ready_to_finalize', result={'songs': songs})
        logger.info(f"=== TASK COMPLETED: run_sync_sp_to_yt_job ===")
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
        logger.info(f"=== TASK FAILED: run_sync_sp_to_yt_job ===")
    finally:
        db.close()

@celery_app.task
def run_sync_yt_to_sp_job(job_id: str, playlist_name: str, user_id: str):
    logger.info(f"=== TASK STARTED: run_sync_yt_to_sp_job ===")
    logger.info(f"Job ID: {job_id}")
    logger.info(f"Playlist: {playlist_name}")
    logger.info(f"User ID: {user_id}")
    
    db = SessionLocal()
    try:
        logger.info(f"Starting YouTube to Spotify sync for playlist '{playlist_name}'")
        songs = sync_yt_to_sp(playlist_name, user_id)
        logger.info(f"Sync completed, found {len(songs) if songs else 0} songs")
        _update_job_status(db, job_id, 'ready_to_finalize', result={'songs': songs})
        logger.info(f"=== TASK COMPLETED: run_sync_yt_to_sp_job ===")
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
        logger.info(f"=== TASK FAILED: run_sync_yt_to_sp_job ===")
    finally:
        db.close()

@celery_app.task
def run_merge_playlists_job(job_id: str, yt_playlist: str, sp_playlist: str, new_playlist_name: str, user_id: str):
    logger.info(f"=== TASK STARTED: run_merge_playlists_job ===")
    logger.info(f"Job ID: {job_id}")
    logger.info(f"YT Playlist: {yt_playlist}")
    logger.info(f"SP Playlist: {sp_playlist}")
    logger.info(f"New Name: {new_playlist_name}")
    logger.info(f"User ID: {user_id}")
    
    db = SessionLocal()
    try:
        logger.info(f"Starting merge for '{new_playlist_name}'")
        result_message = merge_playlists(yt_playlist, sp_playlist, new_playlist_name, user_id)
        logger.info(f"Merge completed: {result_message}")
        _update_job_status(db, job_id, 'ready_to_finalize', result={'result': result_message})
        logger.info(f"=== TASK COMPLETED: run_merge_playlists_job ===")
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
        logger.info(f"=== TASK FAILED: run_merge_playlists_job ===")
    finally:
        db.close() 