# Anthropic Financial Services — Reference Skill

Use this skill when the user asks about financial analysis, investment banking, equity research, private equity, wealth management, or fund operations.

Source: https://github.com/anthropics/financial-services (23k stars, Apache 2.0)

**Disclaimer:** Nothing here constitutes investment, legal, tax, or accounting advice. All outputs are analyst work product drafts requiring qualified professional review.

---

## Available Slash Commands

### Financial Analysis (Core)
| Command | Function |
|---------|----------|
| `/comps` | Comparable company analysis |
| `/dcf` | DCF valuation with WACC |
| `/lbo` | Leveraged buyout model |
| `/3-statement-model` | Integrated financial model |
| `/debug-model` | Excel audit and formula tracing |
| `/competitive-analysis` | Market positioning |

### Investment Banking
| Command | Function |
|---------|----------|
| `/one-pager` | Company profile |
| `/cim` | Confidential Information Memorandum |
| `/teaser` | Anonymous deal teaser |
| `/buyer-list` | Buyer universe development |
| `/merger-model` | Accretion/dilution analysis |
| `/process-letter` | Bid instructions |
| `/deal-tracker` | Deal milestone tracking |

### Equity Research
| Command | Function |
|---------|----------|
| `/earnings` | Post-earnings report |
| `/earnings-preview` | Pre-earnings scenario analysis |
| `/initiate` | Initiation of coverage report |
| `/model-update` | Financial model update |
| `/morning-note` | Trading idea note |
| `/sector` | Industry landscape |
| `/thesis` | Investment thesis maintenance |
| `/catalysts` | Catalyst calendar |
| `/screen` | Stock screening |

### Private Equity
| Command | Function |
|---------|----------|
| `/source` | Deal sourcing and outreach |
| `/screen-deal` | CIM pass/fail evaluation |
| `/dd-checklist` | Diligence checklist |
| `/dd-prep` | Management meeting prep |
| `/unit-economics` | ARR, LTV/CAC analysis |
| `/returns` | IRR/MOIC sensitivity |
| `/ic-memo` | Investment committee memo |
| `/portfolio` | Portfolio KPI tracking |
| `/value-creation` | 100-day value creation plan |
| `/ai-readiness` | AI capability assessment |

### Wealth Management
| Command | Function |
|---------|----------|
| `/client-review` | Client meeting prep |
| `/financial-plan` | Retirement and estate planning |
| `/rebalance` | Tax-aware rebalancing |
| `/client-report` | Performance reporting |
| `/proposal` | Prospect proposal |
| `/tlh` | Tax-loss harvesting analysis |

---

## Agents

| Agent | Vertical | Function |
|-------|----------|----------|
| Pitch Agent | IB | Comps + precedents + LBO → branded pitch deck |
| Meeting Prep Agent | IB | Client briefing packs |
| Market Researcher | Research | Industry overview, competitive landscape, peer comps |
| Earnings Reviewer | Research | Earnings calls + filings → model updates |
| Model Builder | Research | DCF, LBO, 3-statement in Excel |
| Valuation Reviewer | PE / Fund Admin | GP packages, LP reporting |
| GL Reconciler | Fund Admin | Break tracing and root-cause |
| Month-End Closer | Finance Ops | Accruals, roll-forwards, variance commentary |
| Statement Auditor | Fund Admin | LP statement audit pre-distribution |
| KYC Screener | Operations | Onboarding document parsing |

## Data Connectors (MCP)

Daloopa · Morningstar · S&P Global · FactSet · Moody's · MT Newswires · Aiera · LSEG · PitchBook · Chronograph · Egnyte

## Vertical Plugins

Start with `financial-analysis` (core), then add:
`investment-banking` · `equity-research` · `private-equity` · `wealth-management` · `fund-admin` · `operations` · `lseg` · `sp-global`

## Install via Claude Code CLI
```bash
claude plugin marketplace add anthropics/claude-for-financial-services
claude plugin install pitch-agent@claude-for-financial-services
```
