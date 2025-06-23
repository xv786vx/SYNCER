import sys
import os
from celery import Celery
from dotenv import load_dotenv

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
    "celery_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks']
)

celery_app.conf.update(
    task_track_started=True,
)

# Optional: Route tasks to a specific queue using their full names
celery_app.conf.task_routes = {
    "tasks.run_sync_sp_to_yt_job": {"queue": "jobs"},
    "tasks.run_sync_yt_to_sp_job": {"queue": "jobs"},
    "tasks.run_merge_playlists_job": {"queue": "jobs"},
}