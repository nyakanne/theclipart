"""
Git branch manager for bounty hunts.
Creates hunt/h1-{program}-{YYYYMMDD} branches, commits findings as they land,
and pushes to origin so the hunt is publicly auditable.
"""

import threading
from datetime import datetime, timezone
from pathlib import Path

import git


class GitSemaphore:
    """Serialise all git operations to avoid index.lock conflicts."""
    _lock = threading.Lock()

    def __enter__(self):
        self._lock.acquire()
        return self

    def __exit__(self, *_):
        self._lock.release()


_sem = GitSemaphore()


class BranchManager:
    def __init__(self, repo_path: str, remote: str = "origin"):
        self.repo = git.Repo(repo_path)
        self.remote = remote
        self.branch: str = ""

    def create_hunt_branch(self, program_handle: str) -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        time_str = datetime.now(timezone.utc).strftime("%H%M")
        self.branch = f"hunt/h1-{program_handle}-{date_str}-{time_str}"

        with _sem:
            try:
                self.repo.git.fetch(self.remote)
            except Exception:
                pass
            self.repo.git.checkout("-b", self.branch)
            try:
                self.repo.git.push("-u", self.remote, self.branch)
            except Exception as e:
                print(f"[branch_manager] push warning: {e}")

        return self.branch

    def commit_phase(self, phase: str, files: list[str], message: str):
        with _sem:
            for f in files:
                try:
                    self.repo.index.add([f])
                except Exception:
                    pass
            try:
                self.repo.index.commit(message)
                self.repo.git.push(self.remote, self.branch)
                print(f"[git] {message}")
            except git.GitCommandError as e:
                if "nothing to commit" not in str(e):
                    print(f"[git] commit error: {e}")

    def commit_finding(self, finding_id: str, title: str, severity: str, hunt_dir: str):
        files = [
            str(Path(hunt_dir) / "hunt_state.json"),
            str(Path(hunt_dir) / "findings.json"),
        ]
        message = f"hunt: [{severity.upper()}] {title[:60]} — {finding_id}"
        self.commit_phase("finding", files, message)

    def commit_report(self, h1_id: str, title: str, severity: str, hunt_dir: str):
        files = [str(p) for p in Path(hunt_dir).glob("reports/*.md")]
        files += [str(p) for p in Path(hunt_dir).glob("reports/*.json")]
        message = f"report: submitted H1 #{h1_id} [{severity}] {title[:50]}"
        self.commit_phase("report", files, message)

    def finish(self, hunt_dir: str, submitted: int):
        files = [str(Path(hunt_dir) / "hunt_state.json")]
        message = f"hunt: complete — {submitted} report(s) submitted"
        self.commit_phase("finish", files, message)
