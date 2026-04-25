"""Verifier system: ensures correctness, prevents hallucination, labels output."""

import json
import logging
from dataclasses import dataclass, field
from typing import Optional

import anthropic

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VERIFIER_SYSTEM = """You are the Verifier Agent for a second-brain AI system.

Your role is to evaluate AI-generated responses for factual accuracy and grounding.

Rules:
- Never fabricate facts
- Never cite nonexistent sources
- If a claim has no memory backing, flag it
- Detect contradictions and stale data
- Prefer "I don't know" over uncertain claims

For each response, return a JSON object:
{
  "status": "PASS" | "REVISE" | "BLOCK",
  "confidence": "high" | "medium" | "low",
  "issues": ["list of problems found"],
  "labels": {
    "FACT": ["statements grounded in provided memory"],
    "INFERENCE": ["reasonable deductions from memory"],
    "RECOMMENDATION": ["actionable suggestions"]
  },
  "revised_response": "optional cleaned-up version if status=REVISE"
}

PASS = response is grounded and accurate.
REVISE = response has fixable issues; provide revised_response.
BLOCK = response contains fabrications or dangerous claims; do not show to user.
"""


@dataclass
class VerificationResult:
    status: str  # PASS | REVISE | BLOCK
    confidence: str  # high | medium | low
    issues: list[str] = field(default_factory=list)
    labels: dict[str, list[str]] = field(default_factory=dict)
    revised_response: Optional[str] = None


async def verify(
    response: str,
    context: str,
    query: str,
) -> VerificationResult:
    if not settings.ANTHROPIC_API_KEY:
        return VerificationResult(status="PASS", confidence="low", issues=["Verifier not configured — ANTHROPIC_API_KEY missing"])

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = f"""Query: {query}

Retrieved memory context:
{context or "(no memory retrieved)"}

AI response to verify:
{response}

Evaluate the response and return JSON only."""

    try:
        resp = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            system=VERIFIER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        data = json.loads(raw)
        return VerificationResult(
            status=data.get("status", "PASS"),
            confidence=data.get("confidence", "medium"),
            issues=data.get("issues", []),
            labels=data.get("labels", {}),
            revised_response=data.get("revised_response"),
        )
    except json.JSONDecodeError:
        logger.warning("Verifier returned non-JSON output")
        return VerificationResult(status="PASS", confidence="low", issues=["Verifier parse error"])
    except Exception as exc:
        logger.error("Verifier failed: %s", exc)
        return VerificationResult(status="PASS", confidence="low", issues=[str(exc)])


def should_block(result: VerificationResult) -> bool:
    return result.status == "BLOCK"


def get_final_response(original: str, result: VerificationResult) -> str:
    if result.status == "REVISE" and result.revised_response:
        return result.revised_response
    return original
