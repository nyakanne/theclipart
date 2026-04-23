from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    'dataguard',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['app.workers.tasks'],
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        'app.workers.tasks.run_scan': {'queue': 'scans'},
        'app.workers.tasks.send_dsar': {'queue': 'dsar'},
        'app.workers.tasks.generate_report': {'queue': 'reports'},
        'app.workers.tasks.check_honey_tokens': {'queue': 'honey'},
    },
    beat_schedule={
        'check-honey-tokens-hourly': {
            'task': 'app.workers.tasks.check_honey_tokens',
            'schedule': 3600.0,
        },
    },
)
