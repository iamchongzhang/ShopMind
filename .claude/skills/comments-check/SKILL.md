---
description: Check code comments for coverage, accuracy, and beginner-friendliness
argument-hint: "[file path — which file to check?]"
allowed-tools: Read(*) Glob(*) Grep(*)
---

Review comments in the target file against three quality rules. Report every issue with a specific line number and a clear explanation.

## Rule 1: Comment Coverage (30% target)

Every function and every important core line needs a comment. The target ratio is roughly **3 comment lines for every 10 lines of code**.

**What to check:**

1. **Every function must have a docstring or header comment** that explains:
   - What the function does (in plain English)
   - What each parameter means
   - What it returns

2. **Important or complex lines must have inline comments.** Flag lines that do something non-obvious without a comment explaining why. Examples of "important" lines:
   - Complex calculations or data transformations
   - Conditional logic that isn't self-explanatory
   - Error handling branches
   - Lines that interact with external systems (database, API, file system)
   - State changes or side effects

3. **Count the ratio.** Estimate: if a file has roughly fewer than 2 comment lines per 10 total lines, flag it as under-commented.

**What NOT to flag:**
- Simple variable declarations (`const name = 'John'`)
- Obvious return statements (`return result`)
- Import statements
- Closing brackets and boilerplate

## Rule 2: Comment Accuracy

Each comment must describe what the code **actually** does — not what the author intended or hoped for.

**What to check:**

1. Read the comment, then read the code it describes. Do they match?
2. Flag comments that:
   - Describe behavior that the code doesn't implement
   - Are outdated (describe old behavior, not current)
   - Are vague to the point of being useless (e.g. `// handle it`)
   - Say the opposite of what the code does
   - Mention parameters or variables that don't exist anymore

## Rule 3: Beginner-Friendliness

Comments should be understandable by someone learning to code.

**What to check:**

1. **No unexplained jargon.** Flag comments using technical terms without explanation (e.g. `// Debounces the input` with no explanation of what "debounce" means).

2. **No assumed knowledge.** Flag comments that assume the reader knows project-specific conventions or advanced patterns.

3. **Good example:** `// Wait 300ms after the user stops typing before searching (prevents calling the API on every keystroke)` — explains what AND why.

4. **Bad example:** `// Debounce 300ms` — assumes the reader knows what debouncing is.

## Report Format

After reviewing the file, present findings in three sections:

```
📝 Comments Check: path/to/file.py
═══════════════════════════════════════

🔴 Coverage Issues (X found)
  Line 42 — Function "process_document" has no comment explaining its parameters
  Line 58 — Complex regex pattern has no inline comment
  → Overall ratio: ~1:10 (needs more comments)

🔴 Accuracy Issues (X found)
  Line 35 — Comment says "returns a dict" but code returns an object
  Line 72 — Comment mentions "user_id" param which no longer exists

🔴 Beginner-Friendliness Issues (X found)
  Line 18 — Uses jargon "MMR" without explanation
  Line 53 — "LCEL chain" — unclear what LCEL means

✅ Summary
  Coverage:  ████░░░░░░  4/10 (needs work)
  Accuracy:  ██████████  10/10 (all comments match code)
  Beginner:  ██████░░░░  6/10 (some jargon to explain)
```

## If no file is provided

Ask the user which file they want to check. Suggest checking files that were recently modified or files with few comments.
