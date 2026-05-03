"""
Builds OSINT knowledge context injected into the HuntingAgent system prompt.
Selects relevant technique YAMLs based on discovered technologies.
Keeps total under 6k tokens.
"""

from __future__ import annotations
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).parent
TECHNIQUES_DIR = KNOWLEDGE_DIR / "techniques"
PAYLOADS_DIR   = KNOWLEDGE_DIR / "payloads"

TECH_TO_TECHNIQUES: dict[str, list[str]] = {
    "jwt":        ["jwt", "oauth"],
    "graphql":    ["graphql", "idor"],
    "express":    ["idor", "ssrf", "xss"],
    "django":     ["idor", "sqli", "ssti"],
    "rails":      ["idor", "sqli", "csrf"],
    "nginx":      ["ssrf", "path_traversal"],
    "spring":     ["sqli", "ssrf", "deserialization"],
    "wordpress":  ["sqli", "xss", "file_upload"],
    "s3":         ["cloud_misconfig"],
    "aws":        ["cloud_misconfig", "ssrf"],
    "oauth":      ["oauth"],
    "api":        ["idor", "ssrf", "auth_bypass"],
}

ALWAYS_INCLUDE = ["idor", "xss", "ssrf"]


def _load_technique(name: str) -> str | None:
    for ext in (".yaml", ".md", ".txt"):
        path = TECHNIQUES_DIR / f"{name}{ext}"
        if path.exists():
            return f"### {name.upper()} TECHNIQUE\n{path.read_text()[:1500]}"
    return None


def _load_payloads(vuln_type: str, max_items: int = 15) -> str:
    for ext in (".txt", ".md"):
        path = PAYLOADS_DIR / f"{vuln_type}{ext}"
        if path.exists():
            lines = [l.strip() for l in path.read_text().splitlines() if l.strip()][:max_items]
            return f"### {vuln_type.upper()} PAYLOADS\n" + "\n".join(f"  {l}" for l in lines)
    return ""


def build_hunter_context(state) -> str:
    """Select and assemble OSINT knowledge relevant to the hunt's tech stack."""
    techs = []
    for tech_list in (state.recon.get("technologies") or {}).values():
        if isinstance(tech_list, list):
            techs.extend(t.lower() for t in tech_list)
        elif isinstance(tech_list, str):
            techs.append(tech_list.lower())

    technique_names = list(ALWAYS_INCLUDE)
    for tech in techs:
        for keyword, techniques in TECH_TO_TECHNIQUES.items():
            if keyword in tech:
                technique_names.extend(techniques)

    # Deduplicate, preserve order
    seen: set[str] = set()
    unique = [t for t in technique_names if not (t in seen or seen.add(t))]  # type: ignore

    sections: list[str] = []
    total_chars = 0
    char_cap = 12000  # ~4k tokens

    for name in unique[:10]:
        snippet = _load_technique(name)
        if snippet and total_chars + len(snippet) < char_cap:
            sections.append(snippet)
            total_chars += len(snippet)
        payload = _load_payloads(name)
        if payload and total_chars + len(payload) < char_cap:
            sections.append(payload)
            total_chars += len(payload)

    if not sections:
        return "No additional OSINT knowledge loaded — use general web security techniques."

    return "\n\n".join(sections)
