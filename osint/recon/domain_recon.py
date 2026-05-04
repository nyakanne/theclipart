#!/usr/bin/env python3
"""
Domain Reconnaissance Tool
Covers: WHOIS/RDAP, DNS records, subdomain enumeration, certificate transparency logs.
"""

import argparse
import json
import os
import sys
import socket
import ssl
import time
from datetime import datetime

import dns.resolver
import dns.reversename
import requests
import whois
from colorama import Fore, Style, init
from dotenv import load_dotenv
from tabulate import tabulate

load_dotenv()
init(autoreset=True)

RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "SOA", "CNAME", "SRV", "CAA"]
CRTSH_URL = "https://crt.sh/?q={domain}&output=json"
RDAP_URL = "https://rdap.org/domain/{domain}"


def banner():
    print(f"""{Fore.CYAN}
  ██████╗ ██████╗ ███╗   ███╗ █████╗ ██╗███╗   ██╗    ██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗
  ██╔══██╗██╔═══██╗████╗ ████║██╔══██╗██║████╗  ██║    ██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║
  ██║  ██║██║   ██║██╔████╔██║███████║██║██╔██╗ ██║    ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║
  ██║  ██║██║   ██║██║╚██╔╝██║██╔══██║██║██║╚██╗██║    ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║
  ██████╔╝╚██████╔╝██║ ╚═╝ ██║██║  ██║██║██║ ╚████║    ██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║
  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝
{Style.RESET_ALL}  OSINT Domain Recon | Passive & Semi-Passive
""")


def section(title: str):
    print(f"\n{Fore.YELLOW}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{Style.RESET_ALL}")


def whois_lookup(domain: str) -> dict:
    section("WHOIS / RDAP")
    results = {}

    try:
        w = whois.whois(domain)
        fields = {
            "Registrar": w.registrar,
            "Created": w.creation_date,
            "Expires": w.expiration_date,
            "Updated": w.updated_date,
            "Name Servers": w.name_servers,
            "Registrant Org": getattr(w, "org", None),
            "Registrant Country": getattr(w, "country", None),
            "DNSSEC": getattr(w, "dnssec", None),
        }
        rows = []
        for k, v in fields.items():
            if isinstance(v, list):
                v = ", ".join(str(x) for x in v[:5])
            rows.append([k, str(v) if v else "—"])
            results[k] = str(v) if v else None
        print(tabulate(rows, tablefmt="simple"))
    except Exception as e:
        print(f"{Fore.RED}WHOIS error: {e}{Style.RESET_ALL}")

    # RDAP (structured, machine-readable)
    try:
        resp = requests.get(RDAP_URL.format(domain=domain), timeout=10)
        if resp.ok:
            rdap = resp.json()
            rdap_status = rdap.get("status", [])
            if rdap_status:
                print(f"\n  RDAP Status: {', '.join(rdap_status)}")
                results["rdap_status"] = rdap_status
    except Exception:
        pass

    return results


def dns_enum(domain: str) -> dict:
    section("DNS Records")
    results = {}
    resolver = dns.resolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 5

    for rtype in RECORD_TYPES:
        try:
            answers = resolver.resolve(domain, rtype)
            records = [str(r) for r in answers]
            results[rtype] = records
            print(f"\n  {Fore.GREEN}{rtype}{Style.RESET_ALL}")
            for r in records:
                print(f"    {r}")
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            pass
        except Exception as e:
            print(f"  {rtype}: {Fore.RED}{e}{Style.RESET_ALL}")

    # Reverse DNS for A records
    if "A" in results:
        print(f"\n  {Fore.GREEN}Reverse DNS (PTR){Style.RESET_ALL}")
        for ip in results["A"]:
            try:
                ptr = dns.reversename.from_address(ip)
                rev = resolver.resolve(ptr, "PTR")
                print(f"    {ip} → {[str(r) for r in rev]}")
            except Exception:
                print(f"    {ip} → (no PTR)")

    # Zone transfer attempt (AXFR) — informational only
    section("Zone Transfer Attempt (AXFR)")
    if "NS" in results:
        for ns in results["NS"]:
            ns = ns.rstrip(".")
            try:
                z = dns.zone.from_xfr(dns.query.xfr(ns, domain, timeout=5))
                print(f"{Fore.RED}  [!] Zone transfer SUCCEEDED on {ns} — misconfiguration!{Style.RESET_ALL}")
                for name, node in z.nodes.items():
                    print(f"    {name}")
            except Exception:
                print(f"  {ns}: zone transfer refused (expected)")

    return results


def cert_transparency(domain: str) -> list:
    section("Certificate Transparency (crt.sh)")
    subdomains = set()
    try:
        # Search for domain and wildcard
        for query in [domain, f"%.{domain}"]:
            resp = requests.get(
                CRTSH_URL.format(domain=query),
                timeout=15,
                headers={"Accept": "application/json"},
            )
            if resp.ok:
                for entry in resp.json():
                    names = entry.get("name_value", "").split("\n")
                    for name in names:
                        name = name.strip().lower().lstrip("*.")
                        if name.endswith(domain):
                            subdomains.add(name)
    except Exception as e:
        print(f"{Fore.RED}  crt.sh error: {e}{Style.RESET_ALL}")

    if subdomains:
        print(f"  Found {len(subdomains)} unique names/subdomains:")
        for s in sorted(subdomains):
            print(f"    {s}")
    else:
        print("  No results found.")

    return sorted(subdomains)


