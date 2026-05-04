# OSINT Certification Prep Cheatsheet

Covers key concepts tested in: GOSI (SANS SEC487), CEH, OSCP (recon phase),
Certified OSINT Practitioner, and similar assessments.

---

## Core OSINT Concepts

### What is OSINT?
Open Source Intelligence — collecting information from **publicly available** sources
without breaching any laws or terms of service.

### OSINT vs Other INT disciplines
| Discipline | Source |
|-----------|--------|
| OSINT | Public/open sources |
| HUMINT | Human sources |
| SIGINT | Signal interception |
| GEOINT | Geospatial imagery |
| CYBINT | Cyber/digital sources |

### Intelligence Cycle
1. **Planning** — define requirements, target, scope
2. **Collection** — gather raw data from sources
3. **Processing** — convert raw data to usable format
4. **Analysis** — interpret, correlate, draw conclusions
5. **Dissemination** — report findings to stakeholders
6. **Feedback** — refine based on new requirements

---

## DNS — Exam Essentials

### Record Types
| Type | Purpose | OSINT Use |
|------|---------|-----------|
| A | IPv4 address | Maps domain → IP |
| AAAA | IPv6 address | IPv6 infrastructure |
| MX | Mail server | Email provider, mail security |
| NS | Name server | DNS provider, zone authority |
| TXT | Free text | SPF, DKIM, verification tokens |
| SOA | Zone authority | Admin email (sometimes real) |
| CNAME | Alias | Service discovery (AWS, GCP, etc.) |
| SRV | Service | VoIP, XMPP, internal services |
| PTR | Reverse DNS | IP → hostname |
| CAA | CA restriction | Allowed certificate authorities |

### Zone Transfer (AXFR)
- Allows copying entire DNS zone from a nameserver
- Misconfigured servers leak all records
- Test: `dig AXFR @ns1.example.com example.com`
- If successful = critical misconfiguration

### DNS Enumeration Commands
```bash
dig A example.com
dig MX example.com
dig NS example.com
dig TXT example.com
dig SOA example.com
dig AXFR @ns1.example.com example.com  # zone transfer
nslookup -type=ANY example.com
host -a example.com
```

---

## Email Security

### SPF (Sender Policy Framework)
- TXT record at root domain listing authorised sending IPs
- `v=spf1 include:_spf.google.com ~all`
- Qualifiers: `+all` (pass) `~all` (softfail) `-all` (fail)
- **Missing SPF** = domain spoofing possible

### DKIM (DomainKeys Identified Mail)
- Cryptographic signature on emails
- Public key at `<selector>._domainkey.<domain>` TXT record
- Verify: `dig TXT default._domainkey.example.com`

### DMARC (Domain-based Message Auth, Reporting, Conformance)
- Policy record at `_dmarc.<domain>`
- `v=DMARC1; p=reject; rua=mailto:dmarc@example.com`
- Policies: `none` (monitor), `quarantine`, `reject`
- **Missing DMARC** = phishing risk, no reporting

---

## Google Dorking (Google Hacking)

### Key Operators
| Operator | Example | Purpose |
|---------|---------|---------|
| `site:` | `site:example.com` | Restrict to domain |
| `filetype:` | `filetype:pdf` | Specific file type |
| `inurl:` | `inurl:admin` | URL contains string |
| `intitle:` | `intitle:"index of"` | Page title match |
| `intext:` | `intext:password` | Body text match |
| `cache:` | `cache:example.com` | Cached version |
| `link:` | `link:example.com` | Pages linking to |
| `ext:` | `ext:log` | File extension |

### Useful Dork Combos
```
site:target.com filetype:pdf OR filetype:docx OR filetype:xlsx
site:target.com inurl:admin OR inurl:login OR inurl:dashboard
site:target.com intitle:"index of" intext:password
site:github.com "target.com" password OR secret OR key
"@target.com" filetype:csv
target.com ext:sql OR ext:bak OR ext:log
```

