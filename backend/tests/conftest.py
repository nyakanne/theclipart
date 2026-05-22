"""
Bootstrap test environment — injects minimal mocks for heavy dependencies
(cryptography, httpx, boto3) so tests can import app modules without a full
Docker stack or installed C-extensions.
"""
import sys
import types
from unittest.mock import MagicMock


def _make_mod(*sub_attrs) -> MagicMock:
    m = MagicMock()
    for attr in sub_attrs:
        setattr(m, attr, MagicMock())
    return m


# --- mock heavy C-extension / unavailable modules before any app import ---
for name in [
    'cryptography', 'cryptography.fernet', 'cryptography.hazmat',
    'cryptography.hazmat.primitives', 'cryptography.hazmat.backends',
    'boto3', 'botocore', 'botocore.exceptions',
    'sqlalchemy', 'sqlalchemy.orm', 'sqlalchemy.ext', 'sqlalchemy.ext.asyncio',
    'asyncpg', 'psycopg2', 'celery', 'redis',
    'reportlab', 'reportlab.lib', 'reportlab.lib.pagesizes',
    'reportlab.lib.styles', 'reportlab.lib.units', 'reportlab.lib.colors',
    'reportlab.platypus', 'reportlab.lib.enums',
    'pybloom_live', 'ddtrace', 'prometheus_fastapi_instrumentator',
    'structlog', 'structlog.processors', 'structlog.stdlib',
    'passlib', 'passlib.context', 'authlib', 'authlib.integrations',
    'authlib.integrations.starlette_client',
]:
    sys.modules.setdefault(name, _make_mod())

# httpx — not installed, provide a usable mock with real exception types
_httpx_mod = MagicMock()
_httpx_mod.ConnectError = type('ConnectError', (Exception,), {})
_httpx_mod.HTTPStatusError = type('HTTPStatusError', (Exception,), {})
_httpx_mod.AsyncClient = MagicMock()
sys.modules['httpx'] = _httpx_mod

# app.core.config — provide a real-looking module with a stub settings object
_settings_stub = MagicMock()
_settings_stub.HIBP_API_KEY = ''
_settings_stub.AWS_REGION = 'us-east-1'
_settings_stub.S3_BUCKET = 'test-bucket'

_config_mod = types.ModuleType('app.core.config')
_config_mod.get_settings = lambda: _settings_stub  # type: ignore[attr-defined]
sys.modules['app.core.config'] = _config_mod

# app.core.security — stub hash_identifier only
_security_mod = types.ModuleType('app.core.security')
_security_mod.hash_identifier = lambda v: v  # type: ignore[attr-defined]
sys.modules['app.core.security'] = _security_mod

# Ensure parent packages exist in sys.modules and have __path__ so Python
# treats them as packages (required for dotted sub-imports to resolve).
import os as _os

def _pkg(name: str, path: str) -> types.ModuleType:
    m = types.ModuleType(name)
    m.__path__ = [path]  # type: ignore[attr-defined]
    m.__package__ = name
    return m

_root = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))  # backend/
sys.modules.setdefault('app', _pkg('app', _os.path.join(_root, 'app')))
sys.modules.setdefault('app.core', _pkg('app.core', _os.path.join(_root, 'app', 'core')))
sys.modules.setdefault('app.services', _pkg('app.services', _os.path.join(_root, 'app', 'services')))

# Now import the module under test so patch() can resolve it
import app.services.breach_checker as _bc  # noqa: E402
sys.modules['app.services.breach_checker'] = _bc
