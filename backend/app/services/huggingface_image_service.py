from __future__ import annotations

import asyncio

import httpx

from app.core.config import get_settings

settings = get_settings()


def huggingface_available() -> bool:
    return bool(settings.huggingface_token)


def _missing_settings() -> list[str]:
    if settings.huggingface_token:
        return []
    return ['HF_TOKEN']


def _base_response(status: str, summary: str, required_settings: list[str] | None = None) -> dict:
    return {
        'provider': 'huggingface_inference',
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


async def _call_model(client: httpx.AsyncClient, model: str, data: bytes, content_type: str) -> list | dict:
    url = f"{settings.HUGGINGFACE_BASE_URL.rstrip('/')}/{model}"
    headers = {
        'Authorization': f'Bearer {settings.huggingface_token}',
        'Content-Type': content_type,
    }
    response = await client.post(url, headers=headers, content=data)
    if response.status_code == 503:
        await asyncio.sleep(15)
        response = await client.post(url, headers=headers, content=data)
    response.raise_for_status()
    return response.json()


def _extract_caption(payload: list | dict) -> tuple[str | None, float | None]:
    if isinstance(payload, list):
        first = payload[0] if payload else {}
        if isinstance(first, dict):
            text = str(first.get('generated_text') or first.get('text') or '').strip()
            score = first.get('score')
            return text or None, float(score) if isinstance(score, (int, float)) else None
    if isinstance(payload, dict):
        text = str(payload.get('generated_text') or payload.get('text') or '').strip()
        score = payload.get('score')
        return text or None, float(score) if isinstance(score, (int, float)) else None
    return None, None


def _extract_tags(payload: list | dict) -> list[dict]:
    if not isinstance(payload, list):
        return []
    return [
        {
            'name': str(item.get('label') or item.get('name') or '').strip(),
            'confidence': float(item.get('score') or 0.0),
        }
        for item in payload
        if isinstance(item, dict) and str(item.get('label') or item.get('name') or '').strip()
    ][: settings.HUGGINGFACE_MAX_LABELS]


def _extract_objects(payload: list | dict) -> list[dict]:
    if not isinstance(payload, list):
        return []
    results: list[dict] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label') or item.get('name') or '').strip()
        box = item.get('box') or {}
        if not label:
            continue
        xmin = float(box.get('xmin') or 0.0)
        ymin = float(box.get('ymin') or 0.0)
        xmax = float(box.get('xmax') or 0.0)
        ymax = float(box.get('ymax') or 0.0)
        results.append({
            'name': label,
            'confidence': float(item.get('score') or 0.0),
            'box': {
                'x': int(round(xmin)),
                'y': int(round(ymin)),
                'w': int(round(max(0.0, xmax - xmin))),
                'h': int(round(max(0.0, ymax - ymin))),
            },
        })
    return results[:12]


def _extract_nsfw_score(payload: list | dict) -> float | None:
    if not isinstance(payload, list):
        return None
    for item in payload:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label') or '').strip().lower()
        if 'nsfw' in label or 'unsafe' in label or 'porn' in label:
            return float(item.get('score') or 0.0)
    return None


async def analyze_huggingface_image_bytes(data: bytes, content_type: str) -> dict:
    if not huggingface_available():
        return _base_response(
            'unavailable',
            'Hugging Face Inference is not configured for this runtime. Add the missing backend setting and restart the API.',
            _missing_settings(),
        )
    if not data:
        raise ValueError('Upload an image file.')

    async with httpx.AsyncClient(timeout=settings.HUGGINGFACE_TIMEOUT_SECONDS) as client:
        try:
            caption_payload, tags_payload, objects_payload, nsfw_payload = await asyncio.gather(
                _call_model(client, settings.HUGGINGFACE_IMAGE_CAPTION_MODEL, data, content_type),
                _call_model(client, settings.HUGGINGFACE_IMAGE_CLASSIFICATION_MODEL, data, content_type),
                _call_model(client, settings.HUGGINGFACE_OBJECT_DETECTION_MODEL, data, content_type),
                _call_model(client, settings.HUGGINGFACE_NSFW_MODEL, data, content_type),
            )
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip() or exc.response.reason_phrase
            return _base_response('failed', f'Hugging Face Inference request failed: {detail}')
        except httpx.HTTPError as exc:
            return _base_response('failed', f'Hugging Face Inference request failed: {exc}')

    caption, caption_confidence = _extract_caption(caption_payload)
    tags = _extract_tags(tags_payload)
    objects = _extract_objects(objects_payload)
    adult_score = _extract_nsfw_score(nsfw_payload)

    summary = caption or (
        f'Hugging Face returned {len(tags)} tags and {len(objects)} detected objects.'
        if tags or objects else
        'Hugging Face did not return a usable image analysis result.'
    )
    status = 'completed' if (caption or tags or objects or adult_score is not None) else 'no_match'

    return {
        'provider': 'huggingface_inference',
        'status': status,
        'summary': summary,
        'required_settings': [],
        'caption': caption,
        'confidence': caption_confidence,
        'tags': tags,
        'categories': [],
        'objects': objects,
        'adult_score': adult_score,
        'racy_score': adult_score,
        'provider_url': None,
        'width': None,
        'height': None,
        'format': None,
    }
