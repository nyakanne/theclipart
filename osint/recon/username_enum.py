#!/usr/bin/env python3
"""
Username Enumeration Across Platforms
Checks username existence on 50+ popular sites via HTTP.
For authorized OSINT engagements and certification prep only.
"""

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import requests
from colorama import Fore, Style, init

init(autoreset=True)

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Platform definitions: name → {url_template, check_type, not_found_indicator}
# check_type: "status_200" | "status_404" | "text_absent" | "text_present"
PLATFORMS = {
    # Social Media
    "Twitter/X":       {"url": "https://x.com/{}", "check": "status_200", "error_text": "This account doesn't exist"},
    "Instagram":       {"url": "https://www.instagram.com/{}/", "check": "status_200", "error_text": "Page Not Found"},
    "TikTok":          {"url": "https://www.tiktok.com/@{}", "check": "status_200", "error_text": "Couldn't find this account"},
    "Reddit":          {"url": "https://www.reddit.com/user/{}/about.json", "check": "status_200"},
    "Pinterest":       {"url": "https://www.pinterest.com/{}/", "check": "status_200", "error_text": "not found"},
    "Tumblr":          {"url": "https://{}.tumblr.com/", "check": "status_200", "error_text": "There's nothing here"},
    "Flickr":          {"url": "https://www.flickr.com/people/{}/", "check": "status_200"},
    "Snapchat":        {"url": "https://www.snapchat.com/add/{}", "check": "status_200"},

    # Developer
    "GitHub":          {"url": "https://api.github.com/users/{}", "check": "status_200"},
    "GitLab":          {"url": "https://gitlab.com/{}", "check": "status_200", "error_text": "The page you're looking for"},
    "Bitbucket":       {"url": "https://bitbucket.org/{}/", "check": "status_200"},
    "HackerNews":      {"url": "https://hacker-news.firebaseio.com/v0/user/{}.json", "check": "not_null"},
    "SourceForge":     {"url": "https://sourceforge.net/u/{}/profile/", "check": "status_200"},
    "npm":             {"url": "https://www.npmjs.com/~{}", "check": "status_200"},
    "PyPI":            {"url": "https://pypi.org/user/{}/", "check": "status_200"},
    "Replit":          {"url": "https://replit.com/@{}", "check": "status_200"},
    "Codepen":         {"url": "https://codepen.io/{}", "check": "status_200"},

    # Professional
    "LinkedIn":        {"url": "https://www.linkedin.com/in/{}", "check": "status_200"},
    "AngelList":       {"url": "https://angel.co/u/{}", "check": "status_200"},
    "Keybase":         {"url": "https://keybase.io/{}", "check": "status_200"},

    # Gaming
    "Steam":           {"url": "https://steamcommunity.com/id/{}", "check": "status_200", "error_text": "The specified profile could not be found"},
    "Twitch":          {"url": "https://www.twitch.tv/{}", "check": "status_200", "error_text": "Sorry. Unless you've got a time machine"},
    "Xbox":            {"url": "https://www.xboxgamertag.com/search/{}", "check": "status_200"},
    "PSN":             {"url": "https://my.playstation.com/profile/{}", "check": "status_200"},
    "Roblox":          {"url": "https://www.roblox.com/user.aspx?username={}", "check": "status_200"},

    # Forums & Communities
    "Disqus":          {"url": "https://disqus.com/by/{}/", "check": "status_200"},
    "Gravatar":        {"url": "https://en.gravatar.com/{}", "check": "status_200"},
    "Medium":          {"url": "https://medium.com/@{}", "check": "status_200"},
    "Quora":           {"url": "https://www.quora.com/profile/{}", "check": "status_200"},
    "Patreon":         {"url": "https://www.patreon.com/{}", "check": "status_200"},
    "Substack":        {"url": "https://{}.substack.com", "check": "status_200"},
    "Blogger":         {"url": "https://{}.blogspot.com", "check": "status_200"},
    "Wordpress":       {"url": "https://{}.wordpress.com", "check": "status_200"},
    "Mastodon":        {"url": "https://mastodon.social/@{}", "check": "status_200"},
    "Lemmy":           {"url": "https://lemmy.world/u/{}", "check": "status_200"},

    # Creative
    "DeviantArt":      {"url": "https://www.deviantart.com/{}", "check": "status_200"},
    "Behance":         {"url": "https://www.behance.net/{}", "check": "status_200"},
    "Dribbble":        {"url": "https://dribbble.com/{}", "check": "status_200"},
    "SoundCloud":      {"url": "https://soundcloud.com/{}", "check": "status_200"},
    "Bandcamp":        {"url": "https://{}.bandcamp.com", "check": "status_200"},
    "Mixcloud":        {"url": "https://www.mixcloud.com/{}/", "check": "status_200"},
    "Vimeo":           {"url": "https://vimeo.com/{}", "check": "status_200"},
    "YouTube":         {"url": "https://www.youtube.com/@{}", "check": "status_200"},

    # Q&A / Knowledge
    "StackOverflow":   {"url": "https://stackoverflow.com/users/{}", "check": "status_200"},
    "AskUbuntu":       {"url": "https://askubuntu.com/users/{}", "check": "status_200"},

    # Tech / Security
    "HackerOne":       {"url": "https://hackerone.com/{}", "check": "status_200"},
    "Bugcrowd":        {"url": "https://bugcrowd.com/{}", "check": "status_200"},
    "TryHackMe":       {"url": "https://tryhackme.com/p/{}", "check": "status_200"},
    "HackTheBox":      {"url": "https://app.hackthebox.com/profile/{}", "check": "status_200"},
}


