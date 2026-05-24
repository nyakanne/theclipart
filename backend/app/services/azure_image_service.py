from __future__ import annotations

from urllib.parse import urlparse

import httpx

from app.core.config import get_settings

settings = get_settings()


def azure_image_available() -> bool:
    return bool(settings.azure_cv_endpoint and settings.azure_cv_key)


def _missing_settings() -> list[str]:
    missing = []
    if not settings.azure_cv_endpoint:
        missing.append('AZURE_CV_ENDPOINT')
    if not settings.azure_cv_key:
        missing.append('AZURE_CV_KEY')
    return missing


def _analyze_url() -> str:
    endpoint = settings.azure_cv_endpoint.strip().rstrip('/')
    if endpoint.endswith('/analyze'):
        return endpoint
    if '/vision/' in endpoint and endpoint.endswith('analyze'):
        return endpoint
    if '/vision/' in endpoint:
        return f'{endpoint}/analyze'
    return f'{endpoint}/vision/{settings.AZURE_COMPUTER_VISION_API_VERSION}/analyze'


def _base_response(status: str, summary: str, required_settings: list[str] | None = None) -> dict:
    return {
        'provider': 'azure_computer_vision',
        'status': status,
        'summary': summary,
        'required_settings': required_settings or [],
        'caption': None,
        'confidence': None,
        'tags': [],
        'categories': [],
        'objects': [],
        'adult_score': None,
        'racy_score': None,
        'provider_url': None,
        'width': None,
        'height': None,
        'format': None,
    }


def _normalize_response(data: dict) -> dict:
    description = data.get('description') or {}
    captions = description.get('captions') or []
    best_caption = captions[0] if captions else {}
    tags = [
        {
            'name': str(tag.get('name') or '').strip(),
            'confidence': float(tag.get('confidence') or 0.0),
        }
        for tag in data.get('tags') or []
        if str(tag.get('name') or '').strip()
    ]
    categories = [
        {
            'name': str(category.get('name') or '').strip(),
            'score': float(category.get('score') or 0.0),
        }
        for category in data.get('categories') or []
        if str(category.get('name') or '').strip()
    ]
    objects = []
    for item in data.get('objects') or []:
        rectangle = item.get('rectangle') or {}
        objects.append({
            'name': str(item.get('object') or item.get('name') or '').strip() or 'object',
            'confidence': float(item.get('confidence') or 0.0),
            'box': {
                'x': int(rectangle.get('x') or 0),
                'y': int(rectangle.get('y') or 0),
                'w': int(rectangle.get('w') or 0),
                'h': int(rectangle.get('h') or 0),
            },
        })
    adult = data.get('adult') or {}
    metadata = data.get('metadata') or {}

    caption = str(best_caption.get('text') or '').strip() or None
    confidence = float(best_caption.get('confidence') or 0.0) if best_caption else None
    summary = caption or (
        f'Image analysis completed with {len(tags)} tags and {len(objects)} detected objects.'
        if tags or objects or categories else
        'Azure did not return a usable image analysis result.'
    )
    status = 'completed' if (caption or tags or categories or objects) else 'no_match'

    return {
        'provider': 'azure_computer_vision',
        'status': status,
        'summary': summary,
        'required_settings': [],
        'caption': caption,
        'confidence': confidence if caption else None,
        'tags': tags[:12],
        'categories': categories[:8],
        'objects': objects[:12],
        'adult_score': float(adult.get('adultScore') or 0.0) if adult else None,
        'racy_score': float(adult.get('racyScore') or 0.0) if adult else None,
        'provider_url': None,
        'width': int(metadata.get('width') or 0) or None,
        'height': int(metadata.get('height') or 0) or None,
        'format': str(metadata.get('format') or '').strip() or None,
    }


async def _perform_request(*, body: bytes | dict, content_type: str) -> dict:
    if not azure_image_available():
        return _base_response(
            'unavailable',
            'Azure Computer Vision is not configured for this runtime. Add the missing backend settings and restart the API.',
            _missing_settings(),
        )

    headers = {
        'Ocp-Apim-Subscription-Key': settings.azure_cv_key,
        'Content-Type': content_type,
    }
    params = {
        'visualFeatures': settings.AZURE_COMPUTER_VISION_VISUAL_FEATURES,
    }

    async with httpx.AsyncClient(timeout=settings.AZURE_COMPUTER_VISION_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(_analyze_url(), headers=headers, params=params, json=body if isinstance(body, dict) else None, content=None if isinstance(body, dict) else body)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip() or exc.response.reason_phrase
            return _base_response('failed', f'Azure Computer Vision request failed: {detail}')
        except httpx.HTTPError as exc:
            return _base_response('failed', f'Azure Computer Vision request failed: {exc}')

    return _normalize_response(response.json())


async def analyze_image_url(image_url: str) -> dict:
    candidate = image_url.strip()
    parsed = urlparse(candidate)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        raise ValueError('Enter a valid image URL.')
    return await _perform_request(body={'url': candidate}, content_type='application/json')


async def analyze_image_bytes(data: bytes, content_type: str) -> dict:
    if not data:
        raise ValueError('Upload an image file.')
    return await _perform_request(body=data, content_type=content_type)
