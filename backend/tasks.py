from backend.celery_worker import celery_app
from backend.src.db.jobs import Job
from backend.src.db.youtube_token import SessionLocal
from backend.src.functions.sync_sp_to_yt import sync_sp_to_yt
from backend.src.functions.sync_yt_to_sp import sync_yt_to_sp
from backend.src.functions.merge_playlists import merge_playlists
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
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update job {job_id}: {e}")

@celery_app.task(name="backend.tasks.run_sync_sp_to_yt_job")
def run_sync_sp_to_yt_job(job_id: str, playlist_name: str, user_id: str):
    logger.info(f"Starting Spotify to YouTube sync job {job_id} for playlist '{playlist_name}'")
    db = SessionLocal()
    try:
        songs = sync_sp_to_yt(playlist_name, user_id)
        _update_job_status(db, job_id, 'ready_to_finalize', result={'songs': songs})
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
    finally:
        db.close()

@celery_app.task(name="backend.tasks.run_sync_yt_to_sp_job")
def run_sync_yt_to_sp_job(job_id: str, playlist_name: str, user_id: str):
    logger.info(f"Starting YouTube to Spotify sync job {job_id} for playlist '{playlist_name}'")
    db = SessionLocal()
    try:
        songs = sync_yt_to_sp(playlist_name, user_id)
        _update_job_status(db, job_id, 'ready_to_finalize', result={'songs': songs})
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
    finally:
        db.close()

@celery_app.task(name="backend.tasks.run_merge_playlists_job")
def run_merge_playlists_job(job_id: str, yt_playlist: str, sp_playlist: str, new_playlist_name: str, user_id: str):
    logger.info(f"Starting merge playlists job {job_id} for '{new_playlist_name}'")
    db = SessionLocal()
    try:
        result_message = merge_playlists(yt_playlist, sp_playlist, new_playlist_name, user_id)
        _update_job_status(db, job_id, 'ready_to_finalize', result={'result': result_message})
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
    finally:
        db.close() 