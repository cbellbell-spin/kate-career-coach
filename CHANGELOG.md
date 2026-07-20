# Kate — Changelog

---

## v0.7.0 — 2026-07-19

### Deterministic write guarantee — plan.md

Added `user/plan.md`: standing goals, pending commitments (with source and status), and a Flagged Gaps section for the capability checklist below. Closes the "vanished commitment" gap — Kate previously had no durable record of things she offered to do, so an offer made in one session could disappear if never followed up on. A new command-type Stop hook (`hooks/scripts/verify-session-writes.py`) blocks session end unless `session_context.md` and, if it exists, `plan.md` were actually re-written this turn — not just promised by the prompt hook. `plan.md` must be re-touched every session, even with no content change, so the review itself is guaranteed, not just the write when something happens to change.

### Network ledger — network.md

Added `user/network.md`: a contacts ledger (name, company, relationship, last touch, what's owed, next action), populated autonomously from transcripts, debriefs, and conversation. Distinct from `monitoring/watchlist.md`'s Key People (news/signal tracking vs. relationship upkeep). Overdue follow-ups (14+ days with something outstanding) surface at session start alongside `plan.md`'s pending commitments.

### Capability checklist

New `/kate-status` command shows what's set up vs. untapped (profile, deep archive, network ledger, monitoring, interview prep). Two of the five rows — deep archive and monitoring — also surface automatically at session start, but only once per gap (tracked via `plan.md`'s Flagged Gaps), not every session.

### Deterministic protected-file gate

The PreToolUse protected-file check (user_profile.md, targeted resumes, cover letters) moved from a prompt-type hook — which only asked the model to check for prior approval — to a command-type hook (`hooks/scripts/protect-files.py`) that blocks the write independently of model behavior.

### HUD — rebuilt around a real, opt-in mechanism

The HUD Protocol previously described behavior the code didn't implement (claimed to auto-load `kate_state.json`; the HTML never fetched it). Rebuilt: the HUD is now opt-in (asked once during onboarding, `HUD:` field in `user_profile.md`), fully local, and Kate builds a `?s=<url-encoded-base64-state>` link rather than claiming auto-load. Verified in-browser, not just read as code — this also caught a real bug (un-encoded `+` in the base64 payload silently becomes a space and corrupts the decode) that's now called out explicitly in the protocol instructions.

Added a Networking zone to the HUD: contacts with an outstanding task by default, sorted by last touch, with a toggle to show every contact.

### Source-material onboarding ask

Onboarding now explicitly asks for the deep work archive (performance reviews, 360 feedback, PRDs, strategy docs), not just resume + LinkedIn. New material added later gets flagged once at the next session, using `session_context.md`'s existing `Last session` date rather than a separate tracking file.

### What changed
- `hooks/hooks.json` — protected-file check split into a command hook; Stop event gained a second command-hook write-verification gate
- `hooks/scripts/protect-files.py`, `hooks/scripts/verify-session-writes.py` — new
- `skills/kate-coach/references/templates/plan_template.md`, `network_template.md`, `kate_state_template.json` — new
- `skills/kate-coach/references/templates/kate-hud.html` — Networking zone, `network_contacts` rendering
- `skills/kate-coach/references/templates/user_profile_template.md` — `HUD:` preference field
- `skills/kate-coach/SKILL.md` — Network Capture section, Steps 2B/2C/5C/5D, rewritten HUD Protocol, plan.md review in Session Close Protocol
- `skills/kate-coach/references/flows.md` — onboarding Step 6B (HUD opt-in), source-material ask, Capability Checklist Flow, network ledger updates in Transcript Capture / Debrief flows
- `skills/resume-tailor/SKILL.md` — restored missing age-discrimination rules (years-of-experience, graduation-date omission) and fixed malformed frontmatter
- `commands/kate-status.md`, `skills/kate-status/SKILL.md` — new
- `.mcp.json` — Granola MCP server restored
- `.claude-plugin/plugin.json` — version 0.6.0 → 0.7.0

---

## v0.6.0 — 2026-06-30

### Hooks — Programmatic enforcement of critical session behaviors

Added `hooks/hooks.json` with three hooks that enforce behaviors previously relying on text instructions alone. These replace the highest-risk text-only patterns identified in an audit of the plugin.

**SessionStart hook (new)**
Fires at the beginning of every session and injects the full 7-step session initialization sequence as a guaranteed prompt before Kate responds to the user. Enforces: folder structure check (first-session detection), session_context.md read, file freshness checks on coaching_notes.md and application_history.md, monitoring digest staleness calculation, application history review, and warm re-entry. Previously these steps could be skipped if the user opened a session with a direct task request.

