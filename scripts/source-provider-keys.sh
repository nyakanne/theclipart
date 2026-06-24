#!/usr/bin/env bash
# Source provider keys from a local env file without printing secret values.
#
# Usage:
#   source scripts/source-provider-keys.sh .env
#   python3 scripts/configure-core-providers.py --from-env-file --restart
#
# This file must be sourced, not executed, if you want the keys to remain
# available in the current shell session.

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "Run this with: source scripts/source-provider-keys.sh [env-file]" >&2
  exit 2
fi

_vindica_provider_env_file="${1:-.env}"

if [[ ! -f "$_vindica_provider_env_file" ]]; then
  echo "Provider env file not found: $_vindica_provider_env_file" >&2
  return 2
fi

_vindica_provider_keys=(
  # Core OSINT providers
  BRAVE_SEARCH_API_KEY
  BRAVE_API_KEY
  HIBP_API_KEY
  IPINFO_TOKEN
  VIRUSTOTAL_API_KEY
  SHODAN_API_KEY

  # Image and visual intelligence providers
  HF_TOKEN
  HUGGINGFACE_API_KEY
  AZURE_COMPUTER_VISION_ENDPOINT
  AZURE_COMPUTER_VISION_KEY
  AZURE_CV_ENDPOINT
  AZURE_CV_KEY
  GOOGLE_CLOUD_VISION_API_KEY

  # Auth and vault scoping
  SUPABASE_URL
  SUPABASE_JWT_SECRET
  SUPABASE_JWKS_URL
  SUPABASE_JWT_AUDIENCE
  VITE_SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY
  VITE_SUPABASE_ANON_KEY

  # Report, opt-out, and storage runtime keys
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  KMS_KEY_ID
  MAILGUN_API_KEY
  SES_FROM_EMAIL
)

set -a
source "$_vindica_provider_env_file"
set +a

_vindica_loaded_count=0
for _vindica_key_name in "${_vindica_provider_keys[@]}"; do
  if [[ -n "${!_vindica_key_name:-}" ]]; then
    _vindica_loaded_count=$((_vindica_loaded_count + 1))
    echo "loaded $_vindica_key_name"
  else
    echo "missing $_vindica_key_name"
  fi
done

echo "Provider key source complete: $_vindica_loaded_count configured."

unset _vindica_provider_env_file
unset _vindica_provider_keys
unset _vindica_loaded_count
unset _vindica_key_name
