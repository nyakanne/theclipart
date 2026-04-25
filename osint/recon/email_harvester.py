#!/usr/bin/env python3
"""
Email Harvester
Sources: Hunter.io API, search engine scraping (Google/Bing dorks), crt.sh, PGP keyservers.
For authorized OSINT engagements and certification prep only.
"""

import argparse
import json
import os
import re
import time
from datetime import datetime
from urllib.parse import urlencode, quote_plus

import requests
from bs4 import BeautifulSoup
from colorama import Fore, Style, init
from dotenv import load_dotenv

load_dotenv()
init(autoreset=True)

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
HUNTER_API = "https://api.hunter.io/v2"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def section(title: str):
    print(f"\n{Fore.YELLOW}{'='*55}\n  {title}\n{'='*55}{Style.RESET_ALL}")


def extract_emails_from_text(text: str) -> set:
    return set(m.lower() for m in EMAIL_REGEX.findall(text))


# ── Hunter.io ─────────────────────────────────────────────────────────────────

def hunter_domain_search(domain: str) -> list:
    section("Hunter.io Domain Search")
    api_key = os.getenv("HUNTER_IO_API_KEY", "")
    if not api_key:
        print(f"  {Fore.YELLOW}HUNTER_IO_API_KEY not set — skipping.{Style.RESET_ALL}")
        return []

    emails = []
    try:
        resp = requests.get(
            f"{HUNTER_API}/domain-search",
            params={"domain": domain, "api_key": api_key, "limit": 100},
            timeout=15,
        )
        data = resp.json()
        if resp.ok and "data" in data:
            meta = data["data"]
            org = meta.get("organization", "—")
            print(f"  Organization : {org}")
            print(f"  Pattern      : {meta.get('pattern', '—')}")
            print(f"  Total found  : {meta.get('total', 0)}")
            print()
            for entry in meta.get("emails", []):
                email = entry.get("value", "")
                confidence = entry.get("confidence", "?")
                first = entry.get("first_name", "")
                last = entry.get("last_name", "")
                sources = len(entry.get("sources", []))
                print(
                    f"  {Fore.GREEN}{email:<45}{Style.RESET_ALL}"
                    f"  conf={confidence}%  name={first} {last}  sources={sources}"
                )
                emails.append(email)
        else:
            print(f"  {Fore.RED}Error: {data.get('errors', data)}{Style.RESET_ALL}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")

    return emails


# ── Search Engine Dorking ─────────────────────────────────────────────────────

def bing_email_dork(domain: str) -> set:
    """Scrape Bing search results using email dork queries."""
    section("Bing Search Dork (passive)")
    emails = set()
    dorks = [
        f'site:{domain} email',
        f'"{domain}" "@{domain}"',
        f'inbody:"@{domain}"',
    ]
    headers = {"User-Agent": USER_AGENT}

    for dork in dorks:
        url = f"https://www.bing.com/search?q={quote_plus(dork)}&count=50"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            found = extract_emails_from_text(resp.text)
            domain_emails = {e for e in found if e.endswith(f"@{domain}")}
            for e in domain_emails:
                print(f"  {Fore.GREEN}[+]{Style.RESET_ALL} {e}")
            emails.update(domain_emails)
            time.sleep(2)  # polite delay
        except Exception as e:
            print(f"  {Fore.RED}Bing dork error: {e}{Style.RESET_ALL}")

    if not emails:
        print("  No emails found via search dorks.")
    return emails


# ── PGP Keyserver ─────────────────────────────────────────────────────────────

def pgp_keyserver_search(domain: str) -> set:
    section("PGP Keyserver Search (keys.openpgp.org)")
    emails = set()
    try:
        resp = requests.get(
            f"https://keys.openpgp.org/search?q={domain}",
            timeout=15,
            headers={"User-Agent": USER_AGENT},
        )
        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup.find_all(string=EMAIL_REGEX):
            found = extract_emails_from_text(str(tag))
            for e in found:
                if e.endswith(f"@{domain}"):
                    print(f"  {Fore.GREEN}[+]{Style.RESET_ALL} {e}")
                    emails.add(e)
    except Exception as e:
        print(f"  {Fore.RED}PGP keyserver error: {e}{Style.RESET_ALL}")

    if not emails:
        print("  No results.")
    return emails


# ── GitHub ─────────────────────────────────────────────────────────────────────

