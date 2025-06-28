import sys
import os
from celery import Celery
from dotenv import load_dotenv
from datetime import datetime, timedelta
from celery.schedules import crontab
from db_models import SessionLocal, Job

# Add the 'backend' directory to the Python path.
# This allows the worker to find modules using absolute paths like `from src.db...`
# just like the FastAPI application does.
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Load environment variables from .env file
# This must be done before other modules that depend on env vars are imported.
load_dotenv()

# TODO: Move the Redis URL to an environment variable in a real-world scenario
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "tasks",  # Change this to match the tasks module name
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks']  # Make sure tasks module is included
)
import tasks

# Configure Celery
celery_app.conf.update(
    task_track_started=True,
    task_routes={
        "tasks.run_sync_sp_to_yt_job": {"queue": "jobs"},
        "tasks.run_sync_yt_to_sp_job": {"queue": "jobs"},
        "tasks.run_merge_playlists_job": {"queue": "jobs"},
        "celery_worker.cleanup_jobs": {"queue": "cleanup"},
    },
    task_default_queue="jobs",
    task_queues={
        "jobs": {"routing_key": "jobs"},
        "cleanup": {"routing_key": "cleanup"},
    },
)

@celery_app.task(name="celery_worker.cleanup_jobs")
def cleanup_jobs():
    """
    Celery task to clean up old and stale jobs.
    - Marks jobs stuck in 'pending' or 'ready_to_finalize' for over an hour as 'error'.
    - Deletes jobs in 'completed' or 'error' state that are older than 5 minutes.
    """
    db = SessionLocal()
    try:
        # Mark stale jobs as 'error'
        stale_time_threshold = datetime.utcnow() - timedelta(hours=1)
        stale_jobs = db.query(Job).filter(
            Job.status.in_(['pending', 'ready_to_finalize']),
            Job.updated_at < stale_time_threshold
        ).all()
        for job in stale_jobs:
            job.status = 'error'
            job.error_message = 'Job timed out.'
            job.updated_at = datetime.utcnow()
        
        # Delete old completed or errored jobs
        cleanup_time_threshold = datetime.utcnow() - timedelta(minutes=5)
        db.query(Job).filter(
            Job.status.in_(['completed', 'error']),
            Job.updated_at < cleanup_time_threshold
        ).delete(synchronize_session=False)
        
        db.commit()
    finally:
        db.close()

celery_app.conf.beat_schedule = {
    'cleanup-jobs-every-15-minutes': {
        'task': 'celery_worker.cleanup_jobs',
        'schedule': crontab(minute='*/15'),
    },
}

# Import tasks to ensure they are registered
  # This needs to be after celery_app is created but before the worker starts