**Stop hook (new)**
Fires when the session ends and injects a blocking prompt requiring Kate to write both session_context.md and append to coaching_notes.md before the session closes. Uses the exact template format specified in the session close protocol. Previously, if a session ended abruptly or Kate drifted through a long session, the context handoff was silently lost.

**PreToolUse Write/Edit hook (new)**
Fires before every Write or Edit tool call and enforces two rules:
- *Protected file check*: blocks writes to user/user_profile.md, targeted resumes, and cover letters without explicit user confirmation found in the conversation
- *Fit assessment downstream actions*: when a fit_assessment.md is being written, injects a reminder to update application_history.md and check the CMF pattern trigger rule (3+ roles evaluated, 2+ Positioning Play or Uphill Battle)

### What changed
- `hooks/hooks.json` — new file
- `.claude-plugin/plugin.json` — version 0.5.0 → 0.6.0

---

# Kate — Changelog

---

## v0.5.0 — 2026-04-29

### Fit Assessment Architecture — Three-Tier Restructure

Fit assessment now produces three ordered sections instead of a single fit tier:

**Section 1: Candidate-Market Fit (CMF)**
Strategic read on whether the user's overall profile aligns with current market demand in their target space. Appears first — before role-specific analysis. Signal reads: Aligned / Partial Mismatch / Structural Gap. Includes 2-3 sentence diagnosis and, for Partial Mismatch or Structural Gap, 1-2 concrete improvement steps. CMF is maintained as a running strategic read and is NOT recalculated from scratch on every role.

**CMF Pattern Trigger Rule (new)**
If Kate evaluates 3+ roles in a session and 2+ are Positioning Play or Uphill Battle, she proactively surfaces a CMF flag — even without explicit user request. Phrased as an observation, not a judgment.

**Section 2: Role Qualification**
Keeps the three existing tiers (Strong Fit / Positioning Play / Uphill Battle) now explicitly framed as: "can you win this job?" Each tier has an explicit definition. Role Qualification is added to `ROLES_EVALUATED_THIS_SESSION` for CMF pattern tracking.

