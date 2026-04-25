---
name: deploy-to-vercel
description: Deploy applications to Vercel. Use when asked to deploy, publish, or push to Vercel. Always deploys as preview unless production is explicitly requested.
metadata:
  author: vercel
  version: "1.0.0"
---

# Deploy to Vercel

Deploy applications to Vercel, prioritizing preview deployments unless production is explicitly requested.

## Step 1: Gather Project State

Check all four conditions before choosing a deployment method:

```bash
# 1. Git remote
git remote get-url origin 2>/dev/null

# 2. Vercel linking
cat .vercel/project.json 2>/dev/null || cat .vercel/repo.json 2>/dev/null

# 3. CLI auth
vercel whoami

# 4. Teams
vercel teams list --format json
```

## Step 2: Choose Deployment Method

### Linked + Git Remote (ideal)
Get explicit user approval, then commit and push:
```bash
git add .
git commit -m "deploy: <description>"
git push
```
Retrieve the preview URL:
```bash
vercel ls --format json --scope <team-slug>
```

### Linked + No Git Remote
Deploy directly via CLI:
```bash
vercel deploy [path] -y --no-wait
```

### Not Linked + Authenticated CLI
Link first (prefer `--repo` when git remote exists):
```bash
vercel link --repo --scope <team-slug> -y
# then deploy using the appropriate method above
```

### Not Linked + Unauthenticated
```bash
npm install -g vercel
vercel login  # browser-based auth
vercel link --scope <team-slug> -y
vercel deploy -y --no-wait
```

### No-Auth Fallback (sandboxed environments)
Use the deployment script at `/mnt/skills/user/deploy-to-vercel/resources/deploy.sh` for claude.ai environments, or `deploy-codex.sh` for Codex. These return both preview and claim URLs without authentication.

## Key Behaviors

- **Always deploy as preview** unless the user explicitly says "production" or "prod"
- **Always ask before pushing** to git — never push without explicit approval
- **Present team options** as a bulleted list when multiple teams exist; use `--scope <team-slug>` on all CLI commands
- **Use `--no-wait`** to return immediately with the deployment URL
- **Show deployment URLs** to the user; never fetch the deployed URL to verify
- **Use `vercel whoami` only** to check auth state in unlinked directories — never `vercel link` or `vercel project inspect` as detection commands (they have side effects)
