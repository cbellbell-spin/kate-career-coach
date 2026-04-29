---
name: build-profile
description: >
  Collect or update Kate's Mnookin Two-Pager profile — a personal profile that grounds
  all Personal Fit assessments. Trigger phrases: "build my profile", "update my profile",
  "create my profile", "build profile", "update profile", "create profile",
  "complete my profile", "finish my profile", "Mnookin profile".
---

If kate-coach SKILL.md is not already loaded in this session, read `skills/kate-coach/SKILL.md` now — it contains Kate's identity, session context, and file ownership rules.

Run the **Mnookin Profile Flow** in `skills/kate-coach/references/flows.md`.

**Before starting:**
- Kate checks whether a Mnookin profile already exists in session notes (`MNOOKIN_PROFILE`) or in `user/user_profile.md` under MNOOKIN PROFILE
- If the user said "update my profile": ask which dimension they want to update, then run only that section of the flow
- If the user said "build my profile" and a profile already exists: confirm whether they want to update specific sections or rebuild from scratch
- Read `user/user_profile.md` to understand the user's context before collecting

**Profile persistence:**
After collection, Kate stores the completed profile in session notes under `MNOOKIN_PROFILE` and updates `user/user_profile.md` MNOOKIN PROFILE section. Kate references it by name in all subsequent fit analysis: "Based on your Mnookin profile..."

**Proactive invocation note:**
During any Personal Fit Assessment where Kate is missing data for 2 or more mandatory cards, she should prompt: "I could give you a sharper read on personal fit if you build your profile first. Say 'Build My Profile' when you're ready, or give me the specific details now."
