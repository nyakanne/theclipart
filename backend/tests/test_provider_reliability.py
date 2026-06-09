import pytest

from app.services import breach_checker, search_evidence_service


@pytest.mark.asyncio
async def test_brave_access_failure_is_not_reported_as_no_match(monkeypatch):
    monkeypatch.setattr(search_evidence_service.settings, 'BRAVE_SEARCH_API_KEY', 'configured')
    monkeypatch.setattr(search_evidence_service.settings, 'BRAVE_API_KEY', '')
    monkeypatch.setattr(
        search_evidence_service,
        '_search_plans',
        lambda query: [
            search_evidence_service.SearchPlan(
                query='"person@example.com"',
                source_category='public_web',
                result_count=5,
            )
        ],
    )

    async def fail_search(_plan):
        raise search_evidence_service.BraveSearchError('Brave Search authentication failed.')

    monkeypatch.setattr(search_evidence_service, '_brave_search', fail_search)

    bundle = await search_evidence_service.build_search_evidence({'email': 'person@example.com'})

    assert bundle.items == []
    assert bundle.statuses[0]['status'] == 'failed'
    assert 'authentication failed' in bundle.statuses[0]['message']


@pytest.mark.asyncio
async def test_brave_partial_results_are_retained_and_marked_limited(monkeypatch):
    monkeypatch.setattr(search_evidence_service.settings, 'BRAVE_SEARCH_API_KEY', 'configured')
    monkeypatch.setattr(search_evidence_service.settings, 'BRAVE_API_KEY', '')
    plans = [
        search_evidence_service.SearchPlan(
            query='"person@example.com"',
            source_category='public_web',
            result_count=5,
        ),
        search_evidence_service.SearchPlan(
            query='site:example.com "person@example.com"',
            source_category='broker_search',
            result_count=3,
        ),
    ]
    monkeypatch.setattr(search_evidence_service, '_search_plans', lambda query: plans)

    async def partial_search(plan):
        if plan.source_category == 'broker_search':
            raise search_evidence_service.BraveSearchError('Brave Search quota was reached.')
        return [{
            'url': 'https://example.org/profile',
            'title': 'Public profile',
            'description': 'Indexed public profile.',
        }]

    monkeypatch.setattr(search_evidence_service, '_brave_search', partial_search)

    bundle = await search_evidence_service.build_search_evidence({'email': 'person@example.com'})

    assert len(bundle.items) == 1
    assert bundle.statuses[0]['status'] == 'completed'
    assert bundle.statuses[0]['fallback_available'] is True
    assert '1 additional search request(s) failed' in bundle.statuses[0]['message']


@pytest.mark.asyncio
async def test_hibp_access_failure_is_not_reported_as_no_match(monkeypatch):
    monkeypatch.setattr(breach_checker.settings, 'HIBP_API_KEY', '0' * 32)

    async def fail_hibp(_email):
        raise breach_checker.HIBPAccessError('HIBP authentication failed.')

    async def no_results(_value):
        return []

    monkeypatch.setattr(breach_checker, 'check_hibp', fail_hibp)
    monkeypatch.setattr(breach_checker, 'check_paste_sites', fail_hibp)
    monkeypatch.setattr(breach_checker, 'bloom_filter_check', no_results)

    bundle = await breach_checker.run_breach_checks({'email': 'person@example.com'})

    assert bundle.items == []
    assert bundle.hibp_status == 'failed'
    assert bundle.hibp_message == 'HIBP authentication failed.'


@pytest.mark.asyncio
async def test_hibp_no_match_is_definitive_when_requests_succeed(monkeypatch):
    monkeypatch.setattr(breach_checker.settings, 'HIBP_API_KEY', '0' * 32)

    async def no_results(_value):
        return []

    monkeypatch.setattr(breach_checker, 'check_hibp', no_results)
    monkeypatch.setattr(breach_checker, 'check_paste_sites', no_results)
    monkeypatch.setattr(breach_checker, 'bloom_filter_check', no_results)

    bundle = await breach_checker.run_breach_checks({'email': 'person@example.com'})

    assert bundle.hibp_status == 'no_match'
    assert bundle.hibp_message == 'No breach or paste records were returned.'
