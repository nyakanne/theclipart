# Azure Image Setup

This is the last-mile setup for Vindica's in-app image analysis.

## What Vindica needs

Set these backend env vars:

```env
AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
AZURE_COMPUTER_VISION_KEY=your_real_key_here
```

Keep them in the backend only. Do not expose them in the frontend.

## Where to get them

1. Open the [Azure portal](https://portal.azure.com/).
2. Create or open an Azure AI resource.
   - Microsoft's current multi-service resource kind is `AIServices`.
3. In that resource, open **Keys and Endpoint**.
4. Copy:
   - **Endpoint**
   - **Key 1** or **Key 2**

References:
- [Analyze Image v3.2](https://learn.microsoft.com/en-us/rest/api/computervision/analyze-image/analyze-image?view=rest-computervision-v3.2&tabs=HTTP)
- [Analyze Image In Stream v3.2](https://learn.microsoft.com/en-us/rest/api/computervision/analyze-image-in-stream/analyze-image-in-stream?view=rest-computervision-v3.2)
- [Authenticate requests to Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/authentication)
- [Create an Azure AI Foundry resource](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource?tabs=windows)

## Backend restart

After adding the env vars, restart the backend.

Local example:

```bash
kill 24717
env PYTHONPATH=/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend \
APP_ENV=development \
REQUIRE_AUTH=false \
RUN_SCANS_INLINE=true \
SECRET_KEY=dev-secret-change-me \
PUBLIC_APP_URL=http://127.0.0.1:3000 \
CORS_ORIGINS='["http://127.0.0.1:3000","http://localhost:3000"]' \
DATABASE_URL=sqlite+aiosqlite:////private/tmp/vindica-local.db \
SYNC_DATABASE_URL=sqlite:////private/tmp/vindica-local.db \
BROKER_LIST_PATH=/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/data/brokers.json \
IPINFO_TOKEN=replace_me \
AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/ \
AZURE_COMPUTER_VISION_KEY=replace_me \
/Users/anneshirleynyako/Documents/Codex/2026-04-27/https-github-com-nyakanne-theclipart-git/backend/.venv312/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Quick checks

URL analysis:

```bash
curl -s http://127.0.0.1:3000/api/v1/lookups/image/url \
  -H 'Content-Type: application/json' \
  -d '{"image_url":"https://example.com/image.jpg"}'
```

Upload analysis:

```bash
curl -s http://127.0.0.1:3000/api/v1/lookups/image/upload \
  -F file=@/absolute/path/to/image.jpg
```

## What success looks like

The response should move from:

```json
{
  "provider": "azure_computer_vision",
  "status": "unavailable"
}
```

to a completed result with caption, tags, categories, or objects.
