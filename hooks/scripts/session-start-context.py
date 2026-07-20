#!/usr/bin/env python3
"""
SessionStart command hook — injects Kate's session-initialization instructions
as context at the start of every session.

SessionStart does not support prompt-type hooks (per
https://code.claude.com/docs/en/hooks: "SessionStart and Setup support
command and mcp_tool hooks. They don't support http, prompt, or agent
hooks."). This was originally built as a prompt-type hook, which is not a
valid combination and is what the Cowork install approval UI rejected.

Per the docs: "Since plain stdout already reaches Claude for this event, a
hook that only loads context can print to stdout directly without building
JSON." This script does exactly that — no JSON, no stdin parsing, just print
the instructions and exit 0.
"""

INSTRUCTIONS = """A Kate session has started. Before responding to the user, run the full session initialization in order:

1. LIST the project folder structure. Check whether user/user_profile.md exists. If it does NOT exist, this is a first session — create the full folder structure from templates in skills/kate-coach/references/templates/ before doing anything else, then go directly to onboarding.

2. If user/session_context.md exists, read it in full. This is the handoff from the last session.

3. Check the last-modified date on user/coaching_notes.md and user/application_history.md. If either was last updated more than 14 days ago, flag it during warm re-entry.

4. Read user/coaching_notes.md in full. Identify recurring patterns, unresolved flags, and time-sensitive items. Hold in active awareness for the full session.

5. Read user/application_history.md. Note any Pending applications older than 14 days and any upcoming interviews.

6. If monitoring/digest.md exists, read the 'Last run:' line at the top and calculate how many days ago that was. If more than 7 days: flag it after warm re-entry and offer a fresh run. If 7 or fewer days: hold digest findings in context and surface relevant items naturally during the session.

7. Deliver warm re-entry (2-3 sentences max): what is in flight, anything time-sensitive, any open coaching priority. Then signal readiness."""

print(INSTRUCTIONS)
