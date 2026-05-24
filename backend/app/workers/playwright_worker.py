"""
Playwright-based data broker scanner.
Runs inside an isolated container. Each broker definition lives in brokers.json.
"""
from __future__ import annotations
import json
import logging
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Callable

from playwright.sync_api import sync_playwright, Browser, Page, TimeoutError as PWTimeout

log = logging.getLogger(__name__)

GOTO_TIMEOUT_MS = 7_000
POST_GOTO_WAIT_MS = 750
RESULT_TIMEOUT_MS = 1_500
INTER_BROKER_DELAY_SECONDS = 0.25
VIEWPORT = {'width': 1280, 'height': 900}
BrokerProgressCallback = Callable[[int, int, dict], None]


def _load_brokers(path: str) -> list[dict]:
    p = Path(path)
    if not p.exists():
        log.warning('Broker list not found at %s, using sample', path)
        return _sample_brokers()
    return json.loads(p.read_text())


def _sample_brokers() -> list[dict]:
    """Minimal sample used when no broker catalogue is available."""
    return [
        {
            'id': 'spokeo',
            'name': 'Spokeo',
            'url': 'https://www.spokeo.com',
            'search_url': 'https://www.spokeo.com/search?q={query}',
            'search_type': 'name',
            'result_selector': '.search-result',
            'fields': ['name', 'address', 'phone', 'relatives'],
            'opt_out_url': 'https://www.spokeo.com/optout',
            'dsar_eligible': True,
            'deadline_days': 30,
        },
        {
            'id': 'whitepages',
            'name': 'WhitePages',
            'url': 'https://www.whitepages.com',
            'search_url': 'https://www.whitepages.com/name/{query}',
            'search_type': 'name',
            'result_selector': '.card--premium',
            'fields': ['name', 'address', 'phone', 'age'],
            'opt_out_url': 'https://www.whitepages.com/suppression_requests/new',
            'dsar_eligible': True,
            'deadline_days': 45,
        },
        {
            'id': 'beenverified',
            'name': 'BeenVerified',
            'url': 'https://www.beenverified.com',
            'search_url': 'https://www.beenverified.com/people/{query}',
            'search_type': 'name',
            'result_selector': '.results-list__item',
            'fields': ['name', 'address', 'phone', 'email', 'relatives', 'criminal'],
            'opt_out_url': 'https://www.beenverified.com/app/optout/search',
            'dsar_eligible': True,
            'deadline_days': 30,
        },
    ]


def _build_query_string(broker: dict, query: dict) -> str:
    search_type = broker.get('search_type', 'name')
    if search_type == 'name':
        return query.get('full_name') or query.get('username') or ''
    if search_type == 'email':
        return query.get('email') or ''
    if search_type == 'phone':
        return query.get('phone') or ''
    return query.get('email') or query.get('full_name') or ''


def _scrape_broker(page: Page, broker: dict, query: dict) -> dict | None:
    q = _build_query_string(broker, query)
    if not q:
        return None

    url = broker['search_url'].format(query=q.replace(' ', '+'))
    try:
        page.goto(url, timeout=GOTO_TIMEOUT_MS, wait_until='domcontentloaded')
        page.wait_for_timeout(POST_GOTO_WAIT_MS)

        selector = broker.get('result_selector', '.result')
        try:
            page.wait_for_selector(selector, timeout=RESULT_TIMEOUT_MS)
            found = True
        except PWTimeout:
            found = False

        if not found:
            return None

        return {
            'broker_name': broker['name'],
            'broker_url': broker['url'],
            'listing_url': page.url,
            'fields_exposed': broker.get('fields', []),
            'opt_out_url': broker.get('opt_out_url'),
            'opt_out_status': 'not_started',
            'opt_out_deadline_days': broker.get('deadline_days'),
            'dsar_eligible': broker.get('dsar_eligible', False),
            'last_seen': datetime.now(timezone.utc).date().isoformat(),
        }
    except Exception as e:
        log.debug('Broker %s scrape error: %s', broker['name'], e)
        return None


def scan_all_brokers(
    query: dict,
    broker_list_path: str,
    on_progress: BrokerProgressCallback | None = None,
) -> list[dict]:
    brokers = _load_brokers(broker_list_path)
    results: list[dict] = []

    with sync_playwright() as p:
        browser: Browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
            ],
        )
        context = browser.new_context(
            viewport=VIEWPORT,
            user_agent=(
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
                '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            ),
            locale='en-US',
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = context.new_page()

        total_brokers = len(brokers)
        for index, broker in enumerate(brokers, start=1):
            try:
                if on_progress:
                    on_progress(index, total_brokers, broker)
                listing = _scrape_broker(page, broker, query)
                if listing:
                    results.append(listing)
                    log.info('Found listing on %s', broker['name'])
                time.sleep(INTER_BROKER_DELAY_SECONDS)
            except Exception as e:
                log.warning('Broker %s failed: %s', broker.get('name', '?'), e)

        browser.close()

    log.info('Playwright scan complete: %d listings found across %d brokers', len(results), len(brokers))
    return results
