#!/usr/bin/env python3
"""
IP Intelligence Tool
Sources: ipinfo.io, ip-api.com, Shodan, VirusTotal, BGP.he.net, AbuseIPDB.
For authorized OSINT engagements and certification prep only.
"""

import argparse
import ipaddress
import json
import os
import socket
from datetime import datetime

import requests
from colorama import Fore, Style, init
from dotenv import load_dotenv
from tabulate import tabulate

load_dotenv()
init(autoreset=True)

IPINFO_URL = "https://ipinfo.io/{}/json"
IPAPI_URL = "http://ip-api.com/json/{}"
SHODAN_HOST_URL = "https://api.shodan.io/shodan/host/{}"
VT_URL = "https://www.virustotal.com/api/v3/ip_addresses/{}"
ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2/check"
BGP_URL = "https://bgp.he.net/ip/{}"


def section(title: str):
    print(f"\n{Fore.YELLOW}{'='*55}\n  {title}\n{'='*55}{Style.RESET_ALL}")


def resolve_target(target: str) -> str:
    """Resolve hostname to IP if needed."""
    try:
        ipaddress.ip_address(target)
        return target
    except ValueError:
        try:
            ip = socket.gethostbyname(target)
            print(f"  Resolved {target} → {ip}")
            return ip
        except Exception as e:
            print(f"{Fore.RED}Cannot resolve {target}: {e}{Style.RESET_ALL}")
            raise


def ipinfo_lookup(ip: str) -> dict:
    section("IP Info (ipinfo.io)")
    token = os.getenv("IPINFO_TOKEN", "")
    params = {"token": token} if token else {}
    try:
        resp = requests.get(IPINFO_URL.format(ip), params=params, timeout=10)
        data = resp.json()
        if "bogon" in data:
            print(f"  {Fore.YELLOW}Bogon / private IP address{Style.RESET_ALL}")
            return data

        rows = [
            ["IP",         data.get("ip", "—")],
            ["Hostname",   data.get("hostname", "—")],
            ["City",       data.get("city", "—")],
            ["Region",     data.get("region", "—")],
            ["Country",    data.get("country", "—")],
            ["Org / ASN",  data.get("org", "—")],
            ["Timezone",   data.get("timezone", "—")],
            ["Coordinates",data.get("loc", "—")],
            ["Postal",     data.get("postal", "—")],
        ]
        print(tabulate(rows, tablefmt="simple"))
        return data
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")
        return {}


def ip_api_lookup(ip: str) -> dict:
    section("Extended Geo (ip-api.com)")
    try:
        resp = requests.get(
            IPAPI_URL.format(ip),
            params={"fields": "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query"},
            timeout=10,
        )
        data = resp.json()
        if data.get("status") == "fail":
            print(f"  {Fore.RED}{data.get('message')}{Style.RESET_ALL}")
            return data

        rows = [
            ["ISP",      data.get("isp", "—")],
            ["ASN",      data.get("as", "—")],
            ["AS Name",  data.get("asname", "—")],
            ["Reverse",  data.get("reverse", "—")],
            ["Mobile",   data.get("mobile", False)],
            ["Proxy/VPN",data.get("proxy", False)],
            ["Hosting",  data.get("hosting", False)],
        ]
        print(tabulate(rows, tablefmt="simple"))
        if data.get("proxy"):
            print(f"\n  {Fore.RED}[!] Proxy / VPN / Tor exit node detected{Style.RESET_ALL}")
        return data
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")
        return {}


def shodan_lookup(ip: str) -> dict:
    section("Shodan Host Intel")
    api_key = os.getenv("SHODAN_API_KEY", "")
    if not api_key:
        print(f"  {Fore.YELLOW}SHODAN_API_KEY not set — skipping.{Style.RESET_ALL}")
        return {}

    try:
        resp = requests.get(
            SHODAN_HOST_URL.format(ip),
            params={"key": api_key},
            timeout=15,
        )
        if resp.status_code == 404:
            print("  No Shodan data for this IP.")
            return {}
        data = resp.json()

        rows = [
            ["Hostnames",   ", ".join(data.get("hostnames", []) or ["—"])],
            ["Domains",     ", ".join(data.get("domains", []) or ["—"])],
            ["Country",     data.get("country_name", "—")],
            ["ISP",         data.get("isp", "—")],
            ["ASN",         data.get("asn", "—")],
            ["OS",          data.get("os", "—")],
            ["Last Update", data.get("last_update", "—")],
            ["Vuln Count",  len(data.get("vulns", []))],
        ]
        print(tabulate(rows, tablefmt="simple"))

        ports = data.get("ports", [])
        if ports:
            print(f"\n  {Fore.GREEN}Open Ports:{Style.RESET_ALL} {sorted(ports)}")

        vulns = data.get("vulns", [])
        if vulns:
            print(f"\n  {Fore.RED}[!] CVEs detected:{Style.RESET_ALL}")
            for cve in sorted(vulns)[:10]:
                print(f"    {cve}")

        print(f"\n  {Fore.CYAN}Services:{Style.RESET_ALL}")
        for svc in data.get("data", [])[:8]:
            port = svc.get("port")
            transport = svc.get("transport", "tcp")
            product = svc.get("product", "")
            version = svc.get("version", "")
            banner_preview = svc.get("data", "")[:60].replace("\n", " ").strip()
            print(f"    {port}/{transport:<5} {product} {version}  {Fore.YELLOW}{banner_preview}{Style.RESET_ALL}")

        return data
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")
        return {}


