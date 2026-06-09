# Provider Keys

Vindica now exposes setup links in-browser for missing providers. This file is the repo-side source of truth for what each key unlocks and where to get it.

## Safe server installation

After purchasing or creating both keys, run this from `/var/www/vindica` on
the server. The prompts are hidden, both keys are validated with their
providers, and containers restart only after validation succeeds:

```bash
python3 scripts/configure-core-providers.py --env-file .env --restart
curl -s https://vindica.me/ready
```

Do not paste keys into chat, GitHub, shell history, or frontend environment
files. They belong only in the server-side `.env`.

## Core search and breach providers

### `BRAVE_API_KEY`

Unlocks:
- name evidence
- username evidence
- phone evidence
- email public-web source-page evidence

Get it:
- dashboard: <https://api-dashboard.search.brave.com/login>
- auth guide: <https://api-dashboard.search.brave.com/documentation/guides/authentication>

Backend aliases accepted:
- `BRAVE_API_KEY`
- `BRAVE_SEARCH_API_KEY`

### `HIBP_API_KEY`

Unlocks:
- email breach evidence
- email paste evidence

Get it:
- dashboard sign-in: <https://haveibeenpwned.com/API/Key>
- getting started: <https://support.haveibeenpwned.com/hc/en-au/articles/15542964608655-How-do-I-get-started-after-purchasing-a-subscription>
- API docs: <https://haveibeenpwned.com/API/V3>

## Image providers

### `HF_TOKEN`

Unlocks:
- Hugging Face captioning
- object detection
- NSFW scoring

Get it:
- token page: <https://huggingface.co/settings/tokens>
- token docs: <https://huggingface.co/docs/hub/main/security-tokens>

Backend aliases accepted:
- `HF_TOKEN`
- `HUGGINGFACE_API_KEY`

### `GOOGLE_CLOUD_VISION_API_KEY`

Unlocks:
- Google Cloud Vision labels
- safe-search
- object localization

Get it:
- auth guide: <https://docs.cloud.google.com/vision/product-search/docs/auth>
- setup guide: <https://docs.cloud.google.com/vision/docs/setup>

### `VIRUSTOTAL_API_KEY`

Unlocks:
- domain threat scores
- domain categories
- domain reputation inside the OSINT workspace

Get it:
- API key page: <https://www.virustotal.com/gui/my-apikey>
- API docs: <https://docs.virustotal.com/reference/overview>

### `SHODAN_API_KEY`

Unlocks:
- domain host intelligence
- open ports
- service banners
- CVE hints inside the OSINT workspace

Get it:
- account page: <https://account.shodan.io/>
- API docs: <https://developer.shodan.io/api>

### `AZURE_CV_ENDPOINT`
### `AZURE_CV_KEY`

Unlocks:
- Azure Computer Vision analysis

Get it:
- Azure key guide: <https://learn.microsoft.com/en-us/azure/ai-services/authentication>
- Analyze Image API: <https://learn.microsoft.com/en-us/rest/api/computervision/analyze-image/analyze-image?view=rest-computervision-v3.2&tabs=HTTP>

Backend aliases accepted:
- `AZURE_CV_ENDPOINT`
- `AZURE_CV_KEY`
- `AZURE_COMPUTER_VISION_ENDPOINT`
- `AZURE_COMPUTER_VISION_KEY`

## IP provider

### `IPINFO_TOKEN`

Unlocks:
- backend IP enrichment

Get it:
- setup guide: <https://ipinfo.io/developers/lite-api>