**Section 3: Personal Fit Assessment (new)**
Insight cards grounded in the Mnookin profile (when it exists) or best-available data (when it doesn't). Six mandatory card categories: Compensation alignment, Location/work model, Scope and level match, Culture fit, Career trajectory alignment, Must-have/must-not alignment. Graceful degradation: cards Kate can't assess are rendered in a "data needed" state with a specific prompt, not skipped or genericized.

**Proactive nudge rule (new)**
If Personal Fit Assessment is missing data for 2+ mandatory cards, Kate prompts: "I could give you a sharper read on personal fit if you build your profile first. Say 'Build My Profile' when you're ready, or give me the specific details now."

### New Skill: build-profile

Mnookin Two-Pager profile collection. Runs as a structured conversation (not a form), collecting eight dimensions one at a time with specificity probing: what you love doing, what you hate doing, must-haves, must-nots, short-term goal, long-term goal, core strengths, known weaknesses. Stored in session notes and referenced by name in all subsequent fit analysis. User can say "update my profile" to revise specific sections without rebuilding from scratch.

### New Skill: job-mission

Job Mission + OKRs for interview prep. Takes a job description and produces: Job Mission Statement ("This role exists to..."), 90-Day Priorities, and Year-1 OKRs (inferred, 2-3 Objectives with 2 Key Results each). Clearly labeled as Kate's inference, not ground truth. Offers to generate interview questions that probe actual hiring manager priorities. Triggered by "job mission", "mission and OKRs", or similar.

### Interview Prep — Conducting Interviews Reversal

Pre-Interview Prep Flow enhanced with "What the Interviewer Is Actually Watching For" — a section that flips the user into the hiring manager's perspective. Covers: depth over delivery (6-levels-deep expectation), PEARL over STAR (the epiphany as differentiator), the failure question, preparation as a signal, and the closing window. Connected to the specific role being prepared for, not delivered as generic advice.

### What changed

- `skills/kate-coach/references/flows.md` — Fit Assessment Flow restructured into three sections; CMF pattern trigger rule; Mnookin Profile Flow and Job Mission + OKRs Flow added; Pre-Interview Prep Flow enhanced with interviewer-watching-for section; Onboarding Step 6 template updated
- `skills/kate-coach/SKILL.md` — Fit tier definitions updated to new Role Qualification tiers; Fit Assessment Flow reference updated
- `skills/kate-coach/references/templates/user_profile_template.md` — MNOOKIN PROFILE section and Mnookin Profile subsection added
- `skills/build-profile/SKILL.md` — new skill
- `skills/job-mission/SKILL.md` — new skill
- `commands/build-profile.md` — new command
- `commands/job-mission.md` — new command
- `.claude-plugin/plugin.json` — version 0.4.3 → 0.5.0

---

## v0.4.3 — 2026-04-17

### Bug fix: resume-tailor skill added to plugin bundle

The `resume-tailor` skill was merged in v0.4.2 but was not included in the plugin archive. It is now bundled.

### Note on resume integrity rules

The integrity rules (Never fabricate, years-of-experience omission for 15+ year candidates, graduation date 15-year threshold, format preservation) are **not included in this plugin bundle**. They are available in the GitHub source under `skills/kate-coach/references/flows.md` and can be applied via post-install customization of the plugin.

### What changed
- `skills/resume-tailor/SKILL.md` — added to plugin bundle
- `.claude-plugin/plugin.json` — version 0.4.2 → 0.4.3

---

## v0.4.2 — 2026-04-15

### New skill: resume-tailor

A dedicated resume tailoring skill (`skills/resume-tailor/`) for standalone resume sessions outside of the full coaching workflow.

### Resume integrity rules

**Never fabricate (new)**
Kate will not generate resume content that implies experience, responsibilities, accomplishments, skills, or credentials the user has not documented.

**Years of experience — omit for senior candidates (new)**
For candidates with 15+ years of experience, Kate omits "X years of experience" phrases by default.

**Graduation dates — 15-year threshold (updated from 10 years)**
Graduation years are omitted from any degree awarded more than 15 years ago. The rule now applies per degree.

**Format preservation (new)**
Once a user has an established preferred resume format, Kate does not make structural or visual changes without explicit direction.

### User profile — RESUME PREFERENCES section (new)

`user_profile.md` now includes a RESUME PREFERENCES section tracking format preferences and user overrides.

### What changed
- `skills/resume-tailor/SKILL.md` — new file
- `skills/kate-coach/references/flows.md` — Resume Optimization Flow rules updated
- `skills/kate-coach/SKILL.md` — Detailed Flows section references resume-tailor skill
- `skills/kate-coach/references/templates/user_profile_template.md` — RESUME PREFERENCES section added
- `.claude-plugin/plugin.json` — version 0.3.2 → 0.4.0

---

## v0.3.1 — 2026-03-15

### Internal improvements

**Reduced context load**
Commands are now thin dispatchers. Each command file collects the context it needs, then defers entirely to `references/flows.md` for execution.

**flows.md read once per session, not per command**
Session initialization now reads `references/flows.md` at startup and holds it in context for the full session.

**Scheduled task prompt generated as a file**
`/setup-monitoring` generates `monitoring/scheduled_task_prompt.md` during setup — a standalone file that the scheduled task reads at runtime.

**Standing coaching rules trimmed**
Three rules in the coaching rule set were written at execution-instruction detail level — duplicating what flows.md already specifies. They are now principle statements.

### What changed
- All five command files — stripped restated flow steps, kept context-gathering
- `SKILL.md` — flows.md added to Session Init Step 1
- `commands/setup-monitoring.md` — embedded scheduled task prompt replaced with generated-file approach

---

## v0.3.0 — 2026-03-05

### New coaching capabilities

**Complement skill identification**
Kate identifies the specific capability each target organization lacks that the candidate uniquely brings.

**Non-negotiable difference**
Kate probes for the one thing a candidate's next role must have that their current one didn't.

**Show don't tell probe**
Kate identifies the company's 1-2 core challenges and asks whether the candidate has prior work that speaks directly to one of them.

### What changed
- `SKILL.md` — three new Standing Coaching Rules added
- `references/flows.md` — non-negotiable difference probe added to Onboarding Step 2; complement skill identification added to Fit Assessment Flow

---

## v0.2.2 — prior release

### Core capabilities

- **Onboarding**: Builds a complete user profile from resume and LinkedIn
- **Fit assessment** (`/fit-assessment`): Evaluates job descriptions against the user profile
- **Resume optimization**: Side-by-side resume editing with explicit justification
- **Interview prep** (`/interview-prep`): Structured prep brief covering multiple areas
- **Transcript capture**: Retrieves and files call transcripts via Granola integration
- **Post-interview debrief** (`/debrief`): Calibrated debrief with pattern tracking
- **Weekly monitoring** (`/setup-monitoring`, `/run-monitoring`): Scheduled background task
- **Session persistence**: Maintains context across sessions through structured files

### Standing coaching rules
Pattern recognition, evidence quality calibration, motivation alignment, motivation answers, builder vs. operator positioning, red flag management, honest signal standard.
