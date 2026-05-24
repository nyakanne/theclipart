# Project Handoff — theclipart / Shannon OSINT Skill Setup

**Date:** 2026-04-27
**Repository:** nyakanne/theclipart
**Active branch:** `claude/setup-osint-skills-Vskrr`
**Session goal:** Find the Shannon AI penetration testing framework, install its Claude Code skill, clone Shannon locally, and commit everything to the project repo for OSINT cert preparation.

---

## 1. Session Summary (Chronological)

### 1.1 User Request
The user shared a TikTok screenshot showing "Shannon" — an AI Penetration Testing Framework (v1.0.0, "DEFENSIVE SECURITY ONLY") — and asked to find its GitHub repository, download it, and install its skills to prepare for an OSINT certification.

### 1.2 Discovery
Web search found the Shannon framework at two repositories:
- **Main repo:** https://github.com/KeygraphHQ/shannon — the full autonomous pentesting engine
- **Skill wrapper:** https://github.com/unicodeveloper/shannon — Claude Code `/shannon` slash command skill

### 1.3 Offline Question
User asked if Shannon could run offline with Claude Code. Answer: **No.** Claude Code is a CLI that still sends all inference to Anthropic's API servers — it does not run a local model. Shannon also requires internet to clone from GitHub on first install. The Docker-bundled tools (Nmap, Subfinder, etc.) run locally, but the AI reasoning always calls out to Anthropic (or Bedrock/Vertex).

### 1.4 What Was Done
1. Fetched SKILL.md verbatim from `unicodeveloper/shannon`
2. Fetched `setup-shannon.sh` verbatim from `unicodeveloper/shannon`
3. Installed skill to `~/.claude/skills/shannon/SKILL.md` (user-level Claude Code skills dir)
4. Added skill to project at `.claude/skills/shannon/SKILL.md`
5. Added setup script to `.claude/skills/shannon/scripts/setup-shannon.sh`
6. Committed (SHA `588bc9b`) and pushed to `origin/claude/setup-osint-skills-Vskrr`
7. Ran `setup-shannon.sh` — Shannon cloned successfully to `/root/shannon`

### 1.5 Current State
| Item | Status |
|------|--------|
| Shannon skill installed (user-level) | `/home/user/.claude/skills/shannon/SKILL.md` |
| Shannon skill in project repo | `.claude/skills/shannon/SKILL.md` |
| Setup script in project repo | `.claude/skills/shannon/scripts/setup-shannon.sh` |
| Shannon binary cloned | `/root/shannon/shannon` |
| Docker | v29.3.1 — installed and working |
| Git | v2.43.0 — installed |
| `ANTHROPIC_API_KEY` | **NOT SET** — required before running a pentest |

---

## 2. Key Decisions & Reasoning

- **Why `unicodeveloper/shannon` for the skill?** It wraps `KeygraphHQ/shannon` as a proper Claude Code SKILL.md with a `/shannon` slash command, authorization gates, and step-by-step orchestration. The main KeygraphHQ repo is the backend engine, not a skill.
- **Skill installed at user-level** (`~/.claude/skills/shannon/`) so it's available in all Claude Code sessions, not just this project.
- **Also committed to project repo** so the setup is reproducible for other contributors.
- **Shannon cloned to `/root/shannon`** (default `$HOME/shannon`) — this is the live engine location.

---

## 3. Environment State

```
Working directory:  /home/user/theclipart
Branch:             claude/setup-osint-skills-Vskrr
Shannon engine:     /root/shannon
Skill (user-level): /home/user/.claude/skills/shannon/SKILL.md
Docker:             v29.3.1
Git:                v2.43.0
ANTHROPIC_API_KEY:  NOT SET
```

### Project file tree (non-git)
```
theclipart/
├── .claude/
│   └── skills/
│       └── shannon/
│           ├── SKILL.md                      ← Claude Code /shannon skill
│           └── scripts/
│               └── setup-shannon.sh          ← one-step Shannon installer
├── backend/                                  ← FastAPI + Celery (DataGuard app)
│   ├── app/
│   │   ├── api/v1/{scans,webhooks}.py
│   │   ├── core/{config,database,security}.py
│   │   ├── models/scan.py
│   │   ├── schemas/scan.py
│   │   ├── services/{breach_checker,compliance,email,honey_token,model_fingerprint,report}.py
│   │   └── workers/{celery_app,playwright_worker,tasks}.py
│   ├── alembic/                              ← DB migrations
│   ├── data/brokers.json
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                                 ← React + Vite + Tailwind (DataGuard UI)
│   └── src/
│       ├── components/{BreachResults,BreachSearch,Dashboard,Layout,ui}/
│       ├── pages/{Dashboard,Home,ScanPage}.tsx
│       ├── hooks/useScan.ts
│       ├── services/api.ts
│       ├── store/scanStore.ts
│       └── types/index.ts
├── infrastructure/aws/{rds,s3,ses}.tf       ← Terraform
├── nginx/nginx.conf
├── docker-compose.yml
└── CNAME
```

