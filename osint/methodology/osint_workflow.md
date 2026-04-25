# OSINT Reconnaissance Workflow

## Phase 0 — Scope Definition

Before any action, document:
- Target: organisation name, known domains, IP ranges, key personnel
- Authorisation: written scope of work (for engagements) or assignment brief (for CTF/cert)
- Rules of engagement: passive only, semi-passive, or active permitted
- Time window and reporting format

---

## Phase 1 — Passive Reconnaissance

> No packets sent to the target. All queries go to third-party sources.

### 1.1 Domain & DNS
| Action | Tool/Source |
|--------|-------------|
| WHOIS registration data | `python recon/domain_recon.py -d <domain>` |
| RDAP (structured WHOIS) | rdap.org, ARIN, RIPE, APNIC |
| DNS records (A, MX, NS, TXT, SRV) | domain_recon.py |
| SPF / DKIM / DMARC | domain_recon.py |
| Certificate transparency logs | crt.sh, censys.io |
| Historical DNS | SecurityTrails, PassiveDNS, RiskIQ |
| Reverse IP (shared hosting) | viewdns.info, hackertarget.com |

### 1.2 IP & Network
| Action | Tool/Source |
|--------|-------------|
| IP geolocation & ASN | `python recon/ip_intel.py -i <ip>` |
| BGP routes & prefix | bgp.he.net, bgpview.io |
| ARIN/RIPE RDAP | rdap.arin.net |
| Shodan host scan data | shodan.io (passive — no active scan) |
| Censys host data | search.censys.io |
| GreyNoise context | greynoise.io |

### 1.3 Organisation & People
| Action | Tool/Source |
|--------|-------------|
| Company info | LinkedIn, Companies House, OpenCorporates |
| Email discovery | `python recon/email_harvester.py -d <domain>` |
| Username enumeration | `python recon/username_enum.py -u <username>` |
| Social media profiling | LinkedIn, Twitter/X, Facebook, Instagram |
| PGP keys (leaks names/emails) | keys.openpgp.org, keyserver.ubuntu.com |
| Job postings (tech stack intel) | LinkedIn Jobs, Indeed, Glassdoor |

### 1.4 Document & File Intel
| Action | Tool/Source |
|--------|-------------|
| Google dork for files | `site:target.com filetype:pdf` |
| Metadata extraction | `python recon/metadata_extractor.py -f <file>` |
| Wayback Machine | web.archive.org |
| FOIA / public records | data.gov, regulations.gov |

### 1.5 Search Engine Dorking
```
site:target.com                         # all indexed pages
site:target.com filetype:pdf            # PDF documents
site:target.com inurl:admin             # admin panels
site:target.com inurl:login             # login portals
site:target.com intitle:"index of"      # open directories
site:target.com ext:xml | ext:conf      # config files
"@target.com" -site:target.com          # email mentions elsewhere
"target.com" password | credentials     # credential leaks
```

---

## Phase 2 — Semi-Passive Reconnaissance

> Queries may appear in target server logs (CDN, DNS, etc.) but no direct interaction.

### 2.1 Subdomain Enumeration
- DNS brute-force: `domain_recon.py` with wordlist
- Permutation scanning: `dnsgen`, `altdns`
- ASN IP range scan via Shodan/Censys
- BGP peer enumeration

### 2.2 Email Validation
- SMTP RCPT TO verification: `email_harvester.py --verify <email>`
- Hunter.io verification endpoint
- Catch-all detection (send to random@domain)

### 2.3 Technology Fingerprinting
| Action | Tool/Source |
|--------|-------------|
| HTTP headers analysis | `curl -I https://target.com` |
| CMS detection | Wappalyzer, WhatWeb |
| JavaScript library versions | Retire.js |
| SSL/TLS config | ssllabs.com, testssl.sh |
| WAF detection | wafw00f |

---

## Phase 3 — Active Reconnaissance (Authorised Only)

> Direct packets sent to target. Requires explicit written permission.

| Action | Tool |
|--------|------|
| Port scan | `nmap -sV -sC -T4 <ip>` |
| Service version detection | `nmap -sV` |
| OS fingerprinting | `nmap -O` |
| Web directory brute-force | `gobuster`, `feroxbuster`, `ffuf` |
| Virtual host enumeration | `ffuf -H "Host: FUZZ.target.com"` |
| API endpoint discovery | `kiterunner`, Burp Suite |

---

## Phase 4 — Documentation

### Evidence Collection
- Screenshot everything with timestamps
- Save raw tool output to files (`-o output.json`)
- Record source URLs and retrieval dates
- Chain of custody for files/metadata

### Report Structure
1. Executive Summary — risk rating, top findings
2. Scope & Methodology
3. Findings (ordered by severity)
   - Finding title
   - Description
   - Evidence (screenshots, tool output)
   - Impact
   - Recommendations
4. Appendix — raw data, tool commands used

---

## Common Mistakes to Avoid

- Running active tools against targets you don't own
- Forgetting to check email security (SPF/DMARC/DKIM)
- Ignoring metadata in downloaded documents
- Not checking historical data (Wayback Machine, PassiveDNS)
- Overlooking dev/staging subdomains
- Missing third-party services (CDN, email providers, cloud storage)