def check_platform(username: str, name: str, cfg: dict, timeout: int = 8) -> dict:
    url = cfg["url"].format(username)
    headers = {"User-Agent": USER_AGENT}
    result = {"platform": name, "url": url, "found": False, "status": None}

    try:
        resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        result["status"] = resp.status_code

        check = cfg.get("check", "status_200")
        error_text = cfg.get("error_text", "")

        if check == "status_200":
            found = resp.status_code == 200
            if found and error_text:
                found = error_text.lower() not in resp.text.lower()
        elif check == "not_null":
            found = resp.status_code == 200 and resp.text.strip() != "null"
        else:
            found = resp.status_code == 200

        result["found"] = found
    except requests.exceptions.ConnectionError:
        result["status"] = "conn_error"
    except requests.exceptions.Timeout:
        result["status"] = "timeout"
    except Exception as e:
        result["status"] = f"error: {e}"

    return result


def enumerate_username(username: str, workers: int = 20, delay: float = 0) -> list:
    results = []
    found_count = 0

    print(f"\n  Checking {len(PLATFORMS)} platforms for '{Fore.CYAN}{username}{Style.RESET_ALL}'...\n")

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(check_platform, username, name, cfg): name
            for name, cfg in PLATFORMS.items()
        }
        for future in as_completed(futures):
            res = future.result()
            results.append(res)
            if res["found"]:
                found_count += 1
                print(f"  {Fore.GREEN}[+] {res['platform']:<20}{Style.RESET_ALL} {res['url']}")
            else:
                status = res["status"]
                if status not in (404, "conn_error", "timeout") and str(status).startswith("2"):
                    pass  # silently skip odd statuses
                # Uncomment below to see misses:
                # print(f"  {Fore.RED}[-] {res['platform']:<20}{Style.RESET_ALL} [{status}]")

            if delay:
                time.sleep(delay)

    print(f"\n  {Fore.YELLOW}Found on {found_count}/{len(PLATFORMS)} platforms.{Style.RESET_ALL}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Username Enumeration (OSINT)")
    parser.add_argument("-u", "--username", required=True, help="Target username")
    parser.add_argument("--workers", type=int, default=20, help="Concurrent threads (default: 20)")
    parser.add_argument("--delay", type=float, default=0, help="Delay between requests in seconds")
    parser.add_argument("-o", "--output", help="Save results to JSON")
    args = parser.parse_args()

    username = args.username.strip()
    print(f"\n{Fore.CYAN}  Username Enumeration — @{username}{Style.RESET_ALL}  |  {datetime.utcnow().isoformat()}Z")

    results = enumerate_username(username, workers=args.workers, delay=args.delay)
    found = [r for r in results if r["found"]]

    if args.output:
        with open(args.output, "w") as f:
            json.dump({"username": username, "found": found, "all": results}, f, indent=2)
        print(f"\n{Fore.GREEN}Results saved to {args.output}{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