### Git log (recent)
```
588bc9b  Add Shannon autonomous AI pentesting skill       ← this session
64daf70  Merge pull request #1 from nyakanne/claude/data-breach-detection-site-5Y4VZ
f1e5987  feat: full-stack DataGuard data-breach detection platform
a651b0e  Update CNAME
ec57c12  Create CNAME
c9fa759  Add files via upload
```

---

## 4. File Contents (Verbatim)

### 4.1 `.claude/skills/shannon/SKILL.md`

```markdown
---
name: shannon
version: "1.0.0"
description: "Autonomous AI pentester for web apps and APIs. Run white-box security assessments with Shannon — analyzes source code, identifies attack vectors, and executes real exploits to prove vulnerabilities. Triggered by 'shannon', 'pentest', 'security audit', 'vuln scan'."
argument-hint: 'shannon http://localhost:3000 myapp, shannon --workspace=audit1 http://staging.example.com myrepo'
allowed-tools: Bash, Read, Write, AskUserQuestion, WebSearch
homepage: https://github.com/KeygraphHQ/shannon
repository: https://github.com/KeygraphHQ/shannon
author: KeygraphHQ
license: AGPL-3.0
user-invocable: true
metadata:
  openclaw:
    emoji: "🔐"
    category: "security"
    requires:
      env:
        - ANTHROPIC_API_KEY
      optionalEnv:
        - CLAUDE_CODE_OAUTH_TOKEN
        - CLAUDE_CODE_USE_BEDROCK
        - CLAUDE_CODE_USE_VERTEX
        - AWS_REGION
        - AWS_ACCESS_KEY_ID
        - AWS_SECRET_ACCESS_KEY
      bins:
        - docker
        - git
    primaryEnv: ANTHROPIC_API_KEY
    files:
      - "scripts/*"
    tags:
      - security
      - pentesting
      - pentest
      - vulnerability
      - exploit
      - owasp
      - xss
      - sqli
      - ssrf
      - authentication
      - authorization
      - white-box
      - appsec
---

# Shannon: Autonomous AI Pentester for Web Apps & APIs

> **Permissions overview:** This skill orchestrates Shannon, a Docker-based pentesting tool that
> actively executes attacks against a target application. It clones/updates the Shannon repo
> locally, runs Docker containers, and reads pentest reports. **Shannon performs real exploits —
> only run against apps you own or have explicit written authorization to test.** Never run against
> production systems.

Shannon analyzes your source code, identifies attack vectors, and executes real exploits to prove
vulnerabilities before they reach production. 96.15% exploit success rate on the XBOW security
benchmark. Covers OWASP Top 10: Injection, XSS, SSRF, Broken Auth, Broken AuthZ, and more.

---

## CRITICAL: Safety Checks (ALWAYS run first)

Before doing ANYTHING, you MUST confirm:

1. **Authorization**: Ask the user — "Do you have explicit authorization to pentest this target?"
   If they say no or are unsure, STOP and explain they need written permission from the system owner.
2. **Environment**: Confirm the target is a local, staging, or sandboxed environment — NEVER production.
3. **Scope**: Clarify what they want tested (full pentest vs specific category).

```
⚠️  Shannon executes REAL ATTACKS with mutative effects.
├─ Only run on systems you OWN or have WRITTEN AUTHORIZATION to test
├─ Never target production environments
├─ Results require human review — LLM output may contain hallucinations
└─ You are responsible for complying with all applicable laws
```

Display this warning BEFORE every pentest run.

---

## Parse User Intent

Extract from the user's input:

1. **TARGET_URL**: The URL to pentest (e.g., `http://localhost:3000`)
2. **REPO_NAME**: The source code folder name (placed in `./repos/` inside Shannon)
3. **SCOPE**: Full pentest (default) or specific categories (injection, xss, ssrf, auth, authz)
4. **WORKSPACE**: Named workspace for resume capability (optional)
5. **CONFIG**: Custom YAML config path (optional)

