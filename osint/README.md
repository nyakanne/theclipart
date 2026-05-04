# OSINT Toolkit — Certification Prep

A practical toolkit for OSINT reconnaissance, aligned with common certification frameworks
(GOSI, CEH, OSCP recon phase, Certified OSINT Practitioner).

---

## Directory Structure

```
osint/
├── recon/
│   ├── domain_recon.py        # WHOIS, DNS, subdomains, cert transparency
│   ├── email_harvester.py     # Email discovery from public sources
│   ├── username_enum.py       # Cross-platform username enumeration
│   ├── ip_intel.py            # IP geolocation, ASN, reverse DNS, Shodan
│   └── metadata_extractor.py  # File/image EXIF & document metadata
├── social/
│   └── profile_search.py      # Social media profile aggregation
├── methodology/
│   ├── osint_workflow.md      # Step-by-step recon workflow
│   └── cert_prep.md           # Key topics and exam cheatsheet
├── wordlists/
│   └── subdomains_common.txt  # Common subdomain wordlist
└── requirements.txt
```

---

## Quick Start

```bash
cd osint
pip install -r requirements.txt

# Domain recon
python recon/domain_recon.py -d example.com

# Email harvesting
python recon/email_harvester.py -d example.com

# Username enumeration
python recon/username_enum.py -u targetusername

# IP intelligence
python recon/ip_intel.py -i 8.8.8.8

# Metadata extraction
python recon/metadata_extractor.py -f document.pdf
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in API keys:

```
SHODAN_API_KEY=
HUNTER_IO_API_KEY=
IPINFO_TOKEN=
VIRUSTOTAL_API_KEY=
```

---

## Methodology Summary

1. **Define Scope** — target org, domains, IP ranges, personnel
2. **Passive Recon** — no direct contact with target systems
   - WHOIS / RDAP
   - DNS records (A, MX, NS, TXT, SPF, DKIM)
   - Certificate transparency logs
   - Search engine dorking
   - Social media profiling
   - Breach data correlation
3. **Semi-Passive Recon** — queries that may appear in target logs
   - Shodan / Censys searches
   - Email harvesting
   - Subdomain enumeration via DNS brute-force
4. **Active Recon** (requires explicit authorization)
   - Port scanning
   - Service fingerprinting
5. **Document & Report** — structured findings, evidence, timeline

---

## Legal Notice

These tools are for **authorized** security testing, CTF competitions, and
educational OSINT certification preparation only. Always obtain written
authorization before targeting any system or individual you do not own.
