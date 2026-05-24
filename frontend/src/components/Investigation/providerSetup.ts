export type ProviderSetup = {
  label: string
  hint: string
  requiredSettings: string[]
  setupHref: string
  setupLabel: string
  docsHref?: string
  docsLabel?: string
}

const providerSetupRegistry: Record<string, ProviderSetup> = {
  brave_search: {
    label: 'Brave Search',
    hint: 'Create a Brave Search API key in the dashboard, then add it to the backend env and restart the API.',
    requiredSettings: ['BRAVE_API_KEY'],
    setupHref: 'https://api-dashboard.search.brave.com/login',
    setupLabel: 'Open Brave dashboard',
    docsHref: 'https://api-dashboard.search.brave.com/documentation/guides/authentication',
    docsLabel: 'Auth guide',
  },
  hibp: {
    label: 'Have I Been Pwned',
    hint: 'Sign into the HIBP dashboard tied to your subscription, retrieve the API key, then add it to the backend env and restart the API.',
    requiredSettings: ['HIBP_API_KEY'],
    setupHref: 'https://haveibeenpwned.com/API/Key',
    setupLabel: 'Open HIBP dashboard',
    docsHref: 'https://support.haveibeenpwned.com/hc/en-au/articles/15542964608655-How-do-I-get-started-after-purchasing-a-subscription',
    docsLabel: 'Setup guide',
  },
  ipinfo: {
    label: 'IPinfo Lite',
    hint: 'Create or copy an IPinfo token, add it to the backend env, then restart the API.',
    requiredSettings: ['IPINFO_TOKEN'],
    setupHref: 'https://ipinfo.io/developers/lite-api',
    setupLabel: 'Open IPinfo guide',
  },
  virustotal: {
    label: 'VirusTotal',
    hint: 'Create or copy a VirusTotal API key, add it to the backend env, then restart the API.',
    requiredSettings: ['VIRUSTOTAL_API_KEY'],
    setupHref: 'https://www.virustotal.com/gui/my-apikey',
    setupLabel: 'Open VirusTotal API key',
    docsHref: 'https://docs.virustotal.com/reference/overview',
    docsLabel: 'API docs',
  },
  shodan: {
    label: 'Shodan',
    hint: 'Copy your Shodan API key from your account page, add it to the backend env, then restart the API.',
    requiredSettings: ['SHODAN_API_KEY'],
    setupHref: 'https://account.shodan.io/',
    setupLabel: 'Open Shodan account',
    docsHref: 'https://developer.shodan.io/api',
    docsLabel: 'API docs',
  },
  google_cloud_vision: {
    label: 'Google Cloud Vision',
    hint: 'Create a Google Cloud Vision API key, place it in the backend env, then restart the API.',
    requiredSettings: ['GOOGLE_CLOUD_VISION_API_KEY'],
    setupHref: 'https://docs.cloud.google.com/vision/product-search/docs/auth',
    setupLabel: 'Open Google setup guide',
    docsHref: 'https://docs.cloud.google.com/vision/docs/setup',
    docsLabel: 'Vision setup',
  },
  azure_computer_vision: {
    label: 'Azure Computer Vision',
    hint: 'Open your Azure AI resource, copy the endpoint and key from Keys and Endpoint, then restart the API.',
    requiredSettings: ['AZURE_CV_ENDPOINT', 'AZURE_CV_KEY'],
    setupHref: 'https://learn.microsoft.com/en-us/azure/ai-services/authentication',
    setupLabel: 'Open Azure key guide',
    docsHref: 'https://learn.microsoft.com/en-us/rest/api/computervision/analyze-image/analyze-image?view=rest-computervision-v3.2&tabs=HTTP',
    docsLabel: 'Analyze API',
  },
  huggingface_inference: {
    label: 'Hugging Face Inference',
    hint: 'Create a Hugging Face access token, add it to the backend env, then restart the API.',
    requiredSettings: ['HF_TOKEN'],
    setupHref: 'https://huggingface.co/settings/tokens',
    setupLabel: 'Create Hugging Face token',
    docsHref: 'https://huggingface.co/docs/hub/main/security-tokens',
    docsLabel: 'Token docs',
  },
}

export function getProviderSetup(provider: string): ProviderSetup | undefined {
  return providerSetupRegistry[provider]
}

export function getProviderLabel(provider: string) {
  return providerSetupRegistry[provider]?.label ?? provider.replace(/_/g, ' ')
}
