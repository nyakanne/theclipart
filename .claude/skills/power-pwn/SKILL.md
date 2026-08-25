# power-pwn

Offensive and defensive security toolset for Microsoft 365, Power Platform, and AI services.
Source: https://github.com/mbrg/power-pwn

## When to invoke
Invoke `/power-pwn` when:
- Target scope includes *.microsoft.com, *.powerapps.com, *.powerautomate.com, *.sharepoint.com, *.onmicrosoft.com
- You need to enumerate a Microsoft 365 tenant
- You're hunting for exposed Copilot Studio bots or Power Pages sites
- You need to find hardcoded credentials in Power Automate flows

## Installation

```bash
pip install powerpwn
```

## Core Modules

### powerdump — Tenant Recon
Enumerate apps, flows, connections, connectors, and secrets across a tenant.
```bash
python -m powerpwn powerdump --tenant-id <TENANT_ID> --output-dir ./dump
```

### copilot-hunter — Find Exposed Bots
Discover Copilot Studio / Power Virtual Agents bots accessible without authentication.
```bash
python -m powerpwn copilot-hunter --tenant <domain.com>
```

### power-pages — Dataverse Exposure
Detect Power Pages sites leaking Dataverse table data without authentication.
```bash
python -m powerpwn power-pages --url https://target.powerappsportals.com
```

### llm-hound — AI Middleware Discovery
Find exposed MCP servers and AI middleware using Shodan.
```bash
python -m powerpwn llm-hound --query "org:TargetCorp"
```

### backdoor — Persistent Access (authorized testing only)
Deploy a persistent access mechanism inside Power Platform.
```bash
python -m powerpwn backdoor --tenant-id <TENANT_ID>
```

### copilot-m365 — Data Oversharing
Test M365 Copilot for data retrieval beyond intended permissions.
```bash
python -m powerpwn copilot-m365 --tenant-id <TENANT_ID>
```

## Attack Flow

```
1. Confirm M365 presence → nslookup autodiscover.<domain>
2. Get tenant ID → https://login.microsoftonline.com/<domain>/.well-known/openid-configuration
3. powerdump → enumerate all tenant resources
4. copilot-hunter → find unauthenticated bots
5. power-pages → find exposed Dataverse tables
6. Document findings → report with CVSS score
```

## Common Vulnerabilities Found

| Vuln | Severity | Module |
|------|----------|--------|
| Unauthenticated Power Apps | High | powerdump |
| Copilot bot leaking internal data | High | copilot-hunter |
| Dataverse table exposed via Power Pages | Critical | power-pages |
| Hardcoded credentials in flows | Critical | powerdump |
| Overprivileged OAuth connections | Medium | powerdump |

## Usage in Bounty Agent

The `M365HunterAgent` in `bounty-agent/agents/m365_hunter.py` auto-activates
when M365 assets are detected in scope. It runs all modules above and stores
findings to the shared HuntState for triage and reporting.

## Ethical Constraints
- Only test tenants you are explicitly authorized to test
- Never exfiltrate real data — prove access, then stop
- Rate-limit all requests to 5 req/sec maximum
- Stop immediately on encountering real PII
