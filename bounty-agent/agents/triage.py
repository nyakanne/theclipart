"""
TriageAgent — reviews raw findings, removes FPs, scores CVSS, deduplicates vs H1 disclosures.
"""

from agents.base import BaseAgent


class TriageAgent(BaseAgent):
    name = "triage"
    max_turns = 15

    def get_tools(self) -> list[dict]:
        return [
            {
                "name": "search_h1_disclosures",
                "description": "Search HackerOne disclosed reports for a program to check for duplicates",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "handle": {"type": "string"},
                        "keyword": {"type": "string"},
                    },
                    "required": ["handle", "keyword"],
                },
            },
            {
                "name": "approve_finding",
                "description": "Approve a finding for submission",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "finding_id": {"type": "string"},
                        "cvss_score": {"type": "number"},
                        "cwe": {"type": "string"},
                        "adjusted_severity": {"type": "string"},
                    },
                    "required": ["finding_id"],
                },
            },
            {
                "name": "reject_finding",
                "description": "Mark a finding as false positive or out of scope",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "finding_id": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["finding_id", "reason"],
                },
            },
        ]

    def build_user_message(self) -> str:
        findings_summary = [
            f"{f.id}: [{f.severity}] {f.title} — {f.url}"
            for f in self.state.findings
        ]
        return (
            f"Triage {len(self.state.findings)} findings for {self.state.program_handle}.\n\n"
            + "\n".join(findings_summary) + "\n\n"
            "For each finding:\n"
            "1. Check if it's a duplicate via H1 disclosures\n"
            "2. Apply the 7-Question Gate: Can attacker do this RIGHT NOW? Real harm? In scope?\n"
            "3. Approve high/critical findings with CVSS score\n"
            "4. Reject false positives and theoretical bugs with reason\n"
            "Be ruthless — only approve findings that will get paid."
        )

    def tool_search_h1_disclosures(self, handle: str, keyword: str) -> list:
        try:
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))
            from h1_api import _get
            data = _get(f"/hackers/programs/{handle}/reports", {
                "filter[state][]": "disclosed",
                "page[size]": 25,
            })
            matches = []
            keyword_lower = keyword.lower()
            for r in data.get("data", []):
                title = r.get("attributes", {}).get("title", "")
                if keyword_lower in title.lower():
                    matches.append({
                        "id": r.get("id"),
                        "title": title,
                        "url": f"https://hackerone.com/reports/{r.get('id')}",
                    })
            return matches
        except Exception as e:
            return [{"error": str(e)}]

    def tool_approve_finding(
        self,
        finding_id: str,
        cvss_score: float = 0.0,
        cwe: str = "",
        adjusted_severity: str = "",
    ) -> str:
        for f in self.state.findings:
            if f.id == finding_id:
                f.approved = True
                if cvss_score:
                    f.cvss_score = cvss_score
                if cwe:
                    f.cwe = cwe
                if adjusted_severity:
                    f.severity = adjusted_severity
                self.state.save()
                return f"Approved {finding_id}"
        return f"Finding {finding_id} not found"

    def tool_reject_finding(self, finding_id: str, reason: str) -> str:
        for f in self.state.findings:
            if f.id == finding_id:
                f.false_positive = True
                f.description += f"\n\n[REJECTED: {reason}]"
                self.state.save()
                return f"Rejected {finding_id}: {reason}"
        return f"Finding {finding_id} not found"