def subdomain_bruteforce(domain: str, wordlist_path: str | None = None) -> list:
    section("Subdomain Brute-Force (DNS)")
    default_wordlist = os.path.join(os.path.dirname(__file__), "..", "wordlists", "subdomains_common.txt")
    wordlist = wordlist_path or default_wordlist

    if not os.path.exists(wordlist):
        print(f"  {Fore.YELLOW}Wordlist not found: {wordlist}{Style.RESET_ALL}")
        return []

    with open(wordlist) as f:
        words = [line.strip() for line in f if line.strip()]

    found = []
    resolver = dns.resolver.Resolver()
    resolver.timeout = 2
    resolver.lifetime = 2

    print(f"  Testing {len(words)} subdomains...")
    for word in words:
        fqdn = f"{word}.{domain}"
        try:
            answers = resolver.resolve(fqdn, "A")
            ips = [str(r) for r in answers]
            print(f"  {Fore.GREEN}[+] {fqdn}{Style.RESET_ALL} → {', '.join(ips)}")
            found.append({"subdomain": fqdn, "ips": ips})
        except Exception:
            pass

    if not found:
        print("  No subdomains resolved.")
    return found


def tls_info(domain: str) -> dict:
    section("TLS/SSL Certificate Info")
    results = {}
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(5)
            s.connect((domain, 443))
            cert = s.getpeercert()

        subject = dict(x[0] for x in cert.get("subject", []))
        issuer = dict(x[0] for x in cert.get("issuer", []))
        san = [v for _, v in cert.get("subjectAltName", [])]

        rows = [
            ["Subject CN", subject.get("commonName", "—")],
            ["Issuer", issuer.get("organizationName", "—")],
            ["Valid From", cert.get("notBefore", "—")],
            ["Valid Until", cert.get("notAfter", "—")],
            ["SANs", ", ".join(san[:10])],
        ]
        print(tabulate(rows, tablefmt="simple"))
        results = {"subject": subject, "issuer": issuer, "san": san}
    except Exception as e:
        print(f"  {Fore.RED}TLS error: {e}{Style.RESET_ALL}")

    return results


def spf_dkim_dmarc(domain: str):
    section("Email Security (SPF / DKIM / DMARC)")
    resolver = dns.resolver.Resolver()
    resolver.timeout = 5

    # SPF
    try:
        txts = resolver.resolve(domain, "TXT")
        spf = [str(r) for r in txts if "v=spf1" in str(r).lower()]
        if spf:
            print(f"  {Fore.GREEN}SPF:{Style.RESET_ALL} {spf[0]}")
        else:
            print(f"  {Fore.RED}SPF: NOT FOUND — spoofing may be possible{Style.RESET_ALL}")
    except Exception:
        print(f"  {Fore.RED}SPF: lookup failed{Style.RESET_ALL}")

    # DMARC
    try:
        dmarcans = resolver.resolve(f"_dmarc.{domain}", "TXT")
        dmarc = [str(r) for r in dmarcans]
        print(f"  {Fore.GREEN}DMARC:{Style.RESET_ALL} {dmarc[0] if dmarc else 'NOT FOUND'}")
    except Exception:
        print(f"  {Fore.RED}DMARC: NOT FOUND — phishing risk elevated{Style.RESET_ALL}")

    # DKIM (common selectors)
    selectors = ["default", "google", "k1", "mail", "email", "selector1", "selector2", "dkim"]
    print(f"\n  DKIM selector scan:")
    found_dkim = False
    for sel in selectors:
        try:
            ans = resolver.resolve(f"{sel}._domainkey.{domain}", "TXT")
            print(f"  {Fore.GREEN}[+] {sel}._domainkey.{domain}:{Style.RESET_ALL} {str(list(ans)[0])[:80]}...")
            found_dkim = True
        except Exception:
            pass
    if not found_dkim:
        print(f"  {Fore.YELLOW}  No common DKIM selectors found.{Style.RESET_ALL}")


def main():
    banner()
    parser = argparse.ArgumentParser(description="Domain OSINT Recon")
    parser.add_argument("-d", "--domain", required=True, help="Target domain (e.g. example.com)")
    parser.add_argument("-w", "--wordlist", help="Custom subdomain wordlist path")
    parser.add_argument("-o", "--output", help="Save results to JSON file")
    parser.add_argument("--no-brute", action="store_true", help="Skip subdomain brute-force")
    args = parser.parse_args()

    domain = args.domain.lower().strip()
    print(f"  Target: {Fore.CYAN}{domain}{Style.RESET_ALL}  |  {datetime.utcnow().isoformat()}Z\n")

    results = {"domain": domain, "timestamp": datetime.utcnow().isoformat()}

    results["whois"] = whois_lookup(domain)
    results["dns"] = dns_enum(domain)
    results["cert_transparency"] = cert_transparency(domain)
    results["tls"] = tls_info(domain)
    spf_dkim_dmarc(domain)

    if not args.no_brute:
        results["subdomains"] = subdomain_bruteforce(domain, args.wordlist)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n{Fore.GREEN}Results saved to {args.output}{Style.RESET_ALL}")

    section("Recon Complete")
    print(f"  Domain: {domain}")
    dns_records = len(results.get("dns", {}))
    ct_names = len(results.get("cert_transparency", []))
    print(f"  DNS record types found: {dns_records}")
    print(f"  CT log subdomains: {ct_names}")


if __name__ == "__main__":
    main()
