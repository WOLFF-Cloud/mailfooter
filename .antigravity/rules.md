# Autonomous Multi-Device Git Sync Workflow Rules

These rules govern the autonomous sync behavior across devices for this project.

## 🔄 Session Start / Catch-Up Trigger
**Triggers**: "sync and catch me up", starting a session, "sync code", "pull latest".

**Execution Protocol**:
1. **Pull Latest Changes**:
   - Run `git pull origin main` (or `git pull`) silently.
2. **Inspect Context**:
   - Run `git log -n 5 --oneline` to review recent commit history.
   - Read `PROJECT_STATUS.md` to get current project status, tech debt, and immediate roadmap.
3. **Status Briefing**:
   - Present a concise summary to the user detailing:
     - Recent commits/pulls pulled from remote.
     - Current state of the project based on `PROJECT_STATUS.md`.
     - Recommended next steps or pending tasks.

---

## 💾 Session End / Wrap-Up Trigger
**Triggers**: "save and sync everything", wrap up, "commit and push", "sync and save", end session.

**Execution Protocol**:
1. **Update Documentation**:
   - Review all work completed during the session.
   - Update `PROJECT_STATUS.md` under **Current Status** and **Next Steps** to reflect completed work and future roadmap.
2. **Stage & Commit**:
   - Check status with `git status`.
   - Stage all relevant changes: `git add .`
   - Create a clear, conventional commit message detailing work accomplished (e.g., `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`).
3. **Push to Remote**:
   - Execute `git push origin main` (or `git push`).
4. **Confirmation**:
   - Brief the user with a confirmation of pushed commits and updated status.
