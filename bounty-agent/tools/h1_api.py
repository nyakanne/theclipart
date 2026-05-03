#!/usr/bin/env python3
"""
HackerOne GraphQL API client.
Handles program discovery, scope fetching, and report submission.

Requires: H1_USERNAME and H1_API_TOKEN env vars (from hackerone.com → API tokens).
"""

import json
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Optional
import urllib.request
import urllib.error
import base64

H1_API = "https://api.hackerone.com/v1"
H1_GRAPHQL = "https://hackerone.com/graphql"


def _auth_header() -> str:
    username = os.environ.get("H1_USERNAME", "")
    token = os.environ.get("H1_API_TOKEN", "")
    if not username or not token:
        print("ERROR: Set H1_USERNAME and H1_API_TOKEN env vars", file=sys.stderr)
        sys.exit(1)
    creds = base64.b64encode(f"{username}:{token}".encode()).decode()
    return f"Basic {creds}"


def _get(path: str, params: dict = None) -> dict:
    url = f"{H1_API}{path}"
    if params:
        query = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{query}"
    req = urllib.request.Request(url, headers={
        "Authorization": _auth_header(),
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def _post(path: str, body: dict) -> dict:
    url = f"{H1_API}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": _auth_header(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


@dataclass
class Program:
    handle: str
    name: str
    offers_bounties: bool
    min_bounty: float
    max_bounty: float
    response_time_hours: int
    asset_types: list[str]
    in_scope: list[dict]
    url: str

    def score(self) -> float:
        """Higher = better target. Weights: bounty size, fast response, web assets."""
        bounty_score = min(self.max_bounty / 10000, 1.0) * 40
        response_score = max(0, 1 - self.response_time_hours / 168) * 30
        web_assets = sum(1 for a in self.in_scope if a.get("asset_type") in ("URL", "WILDCARD"))
        asset_score = min(web_assets / 10, 1.0) * 30
        return bounty_score + response_score + asset_score


def list_programs(
    offers_bounties: bool = True,
    min_bounty: float = 100,
    max_response_hours: int = 168,
    limit: int = 50,
) -> list[Program]:
    """Fetch and score public HackerOne programs."""
    programs = []
    page = 1

    while len(programs) < limit:
        try:
            data = _get("/hackers/programs", {
                "page[size]": 100,
                "page[number]": page,
                "offers_bounties": str(offers_bounties).lower(),
            })
        except urllib.error.HTTPError as e:
            print(f"H1 API error {e.code}: {e.reason}", file=sys.stderr)
            break

        items = data.get("data", [])
        if not items:
            break

        for item in items:
            attrs = item.get("attributes", {})
            handle = attrs.get("handle", "")

            try:
                scope_data = _get(f"/hackers/programs/{handle}/structured_scopes", {
                    "page[size]": 100,
                })
                in_scope = [
                    {
                        "identifier": s["attributes"].get("asset_identifier", ""),
                        "asset_type": s["attributes"].get("asset_type", ""),
                        "eligible_for_bounty": s["attributes"].get("eligible_for_bounty", False),
                    }
                    for s in scope_data.get("data", [])
                    if s["attributes"].get("eligible_for_bounty")
                ]
            except Exception:
                in_scope = []

            if not in_scope:
                continue

            bounty_table = attrs.get("structured_policy", {}).get("bounty_table", [])
            max_bounty = max((b.get("value", 0) for b in bounty_table), default=0)
            min_bounty_val = min((b.get("value", 0) for b in bounty_table if b.get("value", 0) > 0), default=0)

            if max_bounty < min_bounty:
                continue

            response_time = attrs.get("average_time_to_first_program_response_in_minutes", 99999)
            response_hours = response_time / 60 if response_time else 9999

            if response_hours > max_response_hours:
                continue

            p = Program(
                handle=handle,
                name=attrs.get("name", handle),
                offers_bounties=attrs.get("offers_bounties", False),
                min_bounty=min_bounty_val,
                max_bounty=max_bounty,
                response_time_hours=int(response_hours),
                asset_types=list({s["asset_type"] for s in in_scope}),
                in_scope=in_scope,
                url=f"https://hackerone.com/{handle}",
            )
            programs.append(p)

            time.sleep(0.2)  # be polite to H1 API

        page += 1

    programs.sort(key=lambda p: p.score(), reverse=True)
    return programs[:limit]


def get_scope(handle: str) -> list[dict]:
    """Return in-scope assets for a program."""
    data = _get(f"/hackers/programs/{handle}/structured_scopes", {"page[size]": 100})
    return [
        {
            "identifier": s["attributes"].get("asset_identifier", ""),
            "asset_type": s["attributes"].get("asset_type", ""),
            "max_severity": s["attributes"].get("max_severity", ""),
            "eligible_for_bounty": s["attributes"].get("eligible_for_bounty", False),
            "instruction": s["attributes"].get("instruction", ""),
        }
        for s in data.get("data", [])
        if not s["attributes"].get("out_of_scope", False)
    ]


def submit_report(
    handle: str,
    title: str,
    vulnerability_information: str,
    severity_rating: str,  # none|low|medium|high|critical
    impact: str,
    weakness_id: Optional[int] = None,
    structured_scope_id: Optional[str] = None,
) -> dict:
    """Submit a vulnerability report to a HackerOne program."""
    body = {
        "data": {
            "type": "report",
            "attributes": {
                "team_handle": handle,
                "title": title,
                "vulnerability_information": vulnerability_information,
                "impact": impact,
                "severity_rating": severity_rating,
            }
        }
    }
    if weakness_id:
        body["data"]["relationships"] = {
            "weakness": {"data": {"type": "weakness", "id": str(weakness_id)}}
        }
    if structured_scope_id:
        body["data"]["relationships"] = body["data"].get("relationships", {})
        body["data"]["relationships"]["structured_scope"] = {
            "data": {"type": "structured-scope", "id": structured_scope_id}
        }
    return _post("/reports", body)


def get_report_status(report_id: str) -> dict:
    return _get(f"/reports/{report_id}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="HackerOne API tool")
    sub = parser.add_subparsers(dest="cmd")

    p_list = sub.add_parser("list", help="List top programs by score")
    p_list.add_argument("--limit", type=int, default=10)
    p_list.add_argument("--min-bounty", type=float, default=100)

    p_scope = sub.add_parser("scope", help="Get scope for a program")
    p_scope.add_argument("handle")

    args = parser.parse_args()

    if args.cmd == "list":
        progs = list_programs(limit=args.limit, min_bounty=args.min_bounty)
        for i, p in enumerate(progs, 1):
            print(f"{i:2}. [{p.score():.0f}pts] {p.name} ({p.handle})")
            print(f"     Bounty: ${p.min_bounty:.0f}–${p.max_bounty:.0f}  |  "
                  f"Response: {p.response_time_hours}h  |  Assets: {len(p.in_scope)}")
            print(f"     {p.url}")
    elif args.cmd == "scope":
        scope = get_scope(args.handle)
        print(json.dumps(scope, indent=2))
    else:
        parser.print_help()
