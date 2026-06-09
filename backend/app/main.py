import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from prometheus_fastapi_instrumentator import Instrumentator
import structlog

from app.core.config import get_settings

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
async def lifespan(_: FastAPI):
    if settings.DEMO_MODE:
        log.info('Vindica started (env=%s)', settings.APP_ENV)
        yield
        return
    from app.core.database import engine, Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info('Vindica started (env=%s)', settings.APP_ENV)
    yield


app = FastAPI(
    title='Vindica API',
    version='1.0.0',
    description='Personal-data exposure detection, broker removal, and compliance reporting platform.',
    docs_url='/api/docs',
    openapi_url='/api/openapi.json',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

Instrumentator().instrument(app).expose(app, endpoint='/metrics')

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
    capabilities = {
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
    if settings.is_production and not capabilities['account_vault_auth']:
        blockers.append('Account vault authentication is not configured.')
    if settings.is_production and settings.PUBLIC_APP_URL.startswith('http://'):
        blockers.append('PUBLIC_APP_URL must use HTTPS in production.')
    return {
        'status': 'ready' if not blockers else 'blocked',
        'env': settings.APP_ENV,
        'blockers': blockers,
        'capabilities': capabilities,
    }
