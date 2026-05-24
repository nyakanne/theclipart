from __future__ import annotations

import base64
from urllib.parse import urlparse

import httpx

from app.core.config import get_settings

settings = get_settings()

_LIKELIHOOD_SCORES = {
    'UNKNOWN': 0.0,
    'VERY_UNLIKELY': 0.05,
    'UNLIKELY': 0.2,
    'POSSIBLE': 0.5,
    'LIKELY': 0.8,
    'VERY_LIKELY': 0.95,
}


def google_vision_available() -> bool:
    return bool(settings.GOOGLE_CLOUD_VISION_API_KEY)


def _missing_settings() -> list[str]:
    if settings.GOOGLE_CLOUD_VISION_API_KEY:
        return []
    return ['GOOGLE_CLOUD_VISION_API_KEY']


def _features() -> list[dict]:
    features: list[dict] = []
    for feature in settings.GOOGLE_CLOUD_VISION_FEATURES.split(','):
        cleaned = feature.strip()
        if cleaned:
            features.append({'type': cleaned, 'maxResults': settings.GOOGLE_CLOUD_VISION_MAX_RESULTS})
    return features or [{'type': 'LABEL_DETECTION', 'maxResults': settings.GOOGLE_CLOUD_VISION_MAX_RESULTS}]


def _base_response(status: str, summary: str, required_settings: list[str] | None = None) -> dict:
    return {
        'provider': 'google_cloud_vision',
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


def _box_from_vertices(vertices: list[dict]) -> dict:
    points = [
        (
            float(vertex.get('x') or vertex.get('X') or 0.0),
            float(vertex.get('y') or vertex.get('Y') or 0.0),
        )
        for vertex in vertices
    ]
    if not points:
        return {'x': 0, 'y': 0, 'w': 0, 'h': 0}
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    min_x = min(xs)
    max_x = max(xs)
    min_y = min(ys)
    max_y = max(ys)

    multiplier = 1000 if max_x <= 1.0 and max_y <= 1.0 else 1
    return {
        'x': int(round(min_x * multiplier)),
        'y': int(round(min_y * multiplier)),
        'w': int(round((max_x - min_x) * multiplier)),
        'h': int(round((max_y - min_y) * multiplier)),
    }


def _normalize_response(payload: dict) -> dict:
    response = (payload.get('responses') or [{}])[0]
    labels = response.get('labelAnnotations') or []
    objects = response.get('localizedObjectAnnotations') or []
    web_detection = response.get('webDetection') or {}
    safe_search = response.get('safeSearchAnnotation') or {}

    tags = [
        {
            'name': str(item.get('description') or '').strip(),
            'confidence': float(item.get('score') or 0.0),
        }
        for item in labels
        if str(item.get('description') or '').strip()
    ]

    categories = [
        {
            'name': str(item.get('description') or '').strip(),
            'score': float(item.get('score') or 0.0),
        }
        for item in web_detection.get('webEntities') or []
        if str(item.get('description') or '').strip()
    ]

    normalized_objects = [
        {
            'name': str(item.get('name') or '').strip() or 'object',
            'confidence': float(item.get('score') or 0.0),
            'box': _box_from_vertices((item.get('boundingPoly') or {}).get('normalizedVertices') or []),
        }
        for item in objects
        if str(item.get('name') or '').strip()
    ]

    top_label = tags[0]['name'] if tags else None
    summary_parts: list[str] = []
    if top_label:
        summary_parts.append(f'Top label: {top_label}.')
    if normalized_objects:
        summary_parts.append(f'{len(normalized_objects)} object matches returned.')
    if categories:
        summary_parts.append(f'{len(categories)} related web entities returned.')

    summary = ' '.join(summary_parts) or 'Google Cloud Vision did not return a usable image analysis result.'
    status = 'completed' if (tags or normalized_objects or categories) else 'no_match'

    provider_url = None
    pages = web_detection.get('pagesWithMatchingImages') or []
    if pages:
        provider_url = str(pages[0].get('url') or '').strip() or None

    return {
        'provider': 'google_cloud_vision',
        'status': status,
        'summary': summary,
        'required_settings': [],
        'caption': None,
        'confidence': None,
        'tags': tags[:12],
        'categories': categories[:8],
        'objects': normalized_objects[:12],
        'adult_score': _LIKELIHOOD_SCORES.get(str(safe_search.get('adult') or 'UNKNOWN').upper(), 0.0),
        'racy_score': _LIKELIHOOD_SCORES.get(str(safe_search.get('racy') or 'UNKNOWN').upper(), 0.0),
        'provider_url': provider_url,
        'width': None,
        'height': None,
        'format': None,
    }


async def _perform_request(image: dict) -> dict:
    if not google_vision_available():
        return _base_response(
            'unavailable',
            'Google Cloud Vision is not configured for this runtime. Add the missing backend setting and restart the API.',
            _missing_settings(),
        )

    request_body = {'requests': [{'image': image, 'features': _features()}]}
    params = {'key': settings.GOOGLE_CLOUD_VISION_API_KEY}

    async with httpx.AsyncClient(timeout=settings.GOOGLE_CLOUD_VISION_TIMEOUT_SECONDS) as client:
        try:
            response = await client.post(settings.GOOGLE_CLOUD_VISION_BASE_URL, params=params, json=request_body)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip() or exc.response.reason_phrase
            return _base_response('failed', f'Google Cloud Vision request failed: {detail}')
        except httpx.HTTPError as exc:
            return _base_response('failed', f'Google Cloud Vision request failed: {exc}')

    return _normalize_response(response.json())


async def analyze_google_image_url(image_url: str) -> dict:
    candidate = image_url.strip()
    parsed = urlparse(candidate)
    if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
        raise ValueError('Enter a valid image URL.')
    return await _perform_request({'source': {'imageUri': candidate}})


async def analyze_google_image_bytes(data: bytes) -> dict:
    if not data:
        raise ValueError('Upload an image file.')
    encoded = base64.b64encode(data).decode('ascii')
    return await _perform_request({'content': encoded})
