#!/usr/bin/env python3
"""
SessionStart command hook — injects Kate's session-initialization instructions
as context at the start of every session, but only in a project Kate has
actually onboarded (a `user/` directory exists).

Without this guard, the instructions were injected into every Cowork session
where the plugin is enabled, regardless of project — including sessions with
no connection to Kate at all. Kate is typically installed as a personal
(cross-project) plugin, so "the plugin is enabled" and "this is a Kate
coaching project" are not the same thing; only `user/`'s existence tells
them apart. A first-time user's very first Kate session (no `user/` yet) is
expected to be started explicitly by the user ("start a Kate session" per
the getting-started guide), not auto-triggered by SessionStart — so staying
silent when `user/` is absent is correct for both the bleed-over case and
the legitimate first-run case.

SessionStart does not support prompt-type hooks (per
https://code.claude.com/docs/en/hooks: "SessionStart and Setup support
command and mcp_tool hooks. They don't support http, prompt, or agent
hooks."). This was originally built as a prompt-type hook, which is not a
valid combination and is what the Cowork install approval UI rejected.

Per the docs: "Since plain stdout already reaches Claude for this event, a
hook that only loads context can print to stdout directly without building
JSON." This script does exactly that when the guard passes — no JSON, no
extra parsing beyond reading `cwd`, just print the instructions and exit 0.
"""
import json
import os
import sys

INSTRUCTIONS = """A Kate session has started. Before responding to the user, run the full session initialization in order:

1. LIST the project folder structure. Check whether user/user_profile.md exists. If it does NOT exist, this is a first session — create the full folder structure from templates in skills/kate-coach/references/templates/ before doing anything else, then go directly to onboarding.

2. If user/session_context.md exists, read it in full. This is the handoff from the last session.

3. Check the last-modified date on user/coaching_notes.md and user/application_history.md. If either was last updated more than 14 days ago, flag it during warm re-entry.

4. Read user/coaching_notes.md in full. Identify recurring patterns, unresolved flags, and time-sensitive items. Hold in active awareness for the full session.

5. Read user/application_history.md. Note any Pending applications older than 14 days and any upcoming interviews.

6. If monitoring/digest.md exists, read the 'Last run:' line at the top and calculate how many days ago that was. If more than 7 days: flag it after warm re-entry and offer a fresh run. If 7 or fewer days: hold digest findings in context and surface relevant items naturally during the session.

7. Deliver warm re-entry (2-3 sentences max): what is in flight, anything time-sensitive, any open coaching priority. Then signal readiness."""


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        # No parseable payload — can't determine cwd, so can't confirm this
        # is a Kate project. Stay silent rather than risk bleed-over.
        return 0

    cwd = payload.get("cwd") or os.getcwd()

    if not os.path.isdir(os.path.join(cwd, "user")):
        return 0

    print(INSTRUCTIONS)
    return 0


if __name__ == "__main__":
    sys.exit(main())
