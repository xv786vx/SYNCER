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
    "syncer",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['backend.tasks']  # Point to the tasks module
)

celery_app.conf.update(
    task_track_started=True,
)

# Optional: Route tasks to a specific queue
celery_app.conf.task_routes = {
    "backend.tasks.*": {"queue": "jobs"},
}