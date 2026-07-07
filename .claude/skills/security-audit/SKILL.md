---
description: Scan code for security vulnerabilities — hardcoded secrets, injection risks, config leaks, and more
argument-hint: "[file or folder path — leave empty to scan the entire project]"
allowed-tools: Read(*) Glob(*) Grep(*) Bash(git *)
---

Perform a security audit on the target file, folder, or entire project. Report every finding with a severity level, the exact file and line, the risk, and a fix.

## What to scan

- If `$ARGUMENTS` is given: scan that specific file or folder
- If `$ARGUMENTS` is empty: scan the entire project (`backend/`, `frontend/src/`, config files, and any `.env` files)

---

## Check 1: Hardcoded Sensitive Information

Search for secrets that should never be in source code.

**Look for:**

| Pattern | Examples |
|---|---|
| API keys & tokens | `apiKey`, `api_key`, `token`, `secret`, `password`, `passwd` |
| Private keys | `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN EC PRIVATE KEY-----` |
| Connection strings | `jdbc:`, `mongodb+srv://`, `postgres://`, `mysql://` with credentials |
| OAuth secrets | `client_secret`, `clientSecret` |
| Hardcoded passwords | Any string like `"admin123"`, `"password"` next to auth logic |
| Webhook URLs | Discord/Slack webhook URLs in source code |

**For each finding:** Copy the exact line. If it's a real secret (not a placeholder), mark it **CRITICAL**.

**Note:** Placeholders like `"YOUR_API_KEY"`, `"changeme"`, or `process.env.X` are fine — skip those.

## Check 2: Injection Vulnerabilities

Check for code patterns that allow untrusted input to execute commands or queries.

**SQL Injection:**
- In Python: raw SQL strings built with f-strings or string concatenation using user input
- In TypeScript: API calls using template literals with unsanitized variables
- Flag any query that concatenates user input instead of using parameterized queries

**Command Injection:**
- Python: `os.system()`, `subprocess.call()`, `subprocess.Popen()` using user-supplied strings
- Any `exec()`, `eval()`, `spawn()` calls with concatenated input

**Path Traversal:**
- File operations using user input without path sanitization
- `../` sequences not being filtered

**For each finding:** Explain how an attacker could exploit it and show the safe alternative.

## Check 3: Configuration File Leaks

Review all config files for exposed secrets in plaintext.

**Files to check:**
- `.env`, `.env.example`, `docker-compose.yml`, `Dockerfile*`
- `backend/app/config.py`, `vite.config.ts`, `package.json`
- `settings.json`, `settings.local.json` (`.claude/` folder)
- `nginx.conf`, CI/CD files if any

**What to flag:**
- Any real email address, password, API key, or token
- Database credentials in plaintext
- Cloud service credentials (AWS, Azure, GCP keys)
- Private IP addresses or internal hostnames (low severity)

**Skip:** `.gitignore`-protected files that are clearly meant for local development (but note if they exist and contain secrets).

## Check 4: Other Security Risks

A broader sweep for common vulnerabilities:

**Unsafe JavaScript/TypeScript patterns:**
- `eval()`, `new Function()`, `innerHTML` with user input — **HIGH**
- `dangerouslySetInnerHTML` in React without sanitization — **HIGH**
- `Math.random()` used for anything security-related (use `crypto.randomUUID()`) — **MEDIUM**
- `localStorage` or `sessionStorage` storing sensitive data — **MEDIUM**

**Unsafe Python patterns:**
- `eval()`, `exec()` with user input — **HIGH**
- `pickle.load()` with untrusted data — **HIGH**
- Hardcoded `SECRET_KEY` in config defaults — **HIGH**
- Debug mode enabled in production — **MEDIUM**

**Dependency risks:**
- Check `backend/requirements.txt` and `frontend/package.json` for known vulnerable packages
- Dependencies from non-official sources or git URLs — **MEDIUM**

**CORS/CSP configuration:**
- Missing or permissive CORS settings in `main.py` — **MEDIUM**
- `allow_origins=["*"]` in production — **HIGH**

**Debug/development code in production:**
- `console.log` with sensitive data — **LOW**
- Debug endpoints or dev-only features visible in production code — **MEDIUM**

---

## Report Format

```
🔒 Security Audit: [target]
══════════════════════════════════════════════════

🚨 CRITICAL (fix immediately)
  src/utils/api.ts:12 — Hardcoded API key:
    const API_KEY = "sk-live-abc123..."
  → Move to environment variable: process.env.API_KEY

⚠️  HIGH (fix before next release)
  src/components/Comment.tsx:45 — dangerouslySetInnerHTML without sanitization
  → Use DOMPurify to sanitize HTML before rendering

⚡ MEDIUM (fix soon)
  backend/app/services/db.py:78 — SQL built with f-string + user input
  → Use parameterized query

💡 LOW (consider improving)
  src/utils/random.ts:23 — Math.random() used for ID generation
  → Use crypto.randomUUID() for unpredictable IDs

══════════════════════════════════════════════════
📊 Summary
  CRITICAL: 1   HIGH: 1   MEDIUM: 1   LOW: 1
  Total issues: 4
```

- If zero issues found, state that clearly: "✅ No security issues found."
- For each issue include: file path, line number, the problematic code snippet, why it's risky, and how to fix it.
