import logging
import datetime
from db_models import SessionLocal, Job
from celery_worker import celery_app
from src.functions.sync_sp_to_yt import sync_sp_to_yt
from task_definitions import (
    run_sync_sp_to_yt_job as _run_sync_sp_to_yt_job,
    run_sync_yt_to_sp_job as _run_sync_yt_to_sp_job,
    run_merge_playlists_job as _run_merge_playlists_job,
    run_finalize_job as _run_finalize_job
)
from src.functions.helpers.yt_provider import YoutubeProvider
from src.functions.helpers.sp_provider import SpotifyProvider

logger = logging.getLogger(__name__)

@celery_app.task(name='tasks.run_sync_sp_to_yt_job')
def run_sync_sp_to_yt_job(job_id: str, playlist_name: str, user_id: str, song_limit: int | None = None):
    return _run_sync_sp_to_yt_job(job_id, playlist_name, user_id, song_limit)

@celery_app.task(name='tasks.run_sync_yt_to_sp_job')
def run_sync_yt_to_sp_job(job_id: str, playlist_name: str, user_id: str):
    return _run_sync_yt_to_sp_job(job_id, playlist_name, user_id)

@celery_app.task(name='tasks.run_merge_playlists_job')
def run_merge_playlists_job(job_id: str, yt_playlist: str, sp_playlist: str, new_playlist_name: str, user_id: str):
    return _run_merge_playlists_job(job_id, yt_playlist, sp_playlist, new_playlist_name, user_id)

@celery_app.task(name="tasks.run_finalize_job")
def run_finalize_job(job_id):
    return _run_finalize_job(job_id)