def virustotal_ip(ip: str) -> dict:
    section("VirusTotal IP Reputation")
    api_key = os.getenv("VIRUSTOTAL_API_KEY", "")
    if not api_key:
        print(f"  {Fore.YELLOW}VIRUSTOTAL_API_KEY not set — skipping.{Style.RESET_ALL}")
        return {}

    try:
        resp = requests.get(
            VT_URL.format(ip),
            headers={"x-apikey": api_key},
            timeout=15,
        )
        data = resp.json()
        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})

        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        harmless = stats.get("harmless", 0)

        color = Fore.RED if malicious > 0 else Fore.YELLOW if suspicious > 0 else Fore.GREEN
        print(f"  {color}Malicious: {malicious}  Suspicious: {suspicious}  Harmless: {harmless}{Style.RESET_ALL}")
        print(f"  Reputation score: {attrs.get('reputation', 'N/A')}")

        as_owner = attrs.get("as_owner", "—")
        print(f"  AS Owner: {as_owner}")

        if malicious > 2:
            print(f"\n  {Fore.RED}[!] IP flagged as malicious by {malicious} vendors{Style.RESET_ALL}")

        return attrs
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")
        return {}


def reverse_dns_sweep(ip: str):
    """Reverse DNS and adjacent IP sweep (±5)."""
    section("Reverse DNS & Neighborhood Sweep")
    try:
        net = ipaddress.IPv4Address(ip)
        base = int(net)
        for offset in range(-5, 6):
            try:
                target = str(ipaddress.IPv4Address(base + offset))
                hostname = socket.gethostbyaddr(target)[0]
                marker = f"  {Fore.GREEN}<<< TARGET{Style.RESET_ALL}" if offset == 0 else ""
                print(f"  {target:<18} → {hostname}{marker}")
            except socket.herror:
                marker = f"  {Fore.GREEN}<<< TARGET{Style.RESET_ALL}" if offset == 0 else ""
                print(f"  {str(ipaddress.IPv4Address(base + offset)):<18} → (no PTR){marker}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")


def whois_asn(ip: str):
    """Query WHOIS for ASN/netblock info via ARIN."""
    section("ARIN / RDAP Netblock")
    try:
        resp = requests.get(f"https://rdap.arin.net/registry/ip/{ip}", timeout=10)
        data = resp.json()
        name = data.get("name", "—")
        handle = data.get("handle", "—")
        start = data.get("startAddress", "—")
        end = data.get("endAddress", "—")
        print(f"  Handle  : {handle}")
        print(f"  Name    : {name}")
        print(f"  Range   : {start} — {end}")

        for entity in data.get("entities", []):
            vcard = entity.get("vcardArray", [])
            if vcard and len(vcard) > 1:
                for item in vcard[1]:
                    if item[0] in ("fn", "email", "tel"):
                        print(f"  {item[0].upper():<8}: {item[-1]}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")


def main():
    parser = argparse.ArgumentParser(description="IP Intelligence (OSINT)")
    parser.add_argument("-i", "--ip", required=True, help="Target IP or hostname")
    parser.add_argument("--no-sweep", action="store_true", help="Skip reverse DNS neighborhood sweep")
    parser.add_argument("-o", "--output", help="Save results to JSON")
    args = parser.parse_args()

    ip = resolve_target(args.ip.strip())
    print(f"\n{Fore.CYAN}  IP Intelligence — {ip}{Style.RESET_ALL}  |  {datetime.utcnow().isoformat()}Z")

    results = {"ip": ip, "timestamp": datetime.utcnow().isoformat()}
    results["ipinfo"] = ipinfo_lookup(ip)
    results["geo_extended"] = ip_api_lookup(ip)
    results["shodan"] = shodan_lookup(ip)
    results["virustotal"] = virustotal_ip(ip)
    whois_asn(ip)

    if not args.no_sweep:
        reverse_dns_sweep(ip)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n{Fore.GREEN}Saved to {args.output}{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
