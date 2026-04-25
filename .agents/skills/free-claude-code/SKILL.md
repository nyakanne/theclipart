---
name: free-claude-code
description: >
  Manage the free-claude-code proxy server that routes Claude Code API calls to
  free providers (NVIDIA NIM, OpenRouter, DeepSeek, LM Studio, llama.cpp).
  Use when the user asks to: start/stop the proxy, switch AI providers, configure
  a free Claude setup, check proxy status, or troubleshoot provider errors.
metadata:
  author: nyakanne
  source: https://github.com/nyakanne/free-claude-code
  installed: /home/user/free-claude-code
  config: ~/.config/free-claude-code/.env
  executables: free-claude-code, fcc-init
---

# Free Claude Code Proxy Skill

Routes Claude Code's Anthropic API calls to free/alternative LLM providers.
The proxy runs on `http://localhost:8082` and Claude Code points to it via env vars.

## Starting the Proxy

```bash
# From the project directory (picks up local .env):
cd /home/user/free-claude-code && uv run uvicorn server:app --host 0.0.0.0 --port 8082

# Or via the globally installed tool (uses ~/.config/free-claude-code/.env):
free-claude-code
```

Run in the background; then in another terminal launch Claude Code:

```bash
ANTHROPIC_AUTH_TOKEN="freecc" ANTHROPIC_BASE_URL="http://localhost:8082" claude
```

## Provider Quick-Config

Edit `~/.config/free-claude-code/.env` (global) or `/home/user/free-claude-code/.env` (project).

| Provider | Required key variable | Model prefix |
|---|---|---|
| NVIDIA NIM (40 req/min free) | `NVIDIA_NIM_API_KEY` | `nvidia_nim/...` |
| OpenRouter (free models) | `OPENROUTER_API_KEY` | `open_router/...` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek/...` |
| LM Studio (local) | none | `lmstudio/...` |
| llama.cpp (local) | none | `llamacpp/...` |

Key `.env` variables:

```dotenv
MODEL=nvidia_nim/z-ai/glm4.7          # fallback model
MODEL_OPUS=nvidia_nim/moonshotai/kimi-k2.5
MODEL_SONNET=open_router/deepseek/deepseek-r1-0528:free
MODEL_HAIKU=lmstudio/unsloth/GLM-4.7-Flash-GGUF
NVIDIA_NIM_API_KEY=nvapi-...
OPENROUTER_API_KEY=sk-or-...
ENABLE_THINKING=true
```

## Checking Status

```bash
curl -s http://localhost:8082/v1/models | jq .    # list available models
curl -s http://localhost:8082/health              # health check (if exposed)
```

## Switching Providers at Runtime

Use a model alias instead of editing `.env` each time:

```bash
# Fixed model alias (no picker needed):
alias claude-kimi='ANTHROPIC_BASE_URL="http://localhost:8082" ANTHROPIC_AUTH_TOKEN="freecc:moonshotai/kimi-k2.5" claude'
```

Or install `fzf` and use the interactive picker:

```bash
alias claude-pick="/home/user/free-claude-code/claude-pick"
```

## Updating

```bash
uv tool upgrade free-claude-code
# or re-install from local clone after pulling:
cd /home/user/free-claude-code && git pull && uv tool install . --python 3.14 --reinstall
```

## Architecture

```
Claude Code CLI → free-claude-code proxy (:8082) → LLM provider
```

- Intercepts 5 categories of trivial requests locally (saves quota)
- Translates Anthropic SSE format ↔ OpenAI chat format for NIM/DeepSeek
- Converts `<think>` tags into native Claude thinking blocks
- Smart rate limiting: rolling window + 429 exponential backoff
