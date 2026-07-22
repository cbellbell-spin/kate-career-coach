#!/usr/bin/env python3
"""
Stop command hook — deterministic gate ensuring session_context.md (always)
and plan.md (if it exists) were actually re-written this turn, not just
promised by the prompt-type Stop hook.

This targets the specific failure mode from the Dipanjan feedback: Kate
offered to set up monitoring, the offer was never captured anywhere
durable, and it quietly disappeared. A prompt hook can be skipped by a
distracted model; this hook can't — it checks the filesystem, not the
model's self-report.

Design choice (deliberate deviation from the original phase plan): rather
than trying to detect "was a new commitment made this session" (which would
require semantic parsing of the transcript and was explicitly deferred),
this hook requires an unconditional re-touch of plan.md every session, even
when nothing changed. A same-content rewrite is treated as a valid "I
reviewed this" signal, not a failure. That's what makes the read-back
deterministic: the model can't silently skip reviewing plan.md, even on a
trivial session. See docs/plans/2026-07-19-plan-tracker-checklist-hooks.md
for the original escape-valve framing this replaces.

Contract assumed (Claude Code / Cowork Stop hook):
  stdin: JSON with at least {"cwd", "transcript_path"}
  exit 0  -> allow session to end
  exit 2  -> block; stderr text is surfaced to the model as the reason
Not yet smoke-tested against a live Cowork session — part of this hook's
own verification pass.
"""
import json
import os
import sys
import time

FRESHNESS_WINDOW_SECONDS = 10 * 60  # 10 minutes — generous margin between
                                     # the write and this hook firing.

REQUIRED_ALWAYS = ["user/session_context.md"]
REQUIRED_IF_PRESENT = ["user/plan.md"]


def is_fresh(path: str) -> bool:
    if not os.path.exists(path):
        return False
    age = time.time() - os.path.getmtime(path)
    return age <= FRESHNESS_WINDOW_SECONDS


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        # Can't parse the hook payload — fail open rather than block every
        # session end on a plugin bug.
        return 0

    cwd = payload.get("cwd") or os.getcwd()

    # Only enforce on projects Kate has actually onboarded. `user/` is created
    # during onboarding (kate-coach SKILL.md Step 1); its absence means this
    # folder was never turned into a Kate coaching project — most commonly,
    # this is the plugin's own source repo, or Claude Code being used for
    # something unrelated with the plugin merely enabled. Blocking session
    # end in that case is a false positive, not a guarantee worth enforcing.
    if not os.path.isdir(os.path.join(cwd, "user")):
        return 0

    problems = []

    for rel_path in REQUIRED_ALWAYS:
        full_path = os.path.join(cwd, rel_path)
        if not is_fresh(full_path):
            problems.append(
                f"{rel_path} was not written in this session (or doesn't exist)."
            )

    for rel_path in REQUIRED_IF_PRESENT:
        full_path = os.path.join(cwd, rel_path)
        if os.path.exists(full_path) and not is_fresh(full_path):
            problems.append(
                f"{rel_path} exists but was not reviewed/re-saved this session."
            )

    if not problems:
        return 0

    sys.stderr.write(
        "Session cannot end yet — the following required writes are missing:\n"
        + "\n".join(f"  - {p}" for p in problems)
        + "\n\nWrite user/session_context.md now (per the Session Close Protocol), "
        "and if user/plan.md exists, re-open it and either update it or append a "
        "'Reviewed, no changes' line to its Review Log. Then finish.\n"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
