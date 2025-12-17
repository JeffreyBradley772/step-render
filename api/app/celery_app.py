import os
from celery import Celery
from kombu import Exchange, Queue


REDIS_QUEUE_URL = os.getenv("REDIS_QUEUE_URL", "redis://localhost:6379/0")
REDIS_DATA_URL = os.getenv("REDIS_DATA_URL", "redis://localhost:6379/0")
celery_app = Celery(
    "step-render",
    broker=REDIS_QUEUE_URL,
    backend=REDIS_DATA_URL,
    include=["app.services.render"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max per task or now, may need to be much longer
    task_soft_time_limit=540,  # 9 minutes soft limit
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
    result_expires=3600,  # Keep results for 1 hour
    task_acks_late=True,  # Acknowledge tasks after completion
    task_reject_on_worker_lost=True,
)

# Define task queues
celery_app.conf.task_queues = (
    Queue('default', Exchange('default'), routing_key='default'),
    Queue('render', Exchange('render'), routing_key='render'),
)

# Route tasks to specific queues
celery_app.conf.task_routes = {
    'app.services.render.process_render_task_sync': {'queue': 'render'},
}


