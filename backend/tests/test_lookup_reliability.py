from app.api.v1.lookups import _rdap_urls_from_bootstrap


def test_rdap_bootstrap_builds_authoritative_domain_url():
    payload = {
        'services': [
            [['com', 'net'], ['https://rdap.verisign.com/com/v1/']],
            [['org'], ['https://rdap.publicinterestregistry.org/rdap/']],
        ]
    }

    assert _rdap_urls_from_bootstrap(payload, 'example.com') == [
        'https://rdap.verisign.com/com/v1/domain/example.com'
    ]


def test_rdap_bootstrap_ignores_other_tlds_and_duplicate_urls():
    payload = {
        'services': [
            [['org'], ['https://example.test/rdap/']],
            [['com'], ['https://example.test/rdap/', 'https://example.test/rdap']],
        ]
    }

    assert _rdap_urls_from_bootstrap(payload, 'example.com') == [
        'https://example.test/rdap/domain/example.com'
    ]
