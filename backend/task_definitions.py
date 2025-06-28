from db_models import Job, SessionLocal
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from src.functions.sync_yt_to_sp import sync_yt_to_sp
from src.functions.merge_playlists import merge_playlists
from src.functions.helpers.sp_provider import SpotifyProvider
from src.functions.helpers.yt_provider import YoutubeProvider
from sqlalchemy.orm import Session
import logging
import datetime

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

def run_sync_sp_to_yt_job(job_id: str, playlist_name: str, user_id: str, song_limit: int | None = None):
    logger.info(f"=== TASK STARTED: run_sync_sp_to_yt_job ===")
    logger.info(f"Job ID: {job_id}")
    logger.info(f"Playlist: {playlist_name}")
    logger.info(f"User ID: {user_id}")
    if song_limit is not None:
        logger.info(f"Song limit: {song_limit}")
    
    db = SessionLocal()
    try:
        logger.info(f"Starting Spotify to YouTube sync for playlist '{playlist_name}'")
        sp = SpotifyProvider(user_id)
        songs = sync_sp_to_yt(playlist_name, sp, db, song_limit=song_limit)
        logger.info(f"Sync completed, found {len(songs) if songs else 0} songs")
        _update_job_status(db, job_id, 'ready_to_finalize', result={'songs': songs})
        logger.info(f"=== TASK COMPLETED: run_sync_sp_to_yt_job ===")
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
        logger.info(f"=== TASK FAILED: run_sync_sp_to_yt_job ===")
    finally:
        db.close()

def run_sync_yt_to_sp_job(job_id: str, playlist_name: str, user_id: str):
    logger.info(f"=== TASK STARTED: run_sync_yt_to_sp_job ===")
    logger.info(f"Job ID: {job_id}")
    logger.info(f"Playlist: {playlist_name}")
    logger.info(f"User ID: {user_id}")
    
    db = SessionLocal()
    try:
        logger.info(f"Starting YouTube to Spotify sync for playlist '{playlist_name}'")
        yt = YoutubeProvider(user_id)
        songs = sync_yt_to_sp(playlist_name, yt, db)
        logger.info(f"Sync completed, found {len(songs) if songs else 0} songs")
        _update_job_status(db, job_id, 'ready_to_finalize', result={'songs': songs})
        logger.info(f"=== TASK COMPLETED: run_sync_yt_to_sp_job ===")
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
        logger.info(f"=== TASK FAILED: run_sync_yt_to_sp_job ===")
    finally:
        db.close()

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
        result_message = merge_playlists(yt_playlist, sp_playlist, new_playlist_name, user_id, db)
        logger.info(f"Merge completed: {result_message}")
        _update_job_status(db, job_id, 'ready_to_finalize', result={'result': result_message})
        logger.info(f"=== TASK COMPLETED: run_merge_playlists_job ===")
    except Exception as e:
        logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        _update_job_status(db, job_id, 'error', error=str(e))
        logger.info(f"=== TASK FAILED: run_merge_playlists_job ===")
    finally:
        db.close()

def run_finalize_job(job_id: str):
    logger.info(f"=== TASK STARTED: run_finalize_job ===")
    logger.info(f"Job ID: {job_id}")
    db = SessionLocal()
    try:
        job = db.query(Job).filter_by(job_id=job_id).first()
        if not job:
            logger.error(f"Finalize task: Job {job_id} not found.")
            return

        # Add a check to ensure the job is in the 'finalizing' state
        if job.status != 'finalizing':
            logger.warning(f"Job {job_id} is not in 'finalizing' state (current: {job.status}). Aborting finalize task.")
            return

        songs = job.result.get("songs", []) if job.result else []
        
        if job.type == "sync_sp_to_yt":
            yt_ids = [song.get("yt_id") for song in songs if song.get("status") == "found" and song.get("yt_id")]
            if yt_ids:
                yt = YoutubeProvider(job.user_id)
                pl_info = yt.get_playlist_by_name(job.playlist_name, db)
                if pl_info is None:
                    pl_info = yt.create_playlist(job.playlist_name, db)
                playlist_id = pl_info['id']
                yt.add_to_playlist(playlist_id, yt_ids, db)
                
        elif job.type == "sync_yt_to_sp":
            sp_ids = [song.get("sp_id") for song in songs if song.get("status") == "found" and song.get("sp_id")]
            if sp_ids:
                sp = SpotifyProvider(job.user_id)
                pl_info = sp.get_playlist_by_name(job.playlist_name)
                if pl_info is None:
                    pl_info = sp.create_playlist(job.playlist_name)
                playlist_id = pl_info['id']
                sp.add_to_playlist(playlist_id, sp_ids)

        _update_job_status(db, job_id, "completed")
        logger.info(f"Successfully finalized and completed job {job_id}")
        logger.info(f"=== TASK COMPLETED: run_finalize_job ===")

    except Exception as e:
        logger.error(f"Error finalizing job {job_id}: {str(e)}", exc_info=True)
        _update_job_status(db, job_id, "error", error=str(e))
        logger.info(f"=== TASK FAILED: run_finalize_job ===")
    finally:
        db.close()