#!/usr/bin/env python3
"""Validate and install provider keys into a server .env file.

Secrets are accepted through hidden prompts, explicit args, or environment
variables. The script never prints key values.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def request_json(url: str, headers: dict[str, str]) -> tuple[int, object]:
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode(errors='replace')


def validate_brave(key: str) -> None:
    query = urllib.parse.urlencode({'q': 'Vindica privacy', 'count': 1, 'search_lang': 'en'})
    status, _ = request_json(
        f'https://api.search.brave.com/res/v1/web/search?{query}',
        {
            'Accept': 'application/json',
            'User-Agent': 'Vindica/1.0',
            'X-Subscription-Token': key,
        },
    )
    if status != 200:
        raise RuntimeError(f'Brave Search rejected the key with HTTP {status}.')


def validate_hibp(key: str) -> None:
    if len(key) != 32 or any(char not in '0123456789abcdefABCDEF' for char in key):
        raise RuntimeError('HIBP keys must be 32 hexadecimal characters.')
    status, _ = request_json(
        'https://haveibeenpwned.com/api/v3/subscription/status',
        {'hibp-api-key': key, 'user-agent': 'Vindica/1.0'},
    )
    if status != 200:
        raise RuntimeError(f'HIBP rejected the key with HTTP {status}.')


def validate_ipinfo(key: str) -> None:
    status, _ = request_json(
        'https://api.ipinfo.io/lite/8.8.8.8',
        {'Accept': 'application/json', 'Authorization': f'Bearer {key}'},
    )
    if status != 200:
        raise RuntimeError(f'IPinfo rejected the key with HTTP {status}.')


def validate_huggingface(key: str) -> None:
    status, _ = request_json(
        'https://huggingface.co/api/whoami-v2',
        {'Accept': 'application/json', 'Authorization': f'Bearer {key}'},
    )
    if status != 200:
        raise RuntimeError(f'Hugging Face rejected the token with HTTP {status}.')


def update_env(path: Path, values: dict[str, str]) -> None:
    lines = path.read_text().splitlines() if path.exists() else []
    seen: set[str] = set()
    output: list[str] = []
    for line in lines:
        key = line.split('=', 1)[0] if '=' in line and not line.lstrip().startswith('#') else ''
        if key in values:
            output.append(f'{key}={values[key]}')
            seen.add(key)
        else:
            output.append(line)
    for key, value in values.items():
        if key not in seen:
            output.append(f'{key}={value}')
    path.write_text('\n'.join(output).rstrip() + '\n')
    path.chmod(0o600)


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def get_secret(name: str, prompt: str, arg_value: str | None) -> str:
    if arg_value:
        return arg_value.strip()
    env_value = os.environ.get(name, '').strip()
    if env_value:
        return env_value
    return getpass.getpass(prompt).strip()


def restart_with_readiness_loop(env_path: Path) -> None:
    script = Path('scripts/restart-backend-until-ready.sh')
    if script.exists():
        subprocess.run(
            ['bash', str(script)],
            check=True,
            env={**os.environ, 'ENV_FILE': str(env_path), 'RUN_DOCTOR': '1'},
        )
    else:
        subprocess.run(
            [
                'docker',
                'compose',
                '--env-file',
                str(env_path),
                'up',
                '-d',
                '--force-recreate',
                'backend',
                'worker-scans',
                'worker-honey',
                'beat',
            ],
            check=True,
        )
        print('Restarted backend stack.')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', default='.env')
    parser.add_argument('--backend-env-file', default='backend/.env')
    parser.add_argument(
        '--from-env-file',
        action='store_true',
        help='Reuse provider keys that already exist in --env-file instead of prompting for them.',
    )
    parser.add_argument('--restart', action='store_true')
    parser.add_argument('--copy-backend-env', action='store_true', default=True)
    parser.add_argument('--no-copy-backend-env', action='store_false', dest='copy_backend_env')
    parser.add_argument('--brave-key')
    parser.add_argument('--hibp-key')
    parser.add_argument('--ipinfo-token')
    parser.add_argument('--hf-token')
    parser.add_argument('--virustotal-key')
    parser.add_argument('--shodan-key')
    parser.add_argument(
        '--skip-network-validation',
        action='store_true',
        help='Install provided keys without calling provider validation endpoints.',
    )
    args = parser.parse_args()

    env_path = Path(args.env_file).resolve()
    existing = read_env_file(env_path) if args.from_env_file else {}

    brave = existing.get('BRAVE_SEARCH_API_KEY', '').strip() or get_secret('BRAVE_SEARCH_API_KEY', 'Brave Search API key (blank to keep current): ', args.brave_key)
    hibp = existing.get('HIBP_API_KEY', '').strip() or get_secret('HIBP_API_KEY', 'HIBP API key (blank to keep current): ', args.hibp_key)
    ipinfo = existing.get('IPINFO_TOKEN', '').strip() or get_secret('IPINFO_TOKEN', 'IPinfo token (blank to keep current): ', args.ipinfo_token)
    hf = existing.get('HF_TOKEN', '').strip() or get_secret('HF_TOKEN', 'Hugging Face token (blank to keep current): ', args.hf_token)
    virustotal = existing.get('VIRUSTOTAL_API_KEY', '').strip() or get_secret('VIRUSTOTAL_API_KEY', 'VirusTotal API key (blank to keep current): ', args.virustotal_key)
    shodan = existing.get('SHODAN_API_KEY', '').strip() or get_secret('SHODAN_API_KEY', 'Shodan API key (blank to keep current): ', args.shodan_key)
    if not any([brave, hibp, ipinfo, hf, virustotal, shodan]):
        print('Enter at least one provider key.', file=sys.stderr)
        return 2

    values: dict[str, str] = {}
    if brave:
        if not args.skip_network_validation:
            validate_brave(brave)
            print('Brave Search key validated.')
        values['BRAVE_SEARCH_API_KEY'] = brave
    if hibp:
        if not args.skip_network_validation:
            validate_hibp(hibp)
            print('HIBP key validated.')
        values['HIBP_API_KEY'] = hibp
    if ipinfo:
        if not args.skip_network_validation:
            validate_ipinfo(ipinfo)
            print('IPinfo token validated.')
        values['IPINFO_TOKEN'] = ipinfo
    if hf:
        if not args.skip_network_validation:
            validate_huggingface(hf)
            print('Hugging Face token validated.')
        values['HF_TOKEN'] = hf
    if virustotal:
        values['VIRUSTOTAL_API_KEY'] = virustotal
    if shodan:
        values['SHODAN_API_KEY'] = shodan

    update_env(env_path, values)
    print(f'Installed validated keys into {env_path}.')

    if args.copy_backend_env:
        backend_env_path = Path(args.backend_env_file).resolve()
        backend_env_path.parent.mkdir(parents=True, exist_ok=True)
        update_env(backend_env_path, values)
        print(f'Installed validated keys into {backend_env_path}.')

    if args.restart:
        restart_with_readiness_loop(env_path)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
