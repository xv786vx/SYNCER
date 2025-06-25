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
    },
    task_default_queue="jobs",
    task_queues={"jobs": {"routing_key": "jobs"}},
)

# Import tasks to ensure they are registered
  # This needs to be after celery_app is created but before the worker starts