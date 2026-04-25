#!/usr/bin/env python3
"""
Social Media Profile Aggregator
Given a full name, generates likely usernames and searches common platforms.
Also checks for cached/archived profiles via Wayback Machine.
"""

import argparse
import json
import re
import time
import unicodedata
from datetime import datetime
from urllib.parse import quote_plus

import requests
from colorama import Fore, Style, init

init(autoreset=True)

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

WAYBACK_API = "http://archive.org/wayback/available?url={}"


def section(title: str):
    print(f"\n{Fore.YELLOW}{'='*55}\n  {title}\n{'='*55}{Style.RESET_ALL}")


def normalise(s: str) -> str:
    """Strip accents and lowercase."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def generate_usernames(first: str, last: str) -> list:
    """Generate plausible username variations from a full name."""
    f, l = normalise(first), normalise(last)
    candidates = [
        f"{f}{l}",
        f"{f}.{l}",
        f"{f}_{l}",
        f"{f[0]}{l}",
        f"{f[0]}.{l}",
        f"{f[0]}_{l}",
        f"{f}{l[0]}",
        f"{l}{f}",
        f"{l}.{f}",
        f"{l}_{f}",
        f"{l}{f[0]}",
        f"{f}",
        f"{l}",
        f"{f}{l[:3]}",
        f"{f[:3]}{l}",
        # With common suffixes
        f"{f}{l}1",
        f"{f}{l}2",
        f"{f}{l}123",
        f"{f}.{l}1",
        f"real{f}{l}",
        f"the{f}{l}",
        f"its{f}{l}",
        f"{f}{l}official",
    ]
    # Deduplicate preserving order
    seen = set()
    result = []
    for c in candidates:
        if c not in seen and len(c) >= 3:
            seen.add(c)
            result.append(c)
    return result


def search_wayback(username: str, platform_url: str) -> str | None:
    """Check if Wayback Machine has a snapshot of a profile URL."""
    try:
        resp = requests.get(
            WAYBACK_API.format(platform_url),
            timeout=8,
            headers={"User-Agent": USER_AGENT},
        )
        data = resp.json()
        snap = data.get("archived_snapshots", {}).get("closest", {})
        if snap.get("available"):
            return snap.get("url")
    except Exception:
        pass
    return None


def check_profile(url: str, error_phrases: list = None) -> bool:
    """Return True if the profile page appears to exist."""
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=8,
            allow_redirects=True,
        )
        if resp.status_code != 200:
            return False
        if error_phrases:
            body = resp.text.lower()
            for phrase in error_phrases:
                if phrase.lower() in body:
                    return False
        return True
    except Exception:
        return False


PLATFORM_CHECKS = [
    {
        "name": "LinkedIn",
        "url": "https://www.linkedin.com/in/{username}",
        "type": "name_slug",  # LinkedIn uses name-based slugs
        "error_phrases": ["Page not found"],
    },
    {
        "name": "GitHub",
        "url": "https://github.com/{username}",
        "error_phrases": ["Not Found"],
    },
    {
        "name": "Twitter/X",
        "url": "https://x.com/{username}",
        "error_phrases": ["This account doesn't exist"],
    },
    {
        "name": "Instagram",
        "url": "https://www.instagram.com/{username}/",
        "error_phrases": ["Page Not Found"],
    },
    {
        "name": "Reddit",
        "url": "https://www.reddit.com/user/{username}",
        "error_phrases": ["Sorry, nobody on Reddit goes by that name"],
    },
    {
        "name": "Medium",
        "url": "https://medium.com/@{username}",
        "error_phrases": ["Page not found"],
    },
    {
        "name": "Keybase",
        "url": "https://keybase.io/{username}",
        "error_phrases": ["You found a page that doesn't exist"],
    },
    {
        "name": "HackerOne",
        "url": "https://hackerone.com/{username}",
        "error_phrases": ["404"],
    },
    {
        "name": "TryHackMe",
        "url": "https://tryhackme.com/p/{username}",
        "error_phrases": ["not found"],
    },
]


def linkedin_name_search(first: str, last: str) -> str:
    """Generate a Google dork URL to find a LinkedIn profile by name."""
    query = f'site:linkedin.com/in/ "{first} {last}"'
    return f"https://www.google.com/search?q={quote_plus(query)}"


def reverse_image_search_urls(image_url: str) -> dict:
    """Return reverse image search links for a given image URL."""
    encoded = quote_plus(image_url)
    return {
        "Google Images": f"https://images.google.com/searchbyimage?image_url={encoded}",
        "TinEye": f"https://tineye.com/search?url={encoded}",
        "Yandex": f"https://yandex.com/images/search?url={encoded}&rpt=imageview",
        "Bing Visual": f"https://www.bing.com/images/searchbyimage?imgurl={encoded}",
    }


def main():
    parser = argparse.ArgumentParser(description="Social Media Profile Search (OSINT)")
    parser.add_argument("-n", "--name", nargs=2, metavar=("FIRST", "LAST"),
                        help="Search by full name (e.g. --name John Smith)")
    parser.add_argument("-u", "--username", help="Search for a specific username")
    parser.add_argument("--image", help="Generate reverse image search links for a profile image URL")
    parser.add_argument("-o", "--output", help="Save results to JSON")
    args = parser.parse_args()

    print(f"\n{Fore.CYAN}  Social Profile Search{Style.RESET_ALL}  |  {datetime.utcnow().isoformat()}Z")

    results = {"timestamp": datetime.utcnow().isoformat()}

    if args.image:
        section("Reverse Image Search Links")
        links = reverse_image_search_urls(args.image)
        for engine, url in links.items():
            print(f"  {engine}: {url}")
        results["reverse_image"] = links

    if args.username:
        usernames = [args.username]
    elif args.name:
        first, last = args.name
        section(f"Username Candidates for {first} {last}")
        usernames = generate_usernames(first, last)
        for u in usernames:
            print(f"  {u}")

        section("LinkedIn Name Search (Google Dork)")
        dork_url = linkedin_name_search(first, last)
        print(f"  {dork_url}")
        results["linkedin_dork"] = dork_url
    else:
        parser.print_help()
        return

    section("Platform Profile Checks")
    found_profiles = []

    for username in usernames[:8]:  # Check top 8 candidates to avoid excessive requests
        print(f"\n  {Fore.CYAN}Checking username: {username}{Style.RESET_ALL}")
        for platform in PLATFORM_CHECKS:
            url = platform["url"].format(username=username)
            exists = check_profile(url, platform.get("error_phrases"))
            if exists:
                print(f"  {Fore.GREEN}[+] {platform['name']:<20}{Style.RESET_ALL} {url}")
                # Check Wayback for archived snapshot
                wb = search_wayback(username, url)
                if wb:
                    print(f"      {Fore.YELLOW}Archived: {wb}{Style.RESET_ALL}")
                found_profiles.append({
                    "username": username,
                    "platform": platform["name"],
                    "url": url,
                    "archived": wb,
                })
            time.sleep(0.3)

    section("Summary")
    print(f"  Found {len(found_profiles)} profiles across {len(usernames[:8])} username variants.")
    results["found_profiles"] = found_profiles

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n{Fore.GREEN}Saved to {args.output}{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