Common invocation patterns:
- `/shannon http://localhost:3000 myapp` → Full pentest of local app
- `/shannon --workspace=audit1 http://staging.example.com backend-api` → Named workspace
- `/shannon --scope=xss,injection http://localhost:8080 frontend` → Targeted categories
- `/shannon status` → Check running pentests
- `/shannon results` → Show latest report
- `/shannon stop` → Stop running pentest

---

## Step 0: Ensure Shannon is Installed

```bash
SHANNON_HOME="${SHANNON_HOME:-$HOME/shannon}"
if [ -d "$SHANNON_HOME" ] && [ -f "$SHANNON_HOME/shannon" ]; then
  cd "$SHANNON_HOME" && git pull --ff-only 2>/dev/null || true
else
  git clone https://github.com/KeygraphHQ/shannon.git "$SHANNON_HOME"
fi
command -v docker &>/dev/null || { echo "ERROR: Docker required"; exit 1; }
```

---

## Step 1: Prepare Source Code

Shannon needs source code in `$SHANNON_HOME/repos/{REPO_NAME}/`.

```bash
mkdir -p "$SHANNON_HOME/repos"
ln -s "$(realpath "$REPO_PATH")" "$SHANNON_HOME/repos/$REPO_NAME"
# or: cd "$SHANNON_HOME/repos" && git clone "$GITHUB_URL" "$REPO_NAME"
```

---

## Step 2: Configure Authentication (if needed)

```yaml
# $SHANNON_HOME/configs/target-config.yaml
authentication:
  type: form
  login_url: "http://localhost:3000/login"
  credentials:
    username: "admin"
    password: "password123"
  flow: "Navigate to login page, enter username and password, click Sign In"
  success_condition:
    url_contains: "/dashboard"
rules:
  avoid: ["/logout", "/admin/delete"]
  focus: ["/api/", "/auth/"]
pipeline:
  max_concurrent_pipelines: 5
```

---

## Step 3: Verify API Credentials

```bash
[ -n "${ANTHROPIC_API_KEY:-}" ] && echo "✅ ANTHROPIC_API_KEY" || \
[ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] && echo "✅ OAuth token" || \
[ "${CLAUDE_CODE_USE_BEDROCK:-}" = "1" ] && echo "✅ Bedrock" || \
{ echo "❌ No credentials. Set ANTHROPIC_API_KEY."; exit 1; }
```

---

## Step 4: Launch the Pentest

CRITICAL: Confirm with user before launching.

```bash
cd "$SHANNON_HOME" && ./shannon start URL={TARGET_URL} REPO={REPO_NAME}
```

Estimated runtime: 1–1.5 hours | Estimated cost: ~$50 (Claude Sonnet)

---

## Step 5: Monitor Progress

```bash
cd "$SHANNON_HOME" && ./shannon workspaces
cd "$SHANNON_HOME" && ./shannon logs ID={workflow-id}
```

Pipeline phases:
1. Pre-Recon — source analysis + Nmap/Subfinder/WhatWeb
2. Recon — live attack surface mapping
3. Vulnerability Analysis — 5 parallel agents (Injection, XSS, SSRF, Auth, AuthZ)
4. Exploitation — real attacks to validate findings
5. Reporting — executive summary with PoCs

---

## Step 6: Read Results

Reports: `$SHANNON_HOME/audit-logs/{hostname}_{sessionId}/`

```bash
LATEST=$(ls -td audit-logs/*/ 2>/dev/null | head -1)
find "$LATEST" -name "*.md" -type f | head -5
```

---

## Vulnerability Coverage

| Category | Examples |
|----------|----------|
| Injection | SQL, command, SSTI, NoSQL |
| XSS | Reflected, stored, DOM-based |
| SSRF | Internal services, cloud metadata |
| Broken Auth | JWT flaws, MFA bypass, CSRF |
| Broken AuthZ | IDOR, privilege escalation, path traversal |

---

## Integrated Tools (in Docker)

Nmap, Subfinder, WhatWeb, Schemathesis, Chromium (Playwright)

---

## Utility Commands

