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