---
description: Quality-gated git commit — runs tests and quality checks before committing. Use instead of raw git commit.
argument-hint: "[commit message — what did you change?]"
allowed-tools: Agent, Bash(git *), Bash(gh *)
---

Commit code safely by running unit tests and quality checks BEFORE the commit goes through. If anything fails, the commit is rejected.

## Step-by-step flow

### 1. Check the current state

```bash
git status
git branch --show-current
```

If there are no changes to commit, stop and tell the user. If on `main`, warn the user — it is safer to work on a feature branch.

If `$ARGUMENTS` is empty, ask the user for a commit message. Do not proceed without one.

### 2. Run quality checks (in parallel)

Spawn BOTH agents at the same time so they run concurrently:

- `tester` — runs all unit tests. Prompt: "Run all existing unit tests and report the results. Do not write new tests — just run what exists."
- `quality-engineer` — reviews code quality. Prompt: "Review the quality of recently modified files (use git diff --name-only to find them). Check security, comments, error handling, and code simplicity."

Wait for both agents to complete before moving to step 3.

### 3. Check the verdicts

Each agent's response ends with a `VERDICT:` line. Parse both:

| Tester | Quality-Engineer | Action |
|---|---|---|
| `VERDICT: PASS` | `VERDICT: PASS` | ✅ Commit |
| `VERDICT: FAIL` | `VERDICT: PASS` | ❌ Reject |
| `VERDICT: PASS` | `VERDICT: FAIL` | ❌ Reject |
| `VERDICT: FAIL` | `VERDICT: FAIL` | ❌ Reject |

### 4a. If both pass: commit

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Quality Gate PASSED
   Tests:     ✅ All passing
   Quality:   ✅ No critical or high issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then run:

```bash
git add -A
git commit -m "$ARGUMENTS"
git push
```

### 4b. If either fails: reject

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Quality Gate FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Report which check failed and why. Tell the user what needs to be fixed. The commit was NOT made — no changes were pushed.

**Important:** Do NOT run any git commands if the quality gate fails.
