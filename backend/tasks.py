from celery_worker import celery_app
from task_definitions import (
    run_sync_sp_to_yt_job as _run_sync_sp_to_yt_job,
    run_sync_yt_to_sp_job as _run_sync_yt_to_sp_job,
    run_merge_playlists_job as _run_merge_playlists_job
)

@celery_app.task(name='tasks.run_sync_sp_to_yt_job')
def run_sync_sp_to_yt_job(job_id: str, playlist_name: str, user_id: str):
    return _run_sync_sp_to_yt_job(job_id, playlist_name, user_id)

@celery_app.task(name='tasks.run_sync_yt_to_sp_job')
def run_sync_yt_to_sp_job(job_id: str, playlist_name: str, user_id: str):
    return _run_sync_yt_to_sp_job(job_id, playlist_name, user_id)

@celery_app.task(name='tasks.run_merge_playlists_job')
def run_merge_playlists_job(job_id: str, yt_playlist: str, sp_playlist: str, new_playlist_name: str, user_id: str):
    return _run_merge_playlists_job(job_id, yt_playlist, sp_playlist, new_playlist_name, user_id) 