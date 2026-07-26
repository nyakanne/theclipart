import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from prometheus_fastapi_instrumentator import Instrumentator
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.trustedhost import TrustedHostMiddleware
import structlog

from app.core.config import get_settings
from app.core.http_security import SecurityHeadersMiddleware

settings = get_settings()
settings.validate_runtime_safety()

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt='iso'),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app_: FastAPI):
    if settings.DEMO_MODE:
        log.info('Vindica started (env=%s)', settings.APP_ENV)
        yield
        return
    from app.core.database import engine, Base

    app_.state.database_available = False
    app_.state.startup_error = None
    try:
        async with engine.begin() as conn:
            if settings.is_production:
                await conn.execute(text('SELECT 1'))
            else:
                await conn.run_sync(Base.metadata.create_all)
        app_.state.database_available = True
    except Exception:
        app_.state.startup_error = 'database_unavailable'
        log.exception('Database startup check failed')
        if not settings.is_production:
            raise
    log.info('Vindica started (env=%s)', settings.APP_ENV)
    yield


app = FastAPI(
    title='Vindica API',
    version='1.0.0',
    description='Personal-data exposure detection, broker removal, and compliance reporting platform.',
    docs_url=None if settings.is_production else '/api/docs',
    redoc_url=None,
    openapi_url=None if settings.is_production else '/api/openapi.json',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)

Instrumentator().instrument(app).expose(app, endpoint='/metrics')


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(_: Request, exc: SQLAlchemyError):
    log.error('Database operation failed', exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(
        status_code=503,
        content={
            'detail': 'Vindica data storage is temporarily unavailable. Scans cannot be created or loaded until the database connection is healthy.',
            'code': 'database_unavailable',
        },
    )


@app.exception_handler(RedisError)
async def redis_exception_handler(_: Request, exc: RedisError):
    log.error('Redis operation failed', exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(
        status_code=503,
        content={
            'detail': 'Vindica queue and rate-limit storage is temporarily unavailable. Try again after the worker stack is healthy.',
            'code': 'queue_unavailable',
        },
    )

if settings.DEMO_MODE:
    from app.api.v1 import demo_scans

    app.include_router(demo_scans.router, prefix='/api/v1')
else:
    from app.api.v1 import command_actions, lookups, scans, webhooks

    app.include_router(command_actions.router, prefix='/api/v1')
    app.include_router(lookups.router, prefix='/api/v1')
    app.include_router(scans.router, prefix='/api/v1')
    app.include_router(webhooks.router, prefix='/api/v1')


@app.get('/', include_in_schema=False)
async def root():
    return RedirectResponse(url=settings.PUBLIC_APP_URL)


@app.get('/health')
async def health():
    return {'status': 'ok', 'env': settings.APP_ENV}


@app.get('/ready')
async def readiness():
    database_ok = False
    redis_ok = False
    if not settings.DEMO_MODE:
        try:
            from app.core.database import engine

            async with engine.connect() as conn:
                await conn.execute(text('SELECT 1'))
            database_ok = True
        except Exception:
            log.warning('Readiness database check failed', exc_info=True)

        try:
            redis = Redis.from_url(settings.REDIS_URL, encoding='utf-8', decode_responses=True)
            try:
                redis_ok = bool(await redis.ping())
            finally:
                await redis.aclose()
        except Exception:
            log.warning('Readiness Redis check failed', exc_info=True)
    else:
        database_ok = True
        redis_ok = True

    capabilities = {
        'database': database_ok,
        'redis_queue': redis_ok,
        'serverless_platform': bool(settings.SERVERLESS_PLATFORM),
        'external_queue_backend': settings.QUEUE_BACKEND,
        'object_storage': settings.object_storage_configured,
        'object_storage_backend': settings.OBJECT_STORAGE_BACKEND,
        'durable_object_storage': settings.durable_object_storage_configured,
        'outbound_email': settings.outbound_email_configured,
        'email_provider': settings.EMAIL_PROVIDER,
        'account_vault_auth': bool(settings.SUPABASE_JWT_SECRET or settings.supabase_jwks_url),
        'kms_envelope_encryption': bool(settings.KMS_KEY_ID),
        'hibp_breach_results': bool(settings.HIBP_API_KEY),
        'ip_enrichment': bool(settings.IPINFO_TOKEN),
        'brave_web_evidence': bool(settings.brave_search_key),
        'image_analysis': bool(settings.azure_cv_key or settings.GOOGLE_CLOUD_VISION_API_KEY or settings.huggingface_token),
        'domain_threat_intel': bool(settings.VIRUSTOTAL_API_KEY or settings.SHODAN_API_KEY),
        'real_opt_out_email': bool(settings.ALLOW_REAL_OPT_OUTS and settings.SES_FROM_EMAIL and settings.BROKER_PRIVACY_EMAILS),
    }
    blockers = []
    if not database_ok:
        blockers.append('Database is not reachable with the configured DATABASE_URL.')
    if not redis_ok:
        blockers.append('Redis queue is not reachable with the configured REDIS_URL.')
    if settings.is_production and not capabilities['account_vault_auth']:
        blockers.append('Account vault authentication is not configured.')
    if settings.is_production and not capabilities['kms_envelope_encryption']:
        blockers.append('KMS envelope encryption is not configured.')
    if settings.is_production and settings.PUBLIC_APP_URL.startswith('http://'):
        blockers.append('PUBLIC_APP_URL must use HTTPS in production.')
    if settings.is_production and not capabilities['object_storage']:
        blockers.append('Object storage is not configured for production report/evidence artifacts.')
    if settings.is_production and settings.SERVERLESS_PLATFORM and not capabilities['durable_object_storage']:
        blockers.append('Serverless deployments must use durable object storage, not local report storage.')
    return {
        'status': 'ready' if not blockers else 'blocked',
        'env': settings.APP_ENV,
        'serverless': {
            'platform': settings.SERVERLESS_PLATFORM or None,
            'queue_backend': settings.QUEUE_BACKEND,
            'object_storage_backend': settings.OBJECT_STORAGE_BACKEND,
            'email_provider': settings.EMAIL_PROVIDER,
        },
        'blockers': blockers,
        'capabilities': capabilities,
    }