def github_email_search(domain: str) -> set:
    section("GitHub Code Search (public repos)")
    emails = set()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"}
    gh_token = os.getenv("GITHUB_TOKEN", "")
    if gh_token:
        headers["Authorization"] = f"Bearer {gh_token}"

    try:
        resp = requests.get(
            "https://api.github.com/search/code",
            params={"q": f'"{domain}" in:file extension:json extension:yaml extension:txt', "per_page": 30},
            headers=headers,
            timeout=15,
        )
        if resp.ok:
            items = resp.json().get("items", [])
            print(f"  GitHub returned {len(items)} code hits — fetching content...")
            for item in items[:10]:  # limit to avoid rate limits
                raw_url = item.get("html_url", "").replace(
                    "github.com", "raw.githubusercontent.com"
                ).replace("/blob/", "/")
                try:
                    content = requests.get(raw_url, timeout=8).text
                    found = extract_emails_from_text(content)
                    for e in found:
                        if e.endswith(f"@{domain}"):
                            print(f"  {Fore.GREEN}[+]{Style.RESET_ALL} {e}  ({item.get('repository', {}).get('full_name', '')})")
                            emails.add(e)
                    time.sleep(0.5)
                except Exception:
                    pass
        else:
            print(f"  GitHub API: {resp.status_code} — {resp.json().get('message', '')}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")

    if not emails:
        print("  No emails found.")
    return emails


# ── Email Format Guesser ───────────────────────────────────────────────────────

def guess_formats(first: str, last: str, domain: str) -> list:
    """Generate likely email formats for a given name."""
    f, l = first.lower(), last.lower()
    return [
        f"{f}.{l}@{domain}",
        f"{f}{l}@{domain}",
        f"{f[0]}{l}@{domain}",
        f"{f[0]}.{l}@{domain}",
        f"{f}@{domain}",
        f"{l}@{domain}",
        f"{f}_{l}@{domain}",
        f"{l}.{f}@{domain}",
        f"{l}{f[0]}@{domain}",
    ]


def verify_email_smtp(email: str, sender_domain: str = "gmail.com") -> str:
    """
    Attempts SMTP RCPT TO verification (catch-all detection).
    Returns 'valid', 'invalid', 'catch-all', or 'error'.
    NOTE: Many servers block this — treat results as indicative only.
    """
    import smtplib
    import dns.resolver

    domain = email.split("@")[1]
    try:
        mx = dns.resolver.resolve(domain, "MX")
        mx_host = str(sorted(mx, key=lambda r: r.preference)[0].exchange).rstrip(".")
    except Exception:
        return "error"

    try:
        with smtplib.SMTP(timeout=10) as s:
            s.connect(mx_host, 25)
            s.ehlo(sender_domain)
            s.mail(f"verify@{sender_domain}")
            code, _ = s.rcpt(email)
            return "valid" if code == 250 else "invalid"
    except Exception:
        return "error"


def main():
    parser = argparse.ArgumentParser(description="Email Harvester (OSINT)")
    parser.add_argument("-d", "--domain", required=True, help="Target domain")
    parser.add_argument("--guess", nargs=2, metavar=("FIRST", "LAST"),
                        help="Guess email formats for a name (--guess John Smith)")
    parser.add_argument("--verify", metavar="EMAIL", help="SMTP-verify a single email address")
    parser.add_argument("--no-github", action="store_true", help="Skip GitHub search")
    parser.add_argument("-o", "--output", help="Save results to JSON")
    args = parser.parse_args()

    domain = args.domain.lower().strip()
    print(f"\n{Fore.CYAN}  Email Harvester — {domain}{Style.RESET_ALL}  |  {datetime.utcnow().isoformat()}Z\n")

    all_emails: set = set()

    if args.guess:
        first, last = args.guess
        section(f"Email Format Guesses for {first} {last}")
        for fmt in guess_formats(first, last, domain):
            print(f"  {fmt}")
        return

    if args.verify:
        section(f"SMTP Verification: {args.verify}")
        result = verify_email_smtp(args.verify)
        color = Fore.GREEN if result == "valid" else Fore.RED
        print(f"  Result: {color}{result}{Style.RESET_ALL}")
        return

    hunter_emails = hunter_domain_search(domain)
    all_emails.update(hunter_emails)

    bing_emails = bing_email_dork(domain)
    all_emails.update(bing_emails)

    pgp_emails = pgp_keyserver_search(domain)
    all_emails.update(pgp_emails)

    if not args.no_github:
        gh_emails = github_email_search(domain)
        all_emails.update(gh_emails)

    section("Summary")
    print(f"  Total unique emails: {Fore.GREEN}{len(all_emails)}{Style.RESET_ALL}")
    for e in sorted(all_emails):
        print(f"    {e}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump({"domain": domain, "emails": sorted(all_emails)}, f, indent=2)
        print(f"\n{Fore.GREEN}Saved to {args.output}{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
