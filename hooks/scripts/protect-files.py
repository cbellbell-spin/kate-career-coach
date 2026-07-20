#!/usr/bin/env python3
"""
PreToolUse command hook — deterministic gate for Kate's protected files.

Replaces the old prompt-type hook, which only *asked* the model to check for
prior user approval before writing user/user_profile.md, a targeted resume,
or a cover letter. That check ran inside the model's judgment and could be
skipped. This script runs independently of the model and blocks the tool
call outright (exit 2) unless it finds explicit approval language in the
recent transcript, following a message where Kate referenced the same file.

Known limitation: "approval" is detected heuristically (keyword match on the
user's most recent messages after the file was mentioned), not via a
first-class confirmation mechanism. This is a best-effort deterministic
check, not a proof of informed consent. Revisit if false positives/negatives
show up in real use — see docs/plans/2026-07-19-plan-tracker-checklist-hooks.md.

Contract assumed (Claude Code / Cowork PreToolUse hook):
  stdin: JSON with at least {"tool_name", "tool_input", "transcript_path"}
  exit 0  -> allow
  exit 2  -> block; stderr text is surfaced to the model as the reason
This hasn't been smoke-tested against a live Cowork session yet — that's
the verification pass this hook ships with.
"""
import json
import os
import re
import sys

PROTECTED_PATTERNS = [
    re.compile(r"(^|/)user/user_profile\.md$"),
    re.compile(r"targeted_resume[^/]*\.docx$", re.IGNORECASE),
    re.compile(r"cover_letter[^/]*\.md$", re.IGNORECASE),
]

APPROVAL_PATTERN = re.compile(
    r"\b(yes|approved?|go ahead|looks good|confirm(ed)?|sounds good|do it|write it|that works|correct|good to go)\b",
    re.IGNORECASE,
)

TRANSCRIPT_SCAN_LINES = 40


def is_protected(file_path: str) -> bool:
    return any(p.search(file_path) for p in PROTECTED_PATTERNS)


def message_text(message: dict) -> str:
    content = message.get("content", "")
    if isinstance(content, str):
        return content
    # Content can be a list of blocks (text, tool_use, etc.) in Claude transcripts.
    parts = []
    for block in content if isinstance(content, list) else []:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(parts)


def has_recent_approval(transcript_path: str, file_path: str) -> bool:
    if not transcript_path or not os.path.exists(transcript_path):
        return False

    basename = os.path.basename(file_path)
    mentioned_file = False

    try:
        with open(transcript_path, "r") as f:
            lines = f.readlines()[-TRANSCRIPT_SCAN_LINES:]
    except OSError:
        return False

    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        message = entry.get("message", {})
        role = message.get("role")
        text = message_text(message)

        if role == "assistant" and basename and basename in text:
            mentioned_file = True
        elif role == "user" and mentioned_file and APPROVAL_PATTERN.search(text):
            return True

    return False


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        # Can't parse the hook payload — fail open rather than block on a plugin bug.
        return 0

    tool_input = payload.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "") or ""

    if not is_protected(file_path):
        return 0

    transcript_path = payload.get("transcript_path", "")
    if has_recent_approval(transcript_path, file_path):
        return 0

    sys.stderr.write(
        f"Blocked write to protected file '{file_path}'. Per Kate's file ownership rules, "
        "this file requires explicit user approval before writing. Present the proposed "
        "content, state the target file, and wait for clear approval before retrying.\n"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
