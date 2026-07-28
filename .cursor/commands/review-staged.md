# /review-staged

Review git staged changes in this repository before commit.

## Steps

1. **Get staged diff**
   ```bash
   git diff --staged --stat
   git diff --staged
   ```

2. **If nothing staged** — Tell the user no files are staged and suggest `git add <files>`.

3. **For each staged file**
   - Read the full diff
   - Check for bugs, logic errors, missing error handling
   - Check security: secrets in code, auth bypass, SQL injection, missing `verifyToken` on protected routes
   - Verify conventions from `AGENTS.md`: `dbWrapper` usage, ESLint style, no hardcoded secrets

4. **Run lint** (if staged files are JS in this repo)
   ```bash
   pnpm lint
   ```
   Report any new lint errors introduced by the staged changes.

5. **Cross-repo impact** — If changes affect API routes, request/response shapes, or auth, flag whether the frontend at `C:\sai\trade-dashboard-nk` needs matching updates.

6. **Deeper review** — If findings are complex, suggest `/review-bugbot` or `/review-security`.

## Output format

### Summary
(1–2 sentences on what the staged changes do)

### Files changed
(List with brief description per file)

### Positive observations
(What looks good)

### Concerns
(Potential issues, non-blocking)

### Blockers
(Must-fix before commit)

### Suggested fixes
(Concrete actions for each concern/blocker)

### Lint
(Pass / Fail — with details if fail)
