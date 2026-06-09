from __future__ import annotations

import asyncio
from urllib.parse import urljoin

import httpx

from app.core.config import get_settings
from app.core.network_safety import validate_public_http_url
from app.services.azure_image_service import analyze_image_bytes as analyze_azure_image_bytes
from app.services.azure_image_service import analyze_image_url as analyze_azure_image_url
from app.services.google_vision_service import analyze_google_image_bytes, analyze_google_image_url
from app.services.huggingface_image_service import analyze_huggingface_image_bytes
from app.services.huggingface_image_service import huggingface_available

settings = get_settings()

PROVIDER_PRECEDENCE = [
    'huggingface_inference',
    'azure_computer_vision',
    'google_cloud_vision',
]


def _merge_tags(provider_results: list[dict], key_name: str, score_name: str) -> list[dict]:
    merged: dict[str, dict] = {}
    for result in provider_results:
        for item in result.get(key_name) or []:
            name = str(item.get('name') or '').strip()
            if not name:
                continue
            score = float(item.get(score_name) or 0.0)
            existing = merged.get(name.lower())
            if existing is None or score > float(existing.get(score_name) or 0.0):
                merged[name.lower()] = {'name': name, score_name: score}
    return sorted(merged.values(), key=lambda item: item[score_name], reverse=True)


def _merge_objects(provider_results: list[dict]) -> list[dict]:
    merged: list[dict] = []
    seen: set[tuple] = set()
    for result in provider_results:
        for item in result.get('objects') or []:
            box = item.get('box') or {}
            marker = (
                str(item.get('name') or '').strip().lower(),
                int(box.get('x') or 0),
                int(box.get('y') or 0),
                int(box.get('w') or 0),
                int(box.get('h') or 0),
            )
            if not marker[0] or marker in seen:
                continue
            seen.add(marker)
            merged.append(item)
    return sorted(merged, key=lambda item: float(item.get('confidence') or 0.0), reverse=True)


def _aggregate(provider_results: list[dict]) -> dict:
    completed = [item for item in provider_results if item.get('status') == 'completed']
    no_match = [item for item in provider_results if item.get('status') == 'no_match']
    failed = [item for item in provider_results if item.get('status') == 'failed']
    unavailable = [item for item in provider_results if item.get('status') == 'unavailable']

    provider_lookup = {item['provider']: item for item in provider_results}
    preferred = next((provider_lookup[name] for name in PROVIDER_PRECEDENCE if provider_lookup.get(name, {}).get('status') == 'completed'), None)
    primary = preferred or (completed[0] if completed else provider_results[0])

    if completed:
        status = 'completed'
        summary = primary.get('summary') or f"Image analysis completed from {', '.join(item['provider'] for item in completed)}."
    elif no_match:
        status = 'no_match'
        summary = 'Configured image-analysis providers ran, but no usable evidence was returned.'
    elif failed:
        status = 'failed'
        summary = 'Configured image-analysis providers failed to return a usable result.'
    else:
        status = 'unavailable'
        summary = 'No backend image-analysis provider is configured for this runtime.'

    caption = next((item.get('caption') for item in completed if item.get('caption')), None)
    confidence = next((item.get('confidence') for item in completed if item.get('caption') and item.get('confidence') is not None), None)
    provider_url = next((item.get('provider_url') for item in completed if item.get('provider_url')), None)
    width = next((item.get('width') for item in completed if item.get('width')), None)
    height = next((item.get('height') for item in completed if item.get('height')), None)
    image_format = next((item.get('format') for item in completed if item.get('format')), None)

    required_settings: list[str] = []
    for item in unavailable:
        for setting in item.get('required_settings') or []:
            if setting not in required_settings:
                required_settings.append(setting)

    adult_values = [item.get('adult_score') for item in completed if item.get('adult_score') is not None]
    racy_values = [item.get('racy_score') for item in completed if item.get('racy_score') is not None]

    return {
        'provider': 'multi_provider',
        'status': status,
        'summary': summary,
        'required_settings': required_settings,
        'caption': caption,
        'confidence': confidence,
        'tags': _merge_tags(completed, 'tags', 'confidence')[:12],
        'categories': _merge_tags(completed, 'categories', 'score')[:10],
        'objects': _merge_objects(completed)[:12],
        'adult_score': max(adult_values) if adult_values else None,
        'racy_score': max(racy_values) if racy_values else None,
        'provider_url': provider_url,
        'width': width,
        'height': height,
        'format': image_format,
        'provider_results': provider_results,
        'attempted_providers': [item['provider'] for item in provider_results],
        'completed_providers': [item['provider'] for item in completed],
    }


async def _download_image_bytes(image_url: str) -> tuple[bytes, str]:
    current = await validate_public_http_url(image_url)
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
        for _ in range(4):
            async with client.stream('GET', current) as response:
                if response.is_redirect:
                    location = response.headers.get('location')
                    if not location:
                        raise ValueError('Image URL returned an invalid redirect.')
                    current = await validate_public_http_url(urljoin(current, location))
                    continue
                response.raise_for_status()
                content_type = str(response.headers.get('content-type') or '').split(';', 1)[0].strip().lower()
                if not content_type.startswith('image/'):
                    raise ValueError('The remote URL did not return an image.')
                content_length = int(response.headers.get('content-length') or 0)
                if content_length > settings.MAX_REMOTE_IMAGE_BYTES:
                    raise ValueError('The remote image exceeds the download size limit.')
                payload = bytearray()
                async for chunk in response.aiter_bytes():
                    payload.extend(chunk)
                    if len(payload) > settings.MAX_REMOTE_IMAGE_BYTES:
                        raise ValueError('The remote image exceeds the download size limit.')
                return bytes(payload), content_type
    raise ValueError('The image URL redirected too many times.')


async def analyze_image_url(image_url: str) -> dict:
    candidate = await validate_public_http_url(image_url)

    downloaded_bytes: bytes | None = None
    downloaded_content_type = 'application/octet-stream'
    hf_result: dict

    if not huggingface_available():
        hf_result = await analyze_huggingface_image_bytes(b'', downloaded_content_type)
    else:
        try:
            downloaded_bytes, downloaded_content_type = await _download_image_bytes(candidate)
        except (httpx.HTTPError, ValueError) as exc:
            hf_result = {
                'provider': 'huggingface_inference',
                'status': 'failed',
                'summary': f'Hugging Face preparation failed while downloading the image: {exc}',
                'required_settings': [],
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
        else:
            hf_result = await analyze_huggingface_image_bytes(downloaded_bytes, downloaded_content_type)

    provider_results = list(await asyncio.gather(
        analyze_google_image_url(candidate),
        analyze_azure_image_url(candidate),
    ))
    provider_results.append(hf_result)

    return _aggregate(provider_results)


async def analyze_image_bytes(data: bytes, content_type: str) -> dict:
    if not data:
        raise ValueError('Upload an image file.')

    provider_results = list(await asyncio.gather(
        analyze_google_image_bytes(data),
        analyze_azure_image_bytes(data, content_type),
        analyze_huggingface_image_bytes(data, content_type),
    ))
    return _aggregate(provider_results)
