"""
Tests for tools/blocked.py — the deterministic backlog selector + validator.

Run: python3 tools/test_blocked.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
SCRIPT = THIS_DIR / "blocked.py"


def compute_content_sha(path: Path) -> str:
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--ready-content-sha", str(path)],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AssertionError(f"sha failed for {path}: {proc.stderr}")
    return proc.stdout.strip()


def write_item(
    repo: Path,
    stage: str,
    item_id: str,
    *,
    priority: str = "HIGH",
    created: str = "2026-04-30",
    blocked_by: list[str] | None = None,
    extra_frontmatter: str = "",
    body_extra: str = "",
    seal_ready: bool = True,
) -> Path:
    """Write a minimal but valid item file under repo/backlog/<stage>/."""
    blocked_by = blocked_by or []
    if blocked_by:
        bb = "blocked_by:\n" + "".join(f'  - "{b}"\n' for b in blocked_by)
    else:
        bb = "blocked_by: []\n"
    # Note: do NOT use textwrap.dedent here. The variable substitutions can
    # introduce inconsistent indentation that breaks dedent. Build the file
    # explicitly with no leading whitespace.
    body = (
        f"---\n"
        f"id: {item_id}\n"
        f"priority: {priority}\n"
        f"created: {created}\n"
        f"{bb}"
        f"{extra_frontmatter}"
        f"---\n"
        f"\n"
        f"# body for {item_id}\n"
        f"{body_extra}"
    )
    f = repo / "backlog" / stage / f"{item_id}.md"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(body, encoding="utf-8")
    if stage == "ready" and seal_ready and "ready_content_sha:" not in extra_frontmatter:
        digest = compute_content_sha(f)
        text = f.read_text(encoding="utf-8")
        f.write_text(
            text.replace("---\n\n# body", f"ready_content_sha: {digest}\n---\n\n# body", 1),
            encoding="utf-8",
        )
    return f


def make_repo() -> Path:
    """Create a temp repo skeleton with the backlog stages and a fake .git."""
    repo = Path(tempfile.mkdtemp(prefix="blocked-test-"))
    (repo / ".git").mkdir()
    for stage in ("proposed", "ready", "claimed", "pending_review", "complete"):
        (repo / "backlog" / stage).mkdir(parents=True)
    return repo


def run_script(repo: Path, *args: str) -> tuple[int, str, str]:
    """Run blocked.py with cwd=repo; return (returncode, stdout, stderr)."""
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        cwd=repo,
        capture_output=True,
        text=True,
    )
    return proc.returncode, proc.stdout, proc.stderr


class BlockedScriptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = make_repo()

    def tearDown(self) -> None:
        shutil.rmtree(self.repo, ignore_errors=True)

    def ready_content_sha(self, path: Path) -> str:
        rc, out, err = run_script(self.repo, "--ready-content-sha", str(path))
        self.assertEqual(rc, 0, f"stderr: {err}")
        return out.strip()

    # ── Default selection mode ──────────────────────────────────────────────

    def test_empty_queue_exits_1(self) -> None:
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1)
        self.assertEqual(out.strip(), "")

    def test_single_unblocked_item_is_picked(self) -> None:
        write_item(self.repo, "ready", "2026-04-30-001-foo")
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_empty_requested_reviewers_does_not_gate(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter="requested_reviewers: []\n",
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_absent_requested_reviewers_does_not_gate(self) -> None:
        write_item(self.repo, "ready", "2026-04-30-001-foo")
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_inline_requested_reviewers_does_not_gate_when_ready_sealed(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter='requested_reviewers: ["codex","codex-ops"]\n',
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_malformed_requested_reviewers_does_not_affect_claimability(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter='requested_reviewers: "codex,codex-ops"\n',
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_missing_ready_content_sha_is_blocked(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            seal_ready=False,
        )
        rc, out, _ = run_script(self.repo, "--list-blocked")
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo", out)
        self.assertIn("missing-ready-content-sha", out)

        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1)
        self.assertEqual(out.strip(), "")

    def test_ready_content_sha_mismatch_is_blocked(self) -> None:
        path = write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            body_extra="## Acceptance Criteria\n- original\n",
        )
        path.write_text(
            path.read_text(encoding="utf-8").replace("- original", "- changed"),
            encoding="utf-8",
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1)
        self.assertEqual(out.strip(), "")

        rc, out, _ = run_script(self.repo, "--list-blocked")
        self.assertEqual(rc, 0)
        self.assertIn("ready-content-sha-mismatch", out)

    def test_legacy_converged_matching_digest_is_transitionally_claimable(self) -> None:
        path = write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter='requested_reviewers: ["codex","codex-ops"]\n',
            seal_ready=False,
        )
        digest = self.ready_content_sha(path)
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter=(
                'requested_reviewers: ["codex","codex-ops"]\n'
                "spec_review: converged\n"
                f"spec_review_sha: {digest}\n"
            ),
            seal_ready=False,
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_marker_only_delta_stays_fresh(self) -> None:
        path = write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter='requested_reviewers: ["codex","codex-ops"]\n',
            seal_ready=False,
        )
        digest = self.ready_content_sha(path)
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter=(
                'requested_reviewers: ["codex","codex-ops"]\n'
                "spec_review: converged\n"
                f"spec_review_sha: {digest}\n"
                'agent_notes: "marker-only lifecycle note"\n'
            ),
            seal_ready=False,
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_body_delta_after_legacy_convergence_is_stale(self) -> None:
        path = write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter='requested_reviewers: ["codex","codex-ops"]\n',
            body_extra="## Acceptance Criteria\n- original\n",
            seal_ready=False,
        )
        digest = self.ready_content_sha(path)
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter=(
                'requested_reviewers: ["codex","codex-ops"]\n'
                "spec_review: converged\n"
                f"spec_review_sha: {digest}\n"
            ),
            body_extra="## Acceptance Criteria\n- changed\n",
            seal_ready=False,
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1)
        self.assertEqual(out.strip(), "")

        rc, out, _ = run_script(self.repo, "--list-blocked")
        self.assertEqual(rc, 0)
        self.assertIn("legacy-spec-edited-after-review", out)

    def test_waived_spec_review_is_claimable_without_digest(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter=(
                'requested_reviewers: ["codex","codex-ops"]\n'
                "spec_review: waived\n"
            ),
            seal_ready=False,
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-001-foo.md", out.strip())

    def test_alpha_suffixed_id_is_accepted(self) -> None:
        # Decomposed parent/sibling specs use a single-letter suffix on the
        # 3-digit sequence (e.g. 057a, 057b). Selector + schemas must accept.
        write_item(self.repo, "ready", "2026-05-16-057a-coord-substrate")
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-05-16-057a-coord-substrate.md", out.strip())

    def test_proposed_item_is_never_a_candidate(self) -> None:
        write_item(self.repo, "proposed", "2026-04-30-001-foo")
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1)
        self.assertEqual(out.strip(), "")

    def test_blocker_in_pending_review_does_NOT_unblock(self) -> None:
        # Critical safety property: only complete/ satisfies a dependency
        write_item(self.repo, "pending_review", "2026-04-30-001-foo")
        write_item(
            self.repo,
            "ready",
            "2026-04-30-002-bar",
            blocked_by=["2026-04-30-001-foo"],
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1, f"expected no candidates, got: {out}")
        self.assertEqual(out.strip(), "")

    def test_blocker_in_proposed_is_known_but_does_NOT_unblock(self) -> None:
        write_item(self.repo, "proposed", "2026-04-30-001-foo")
        write_item(
            self.repo,
            "ready",
            "2026-04-30-002-bar",
            blocked_by=["2026-04-30-001-foo"],
        )
        rc, out, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 0, f"stderr: {err}")

        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 1, f"expected no candidates, got: {out}")
        self.assertEqual(out.strip(), "")

    def test_blocker_in_complete_unblocks(self) -> None:
        write_item(self.repo, "complete", "2026-04-30-001-foo")
        write_item(
            self.repo,
            "ready",
            "2026-04-30-002-bar",
            blocked_by=["2026-04-30-001-foo"],
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-002-bar.md", out)

    def test_partial_dependency_satisfaction_does_NOT_unblock(self) -> None:
        write_item(self.repo, "complete", "2026-04-30-001-foo")
        write_item(self.repo, "ready", "2026-04-30-002-bar")  # not in complete
        write_item(
            self.repo,
            "ready",
            "2026-04-30-003-baz",
            blocked_by=["2026-04-30-001-foo", "2026-04-30-002-bar"],
        )
        # Picks 002 (no deps), but 003 stays blocked
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-002-bar.md", out)
        self.assertNotIn("2026-04-30-003-baz", out)

    # ── Priority + date ordering ─────────────────────────────────────────────

    def test_priority_outranks_date(self) -> None:
        write_item(
            self.repo, "ready", "2026-04-29-001-old-low",
            priority="LOW", created="2026-04-29",
        )
        write_item(
            self.repo, "ready", "2026-04-30-002-new-high",
            priority="HIGH", created="2026-04-30",
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-30-002-new-high.md", out)

    def test_date_breaks_priority_tie(self) -> None:
        write_item(
            self.repo, "ready", "2026-04-29-001-older",
            priority="HIGH", created="2026-04-29",
        )
        write_item(
            self.repo, "ready", "2026-04-30-001-newer",
            priority="HIGH", created="2026-04-30",
        )
        rc, out, _ = run_script(self.repo)
        self.assertEqual(rc, 0)
        self.assertIn("2026-04-29-001-older.md", out)

    # ── Validation ───────────────────────────────────────────────────────────

    def test_validate_clean_repo_exits_0(self) -> None:
        write_item(self.repo, "ready", "2026-04-30-001-foo")
        rc, out, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 0, f"stderr: {err}")
        self.assertIn("OK", out)

    def test_dangling_blocked_by_exits_2(self) -> None:
        write_item(
            self.repo, "ready", "2026-04-30-002-bar",
            blocked_by=["2026-04-30-999-does-not-exist"],
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("not a known item id", err)

    def test_cycle_detection_exits_2(self) -> None:
        write_item(
            self.repo, "ready", "2026-04-30-001-a",
            blocked_by=["2026-04-30-002-b"],
        )
        write_item(
            self.repo, "ready", "2026-04-30-002-b",
            blocked_by=["2026-04-30-001-a"],
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("cycle", err)

    def test_id_filename_mismatch_exits_2(self) -> None:
        # write a file whose id frontmatter contradicts its filename
        f = self.repo / "backlog" / "ready" / "2026-04-30-001-correct.md"
        f.write_text(
            textwrap.dedent(
                """\
                ---
                id: 2026-04-30-999-wrong
                priority: HIGH
                created: 2026-04-30
                blocked_by: []
                ---
                """
            ),
            encoding="utf-8",
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("does not match filename", err)

    def test_duplicate_id_exits_2(self) -> None:
        write_item(self.repo, "ready", "2026-04-30-001-foo")
        # Re-write the same id into a different stage
        f = self.repo / "backlog" / "complete" / "2026-04-30-001-foo.md"
        f.write_text(
            textwrap.dedent(
                """\
                ---
                id: 2026-04-30-001-foo
                priority: HIGH
                created: 2026-04-30
                blocked_by: []
                ---
                """
            ),
            encoding="utf-8",
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("duplicate id", err)

    def test_bad_priority_exits_2(self) -> None:
        f = self.repo / "backlog" / "ready" / "2026-04-30-001-foo.md"
        f.write_text(
            textwrap.dedent(
                """\
                ---
                id: 2026-04-30-001-foo
                priority: URGENT
                created: 2026-04-30
                blocked_by: []
                ---
                """
            ),
            encoding="utf-8",
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("priority", err)

    def test_bad_spec_review_value_exits_2(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter="spec_review: done\n",
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("spec_review must be one of", err)

    def test_converged_without_digest_exits_2(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter=(
                'requested_reviewers: ["codex","codex-ops"]\n'
                "spec_review: converged\n"
            ),
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("spec_review: converged requires a valid spec_review_sha", err)

    def test_malformed_spec_review_sha_exits_2(self) -> None:
        write_item(
            self.repo,
            "ready",
            "2026-04-30-001-foo",
            extra_frontmatter=(
                "spec_review: pending\n"
                "spec_review_sha: abc123\n"
            ),
        )
        rc, _, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 2)
        self.assertIn("spec_review_sha must be a 64-character", err)

    def test_status_field_is_NOT_validated(self) -> None:
        # status field is informational; folder is truth. Items can have a stale
        # status frontmatter without triggering validation errors.
        f = self.repo / "backlog" / "complete" / "2026-04-30-001-foo.md"
        f.write_text(
            textwrap.dedent(
                """\
                ---
                id: 2026-04-30-001-foo
                status: ready
                priority: HIGH
                created: 2026-04-30
                blocked_by: []
                ---
                """
            ),
            encoding="utf-8",
        )
        rc, out, err = run_script(self.repo, "--validate")
        self.assertEqual(rc, 0, f"stderr: {err}")
        self.assertIn("OK", out)

    # ── Listing modes ────────────────────────────────────────────────────────

    def test_list_all_shows_each_ready_item_with_status(self) -> None:
        write_item(self.repo, "complete", "2026-04-30-001-foo")
        write_item(
            self.repo, "ready", "2026-04-30-002-bar",
            blocked_by=["2026-04-30-001-foo"],
        )
        write_item(
            self.repo, "ready", "2026-04-30-003-baz",
            blocked_by=["2026-04-30-002-bar"],
        )
        rc, out, _ = run_script(self.repo, "--list-all")
        self.assertEqual(rc, 0)
        self.assertIn("READY", out)
        self.assertIn("BLOCKED", out)
        self.assertIn("2026-04-30-002-bar", out)
        self.assertIn("2026-04-30-003-baz", out)

    def test_list_blocked_shows_only_blocked_items(self) -> None:
        write_item(self.repo, "complete", "2026-04-30-001-foo")
        write_item(self.repo, "ready", "2026-04-30-002-bar")  # unblocked
        write_item(
            self.repo, "ready", "2026-04-30-003-baz",
            blocked_by=["2026-04-30-002-bar"],
        )
        rc, out, _ = run_script(self.repo, "--list-blocked")
        self.assertEqual(rc, 0)
        self.assertNotIn("2026-04-30-002-bar:", out)  # unblocked, not listed
        self.assertIn("2026-04-30-003-baz", out)

    def test_unknown_flag_exits_2(self) -> None:
        rc, _, err = run_script(self.repo, "--no-such-flag")
        self.assertEqual(rc, 2)
        self.assertIn("unknown flag", err)


if __name__ == "__main__":
    unittest.main(verbosity=2)
