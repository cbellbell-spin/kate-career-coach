# Kate — plan.md, network.md, capability checklist, partial hook conversion

Status: planned, not started
Date: 2026-07-19
Source context: [Kate AI Coach](file:///Users/chrisbell/Library/Mobile%20Documents/com~apple~CloudDocs/Knowledge%20Base/Wiki/projects/Kate%20AI%20Coach.md) roadmap items 1-4 (from [dipanjan-kate-feedback-2026-07-16](file:///Users/chrisbell/Library/Mobile%20Documents/com~apple~CloudDocs/Knowledge%20Base/Wiki/sources/dipanjan-kate-feedback-2026-07-16.md)); hook-type distinction grounded in [Agentic Memory Architecture](file:///Users/chrisbell/Library/Mobile%20Documents/com~apple~CloudDocs/Knowledge%20Base/Wiki/concepts/Agentic%20Memory%20Architecture.md).

Model routing per phase follows `/Users/chrisbell/projects/docs/ai/routing/decisions.md` v1 (2026-06-23) — re-check that doc before delegating, it changes. Design/architecture decisions for all four features were made in conversation (this doc *is* the written plan), so no phase needs Opus 4.8 for architecture — implementation is "coding from a written plan" throughout.

Decisions locked in during planning (confirmed by Chris, 2026-07-19):
- Cowork's hook runtime executes real shell commands (`type: "command"`), not just prompt injection — the hook-conversion plan below assumes this holds; spike Phase 0a first if it turns out not to.
- `plan.md` is a separate file from `session_context.md`, not a merge or replacement.
- `network.md` is populated fully autonomously — no per-contact confirmation.
- The capability checklist is gap-triggered (auto-surfaces once per unresolved gap) plus available on demand.

---

## Phase 0 — independent quick wins

### 0a. PreToolUse protected-file hook: prompt → command

**Why:** currently the model is *asked* to check whether `user_profile.md` / `targeted_resume.docx` / `cover_letter.md` writes were confirmed — a compliant-but-careless model can skip the check. A command hook makes the block deterministic, independent of model behavior.

**Files touched:**
- New: `hooks/scripts/protect-files.sh`
- Edit: `hooks/hooks.json` (PreToolUse entry, `type: "prompt"` → `type: "command"`)

**Steps:**
1. Script pattern-matches the tool-call target path against the protected list.
2. If matched, script inspects the transcript (passed via stdin per Cowork's command-hook contract) for prior explicit user approval in this conversation.
3. No approval found → exit 2, block, return reason string. Approval found → exit 0, allow.

**Verify:** attempt a write to `user_profile.md` mid-session with no approval anywhere in the transcript; confirm hard block (not just a model self-check that could be skipped).

**Model:** Implementation → **MiniMax M3** (clearly scoped coding task, fallback Sonnet 4.6). Verification → **Haiku 4.5** (mechanical check of block/allow behavior against fixed test cases).

### 0b. Onboarding source-material ask + "notice later" via existing date field

**Why:** onboarding only asks for resume + LinkedIn today. No new state file needed for the "notice later" half — reuse `session_context.md`'s existing `Last session: [date]` field as the comparison point.

**Files touched:**
- Edit: `skills/kate-coach/references/flows.md` (onboarding flow — add `source_materials/` ask)
- Edit: `skills/kate-coach/SKILL.md` (Session Initialization — add mtime-diff check against `Last session` date)

**Steps:**
1. Onboarding flow: after resume/LinkedIn, explicitly ask for performance reviews, 360s, PRDs, strategy docs; explain why (sharper fit assessments, real evidence for interview stories).
2. SessionStart: if `source_materials/` exists, list files with mtime after `session_context.md`'s `Last session` date; flag any found during warm re-entry.

**Verify:** drop a file into `source_materials/` between two sessions; confirm Kate flags it unprompted at next SessionStart.

**Model:** Implementation → **MiniMax M3** (scoped prompt/flow editing, coding-adjacent). Verification → **Haiku 4.5**.

---

## Phase 1 — plan.md

**Why:** closes the "vanished commitment" gap Dipanjan hit — Kate's offers need a durable, re-read artifact, not just a single-session handoff field.

**Files touched:**
- New: `skills/kate-coach/references/templates/plan_template.md`
- New (created at onboarding, like other core files): `user/plan.md`
- Edit: `skills/kate-coach/SKILL.md` (file ownership table — autonomous write tier, same as `coaching_notes.md`; Session Initialization — read `plan.md` in full at SessionStart)
- New: `hooks/scripts/verify-writes.sh`
- Edit: `hooks/hooks.json` (Stop entry — keep existing prompt for content, add command-type verification gate)

**Schema (plan_template.md):**
- Standing goals
- Pending Commitments — each entry: what, source ("Kate offered X, 2026-07-19"), status
- Flagged Gaps — used by Phase 3's checklist to avoid re-surfacing resolved/seen gaps

**Steps:**
1. Template + onboarding folder creation.
2. SKILL.md integration (read at start, autonomous writes, referenced in warm re-entry).
3. Stop hook gate: script checks mtime of `session_context.md` (always required) and `plan.md` (required if it exists) against a 10-minute freshness window; blocks Stop otherwise.

**Implementation deviation (2026-07-19):** dropped the planned "escape valve for trivial sessions" in favor of requiring an unconditional re-touch of `plan.md` every session, even when nothing changed (a same-content rewrite plus a "Reviewed, no changes" Review Log line counts as valid). Rationale: an escape valve requires the model to self-report "nothing changed," which reintroduces exactly the compliance-dependent failure this hook exists to remove. Forcing the touch is what makes the *read-back* deterministic, not just the write.

**Known limit to carry forward, not solve here:** the gate verifies files were *touched*, not that the *correct* commitment was logged. True detection would require the hook to parse transcript content for offer-language — deferred.

**Verify:** Kate makes an offer, session ends without updating `plan.md` → Stop blocked. Trivial session with no new commitments, `plan.md` re-touched with a "Reviewed, no changes" Review Log line → Stop not blocked. Trivial session where `plan.md` is left untouched → Stop still blocked (this is the unconditional-touch behavior from the deviation above, not a bug).

**Model:** Implementation → **MiniMax M3** (implementation from a written plan; use case: "Spec-driven development / Implementation from a written plan → MiniMax M3"). Verification → **Haiku 4.5** ("Verification passes → Haiku 4.5").

---

## Phase 2 — network.md

**Why:** applications side already exists (`application_history.md`); the real gap is a networking/contacts ledger plus staleness surfacing.

**Files touched:**
- New: `skills/kate-coach/references/templates/network_template.md`
- New (created at onboarding): `user/network.md`
- Edit: `skills/kate-coach/SKILL.md` (file ownership — autonomous tier; extraction instructions)
- Edit: transcript-capture flow section in `flows.md` (log named contacts from call transcripts)
- Edit: SessionStart staleness check (add `Last Touch > 14 days` alongside existing `coaching_notes.md`/`application_history.md` checks)

**Schema (network_template.md):** Name | Company | Relationship | Last Touch | What's Owed | Next Action

**Verify:** mock post-interview debrief with a named interviewer → contact appears in `network.md` unprompted. Simulate 15+ days since last touch → surfaces at next warm re-entry.

**Model:** Implementation → **MiniMax M3** (implementation from written plan). Verification → **Haiku 4.5**.

---

## Phase 3 — capability checklist

**Why:** cheapest of the four, but sequenced last because it reads state produced by Phases 1 and 2 (`plan.md`'s Flagged Gaps section, `network.md` existence).

**Files touched:**
- Edit: `skills/kate-coach/SKILL.md` (SessionStart — compute checklist rows; gap-triggered surfacing logic)
- New: `commands/kate-status.md` + corresponding skill entry (on-demand checklist)
- Uses `plan.md`'s Flagged Gaps section (from Phase 1) as state — no new file.

**Checklist rows:** profile complete? `source_materials/` non-empty? `network.md`/`plan.md` exist? monitoring set up?

**Verify:** fresh project, no `source_materials/` — gap surfaces once at first session, does not repeat at second session; on-demand command shows it regardless of flagged state.

**Model:** Implementation → **MiniMax M3**. Verification → **Haiku 4.5**.

---

## Summary table

| Phase | Task | Implementation model | Verification model | Rule fired |
|---|---|---|---|---|
| 0a | PreToolUse → command hook | MiniMax M3 | Haiku 4.5 | Clearly scoped coding → M3; verification → Haiku |
| 0b | Onboarding ask + notice-later | MiniMax M3 | Haiku 4.5 | Clearly scoped coding → M3; verification → Haiku |
| 1 | plan.md + Stop gate | MiniMax M3 | Haiku 4.5 | Implementation from written plan → M3; verification → Haiku |
| 2 | network.md | MiniMax M3 | Haiku 4.5 | Implementation from written plan → M3; verification → Haiku |
| 3 | Capability checklist | MiniMax M3 | Haiku 4.5 | Implementation from written plan → M3; verification → Haiku |

No phase needs Opus 4.8 (design already resolved in planning conversation) or GPT-5.5 (no phase is an autonomous multi-step agentic loop navigating ambiguity without checkpoints — each phase has a defined scope and verify step). If MiniMax M3 output quality flags during implementation, fall back to Sonnet 4.6 per the routing doc's default fallback rule.
