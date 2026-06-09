from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlparse


def _is_public_ip(value: str) -> bool:
    address = ipaddress.ip_address(value)
    return address.is_global


async def validate_public_http_url(value: str) -> str:
    candidate = value.strip()
    parsed = urlparse(candidate)
    if parsed.scheme not in {'http', 'https'} or not parsed.hostname:
        raise ValueError('Enter a valid public HTTP or HTTPS URL.')
    if parsed.username or parsed.password:
        raise ValueError('URLs containing credentials are not allowed.')
    if parsed.port and parsed.port not in {80, 443}:
        raise ValueError('Only standard HTTP and HTTPS ports are allowed.')

    try:
        literal = ipaddress.ip_address(parsed.hostname)
    except ValueError:
        try:
            records = await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == 'https' else 80)),
            )
        except socket.gaierror as exc:
            raise ValueError('The image URL hostname could not be resolved.') from exc
        addresses = {record[4][0] for record in records}
        if not addresses or not all(_is_public_ip(address) for address in addresses):
            raise ValueError('Private, local, reserved, and non-public network URLs are not allowed.')
    else:
        if not literal.is_global:
            raise ValueError('Private, local, reserved, and non-public network URLs are not allowed.')
    return candidate
