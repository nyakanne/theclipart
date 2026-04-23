import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import structlog

from app.core.config import get_settings
from app.core.database import engine, Base
from app.api.v1 import scans, webhooks

settings = get_settings()

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt='iso'),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title='DataGuard API',
    version='1.0.0',
    description='Data breach detection, broker scanning, and compliance enforcement platform.',
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

app.include_router(scans.router, prefix='/api/v1')
app.include_router(webhooks.router, prefix='/api/v1')


@app.get('/health')
async def health():
    return {'status': 'ok', 'env': settings.APP_ENV}