```bash
cd "$SHANNON_HOME" && ./shannon workspaces          # list workspaces
cd "$SHANNON_HOME" && ./shannon logs ID={id}        # tail logs
cd "$SHANNON_HOME" && ./shannon stop                # stop
cd "$SHANNON_HOME" && ./shannon stop CLEAN=true     # stop + wipe (DESTRUCTIVE)
cd "$SHANNON_HOME" && ./shannon start URL={URL} REPO={REPO} WORKSPACE={name}  # resume
```

## Targeting localhost

Shannon runs in Docker — use `http://host.docker.internal:{PORT}` instead of `localhost`.
On Linux add `--add-host=host.docker.internal:host-gateway` to docker run.
```

---

### 4.2 `.claude/skills/shannon/scripts/setup-shannon.sh`

```bash
#!/usr/bin/env bash
# setup-shannon.sh - Install or update Shannon pentester
# Usage: bash scripts/setup-shannon.sh [SHANNON_HOME]
set -euo pipefail

SHANNON_HOME="${1:-${SHANNON_HOME:-$HOME/shannon}}"

echo "🔐 Shannon Setup"
echo "━━━━━━━━━━━━━━━━"

if ! command -v docker &>/dev/null; then
  echo "❌ Docker is required but not installed."
  echo "   Install: https://docker.com/products/docker-desktop"
  exit 1
fi
echo "✅ Docker: $(docker --version 2>/dev/null | head -1)"

if ! command -v git &>/dev/null; then
  echo "❌ Git is required but not installed."
  exit 1
fi
echo "✅ Git: $(git --version)"

if [ -d "$SHANNON_HOME" ] && [ -f "$SHANNON_HOME/shannon" ]; then
  echo "✅ Shannon found at $SHANNON_HOME"
  echo "   Updating..."
  cd "$SHANNON_HOME" && git pull --ff-only 2>/dev/null || echo "   (already up to date)"
else
  echo "📥 Cloning Shannon to $SHANNON_HOME..."
  git clone https://github.com/KeygraphHQ/shannon.git "$SHANNON_HOME"
  echo "✅ Shannon cloned successfully"
fi

echo ""
echo "API Credentials:"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "✅ ANTHROPIC_API_KEY is set"
elif [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  echo "✅ CLAUDE_CODE_OAUTH_TOKEN is set"
elif [ "${CLAUDE_CODE_USE_BEDROCK:-}" = "1" ]; then
  echo "✅ AWS Bedrock mode enabled"
elif [ "${CLAUDE_CODE_USE_VERTEX:-}" = "1" ]; then
  echo "✅ Google Vertex AI mode enabled"
else
  echo "⚠️  No AI credentials detected. Set one of:"
  echo "   export ANTHROPIC_API_KEY=sk-ant-..."
  echo "   export CLAUDE_CODE_OAUTH_TOKEN=..."
  echo "   export CLAUDE_CODE_USE_BEDROCK=1"
  echo "   export CLAUDE_CODE_USE_VERTEX=1"
fi

echo ""
echo "Recommended: export CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000"
echo ""
echo "Shannon is ready at: $SHANNON_HOME"
echo "Run a pentest:  cd $SHANNON_HOME && ./shannon start URL=http://localhost:3000 REPO=myapp"
```

---

## 5. Pending / Next Steps

1. **Set `ANTHROPIC_API_KEY`** — nothing can run without it.
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   export CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000
   ```

2. **Spin up a practice target** — for OSINT cert prep, OWASP Juice Shop is ideal:
   ```bash
   docker run -d -p 3000:3000 bkimminich/juice-shop
   ```
   Then point Shannon at `http://host.docker.internal:3000`.

3. **Run first pentest:**
   ```bash
   cd /root/shannon
   mkdir -p repos/juice-shop
   # link or clone juice-shop source into repos/juice-shop/
   ./shannon start URL=http://host.docker.internal:3000 REPO=juice-shop
   ```

4. **Invoke via Claude Code skill** — in any Claude Code session type:
   ```
   /shannon http://host.docker.internal:3000 juice-shop
   ```
   The skill will walk through authorization confirmation, credential check, and launch.

5. **Optional — merge branch** via PR when ready:
   https://github.com/nyakanne/theclipart/pull/new/claude/setup-osint-skills-Vskrr

---

## 6. Source References

- Shannon engine: https://github.com/KeygraphHQ/shannon
- Claude Code skill wrapper: https://github.com/unicodeveloper/shannon
- OWASP Juice Shop (practice target): https://github.com/juice-shop/juice-shop
- DVWA (alternative practice target): https://github.com/digininja/DVWA
