import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import structlog

from app.core.config import get_settings
from app.core.database import engine, Base
from app.api.v1 import scans, webhooks, auth as auth_router

settings = get_settings()

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
async def lifespan(_: FastAPI):
    # Validate all secrets before accepting traffic — raises RuntimeError on failure
    settings.validate_secrets()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info('DataGuard started (env=%s)', settings.APP_ENV)
    yield


app = FastAPI(
    title='DataGuard API',
    version='1.0.0',
    description='Data breach detection, broker scanning, and compliance enforcement platform.',
    # Hide docs in production
    docs_url=None if settings.is_production else '/api/docs',
    redoc_url=None if settings.is_production else '/api/redoc',
    openapi_url=None if settings.is_production else '/api/openapi.json',
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['Content-Type', 'Authorization', 'X-Request-ID'],
)

# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware('http')
async def security_headers(request: Request, call_next) -> Response:
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    response.headers['X-Content-Type-Options']    = 'nosniff'
    response.headers['X-Frame-Options']           = 'DENY'
    response.headers['X-XSS-Protection']          = '1; mode=block'
    response.headers['Referrer-Policy']            = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy']         = 'geolocation=(), microphone=(), camera=()'
    response.headers['Strict-Transport-Security']  = 'max-age=63072000; includeSubDomains; preload'
    response.headers['Cache-Control']              = 'no-store'
    response.headers['X-Response-Time-Ms']         = f'{duration_ms:.1f}'

    # Never leak server identity
    response.headers.pop('server', None)
    response.headers.pop('x-powered-by', None)

    return response

# ── Request size guard ────────────────────────────────────────────────────────
@app.middleware('http')
async def limit_request_size(request: Request, call_next) -> Response:
    max_bytes = 64 * 1024  # 64 KB — API payloads are tiny
    content_length = request.headers.get('content-length')
    if content_length and int(content_length) > max_bytes:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail': 'Request body too large'}, status_code=413)
    return await call_next(request)

# ── Metrics (internal only — put behind VPC/auth in prod) ────────────────────
Instrumentator().instrument(app).expose(app, endpoint='/metrics', include_in_schema=False)

app.include_router(auth_router.router, prefix='/api/v1')
app.include_router(scans.router, prefix='/api/v1')
app.include_router(webhooks.router, prefix='/api/v1')


@app.get('/health', include_in_schema=False)
async def health():
    return {'status': 'ok', 'env': settings.APP_ENV}