---

## WHOIS / RDAP

- WHOIS: legacy protocol, varies by registrar
- RDAP: modern JSON API, standardised (RFC 7483)
- Privacy protection (GDPR): many registrants now redacted
- Historical WHOIS: DomainTools, SecurityTrails (paid)
- Key intel: registrant, registrar, dates, nameservers

---

## Shodan

### What Shodan indexes
- Internet-facing services (HTTP, HTTPS, FTP, SSH, RDP, etc.)
- IoT devices, industrial control systems, webcams
- SSL certificate subjects and SANs
- Banner information and service versions

### Key Shodan Search Filters
```
hostname:example.com
org:"Company Name"
net:192.168.0.0/24
port:22
product:nginx
os:"Windows Server 2019"
ssl.cert.subject.cn:example.com
http.title:"Login"
country:US city:"New York"
vuln:CVE-2021-44228  # Log4Shell
```

---

## Certificate Transparency

- All publicly trusted TLS certs must be logged to CT logs (since 2018)
- Reveals subdomains even if not in DNS or robots.txt
- Sources: crt.sh, censys.io, Google CT, Facebook CT
- Wildcard certs: `*.example.com` → still logged
- Historical data: old/expired certs reveal past infrastructure

---

## Metadata Forensics

### Images (EXIF)
- **GPS coordinates** — most critical finding
- Camera make/model
- Software used (reveals OS, editing tool)
- Timestamps (creation, modification)
- Strip with: `exiftool -all= photo.jpg`

### PDF / DOCX
- Author name
- Last modified by (may differ from author)
- Company / organisation name
- Software and version
- Revision history
- Embedded objects

### Tools
- ExifTool: universal metadata reader/writer
- FOCA: Windows tool for mass metadata extraction
- MAT2: metadata anonymisation tool

---

## Social Media OSINT

### Techniques
- Username correlation across platforms (Sherlock, username_enum.py)
- Profile picture reverse image search (Google Images, TinEye, Yandex)
- Location inference from check-ins, backgrounds, time zones
- Network mapping (mutual followers/connections)
- Archived profiles (Wayback Machine, cached search results)

### Reverse Image Search
```
https://images.google.com
https://www.tineye.com
https://yandex.com/images/search
https://pimeyes.com  # face search (paid)
```

---

## Key OSINT Tools Reference

| Tool | Use Case | Type |
|------|----------|------|
| theHarvester | Email/subdomain/people recon | Free |
| Maltego | Link analysis and visualisation | Free/Paid |
| SpiderFoot | Automated OSINT footprinting | Free |
| Shodan | Internet device search | Free/Paid |
| Censys | Internet host search | Free/Paid |
| Amass | Subdomain enumeration | Free |
| Recon-ng | Modular OSINT framework | Free |
| ExifTool | Metadata extraction | Free |
| Sherlock | Username enumeration | Free |
| OSINT Framework | Categorised resource list | Free |

---

## Exam Tips

1. **Passive vs Active** — know the distinction; passive = no direct target contact
2. **Legal boundaries** — CFAA, Computer Misuse Act, GDPR
3. **Chain of custody** — document sources, timestamps, methodology
4. **Pivoting** — one piece of data leads to another (email → username → profile → photo → location)
5. **Negative results matter** — no SPF = finding; no DMARC = finding
6. **Third-party exposure** — cloud storage, CDNs, code repos, pastebin
7. **OPSEC for investigators** — use a dedicated VM, VPN, separate accounts

---

## Practice Labs / Resources

- TryHackMe — OSINT rooms (free tier available)
- HackTheBox — OSINT challenges
- OSINT Framework — osintframework.com
- Bellingcat's Online Investigation Toolkit
- IntelTechniques.com — Michael Bazzell's resources
- SANS SEC487 course material
- TraceLabs OSINT CTF competitions
