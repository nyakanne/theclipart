from __future__ import annotations

import hmac

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    @staticmethod
    def _secure(response: Response, request: Request) -> Response:
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        if settings.is_production:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            content_length = int(request.headers.get('content-length') or 0)
        except ValueError:
            return self._secure(JSONResponse({'detail': 'Invalid Content-Length header.'}, status_code=400), request)
        if content_length > settings.MAX_REQUEST_BODY_BYTES:
            return self._secure(JSONResponse({'detail': 'Request body exceeds the server limit.'}, status_code=413), request)
        if request.url.path == '/metrics' and settings.is_production:
            expected = f'Bearer {settings.METRICS_TOKEN}' if settings.METRICS_TOKEN else ''
            supplied = request.headers.get('authorization', '')
            if not expected or not hmac.compare_digest(supplied, expected):
                return self._secure(JSONResponse({'detail': 'Not found'}, status_code=404), request)

        response = await call_next(request)
        return self._secure(response, request)
