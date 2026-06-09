#!/usr/bin/env python3
"""Validate and install Brave Search + HIBP keys into a server .env file."""

from __future__ import annotations

import argparse
import getpass
import json
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
    query = urllib.parse.urlencode({'q': 'site:vindica.me', 'count': 1})
    status, _ = request_json(
        f'https://api.search.brave.com/res/v1/web/search?{query}',
        {'Accept': 'application/json', 'X-Subscription-Token': key},
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', default='.env')
    parser.add_argument('--restart', action='store_true')
    args = parser.parse_args()

    brave = getpass.getpass('Brave Search API key (blank to keep current): ').strip()
    hibp = getpass.getpass('HIBP API key (blank to keep current): ').strip()
    if not brave and not hibp:
        print('Enter at least one provider key.', file=sys.stderr)
        return 2

    values: dict[str, str] = {}
    if brave:
        validate_brave(brave)
        print('Brave Search key validated.')
        values['BRAVE_SEARCH_API_KEY'] = brave
    if hibp:
        validate_hibp(hibp)
        print('HIBP key validated.')
        values['HIBP_API_KEY'] = hibp

    env_path = Path(args.env_file).resolve()
    update_env(env_path, values)
    print(f'Installed validated keys into {env_path}.')

    if args.restart:
        subprocess.run(
            ['docker', 'compose', '--env-file', str(env_path), 'up', '-d', '--force-recreate', 'backend', 'worker-scans'],
            check=True,
        )
        print('Restarted backend and scan worker.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
