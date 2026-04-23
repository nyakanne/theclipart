#!/usr/bin/env python3
"""
Generate a cryptographically secure SECRET_KEY and write it into .env.

Usage:
    python scripts/generate_key.py              # prints key + patches .env
    python scripts/generate_key.py --print-only # just prints, doesn't write
"""
import argparse
import os
import re
import secrets
import sys
from pathlib import Path

MIN_LENGTH = 64  # bytes → 86 url-safe base64 chars


def generate() -> str:
    return secrets.token_urlsafe(MIN_LENGTH)


def patch_env_file(env_path: Path, new_key: str) -> None:
    if not env_path.exists():
        env_path.write_text(f'SECRET_KEY={new_key}\n')
        print(f'Created {env_path} with new SECRET_KEY.')
        return

    content = env_path.read_text()
    pattern = re.compile(r'^SECRET_KEY\s*=.*$', re.MULTILINE)

    if pattern.search(content):
        content = pattern.sub(f'SECRET_KEY={new_key}', content)
        print(f'Updated SECRET_KEY in {env_path}.')
    else:
        content += f'\nSECRET_KEY={new_key}\n'
        print(f'Appended SECRET_KEY to {env_path}.')

    env_path.write_text(content)


def main() -> None:
    parser = argparse.ArgumentParser(description='Generate a secure SECRET_KEY')
    parser.add_argument('--print-only', action='store_true', help='Print key only, do not write to .env')
    args = parser.parse_args()

    key = generate()
    print(f'\nGenerated SECRET_KEY ({len(key)} chars):\n\n  {key}\n')

    if args.print_only:
        sys.exit(0)

    env_path = Path(__file__).parent.parent / '.env'
    patch_env_file(env_path, key)
    print('Done. Keep .env out of version control — it is already in .gitignore.\n')


if __name__ == '__main__':
    main()
