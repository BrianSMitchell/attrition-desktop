---
description: Guidelines for proper PowerShell command syntax to prevent Unix-style command chaining errors in Windows development environments
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["powershell", "windows", "command-syntax", "development-environment", "error-prevention"]
globs: ["*"]
---

# PowerShell Command Syntax Guidelines

## Overview

This rule addresses recurring PowerShell syntax errors, specifically the incorrect use of Unix-style command chaining (`&&`) in Windows PowerShell environments. PowerShell has different syntax requirements that must be followed to prevent command execution failures.

## Critical PowerShell Syntax Rules

### ❌ NEVER Use Unix-Style Command Chaining

**FORBIDDEN PATTERNS:**
```powershell
# ❌ NEVER USE - Will fail in PowerShell
cd packages\client && npm run build
mkdir packages\client packages\server
cd directory && command
```

**Why These Fail:**
- PowerShell doesn't support `&&` for command chaining
- Multiple arguments to `mkdir` don't work the same way as Unix
- Command chaining syntax is fundamentally different

### ✅ ALWAYS Use Sequential Commands

**CORRECT PATTERNS:**
```powershell
# ✅ CORRECT - Sequential commands
cd packages\client
npm run build

# ✅ CORRECT - Individual directory creation
mkdir packages\client
mkdir packages\server

# ✅ CORRECT - Separate command execution
cd directory
command
```

## Specific Command Patterns

### Directory Operations

**❌ INCORRECT:**
```powershell
mkdir packages\client packages\server
cd packages\client && npm install
```

**✅ CORRECT:**
```powershell
mkdir packages\client
mkdir packages\server
cd packages\client
npm install
```

### Build and Development Commands

**❌ INCORRECT:**
```powershell
cd packages\shared && npm run build
pnpm --filter @app/shared build && pnpm --filter @app/client dev
```

**✅ CORRECT:**
```powershell
cd packages\shared
npm run build

# Or use individual commands:
pnpm --filter @app/shared build
pnpm --filter @app/client dev
```

### Package Management

**❌ INCORRECT:**
```powershell
cd packages\client && pnpm install && pnpm dev
```

**✅ CORRECT:**
```powershell
cd packages\client
pnpm install
pnpm dev
```

## PowerShell-Specific Alternatives

### Conditional Execution

**PowerShell Equivalent of `&&`:**
```powershell
# Instead of: command1 && command2
# Use:
if ($LASTEXITCODE -eq 0) {
    command2
}

# Or for simple cases:
command1; if ($?) { command2 }
```

### Multiple Commands in One Line

**PowerShell Semicolon Syntax:**
```powershell
# ✅ CORRECT - Use semicolons for simple command sequences
cd packages\client; npm run build; cd ..
```

**Note:** Semicolons don't provide conditional execution like `&&`

### Environment variables for one‑liners (Playwright and test credentials)

When invoking Playwright (or other tools) with test credentials in a single PowerShell line, set environment variables inline with `$env:` and then run the command. Do not use `&&`.

```powershell
# ✅ CORRECT (PowerShell-safe): set env vars and run Playwright
$env:TEST_EMAIL="test@test.com"; $env:TEST_PASSWORD="•••"; pnpm exec playwright test e2e/energy.gating.spec.ts
```

Notes:
- Replace `•••` with the out-of-band password per `.clinerules/login-credentials-usage.md`. Never commit credentials to the repository or logs.
- This pattern is the Windows PowerShell equivalent of Unix `VAR=... VAR=... cmd`.
- See `.clinerules/end-to-end-testing-protocol.md` for additional E2E guidance, and `.clinerules/login-credentials-usage.md` for the canonical test account.

### Passing arguments through PNPM scripts (PowerShell)

When forwarding flags to the underlying Node script via PNPM, append `--` after the script name, then your flags.

Examples:
```powershell
# Pass --content to the underlying supermemory ingest script
$env:SUPERMEMORY_API_KEY="…"; pnpm run supermemory:add -- --content "[Tag] your nugget"

# Pass --q and --topK to search
$env:SUPERMEMORY_API_KEY="…"; pnpm run supermemory:search -- --q "energy gating log" --topK 5

# Run the refactor ingestion tool in dry-run (default) and live modes
node tools/supermemory-ingest-refactor.mjs --dry-run
$env:SUPERMEMORY_API_KEY="…"; pnpm run supermemory:ingest:audit  # (uses --live)
```

Notes:
- The Supermemory ingestion tool defaults to dry-run; use `--live` (or the `supermemory:ingest:audit` script) for actual POSTs.
- Keep secrets in environment variables; never commit them.

### Error Handling

**PowerShell Error Handling:**
```powershell
# ✅ CORRECT - Proper error handling
try {
    cd packages\client
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
} catch {
    Write-Error "Command sequence failed: $_"
}
```

## Multi-target File Removal Patterns (Windows PowerShell)

When removing multiple files or performing idempotent cleanup, do not use `if exist` or Unix `&&`. Use a robust loop with `Test-Path` and `Remove-Item`:

```powershell
# Idempotent multi-target deletion
$targets = @(
  'packages\shared\src\astro.ts',
  'packages\client\src\components\game\map\starTypes.ts'
)
foreach ($t in $targets) {
  if (Test-Path $t) {
    Remove-Item -LiteralPath $t -Force -ErrorAction SilentlyContinue
    Write-Host "Deleted $t"
  } else {
    Write-Host "Not found: $t"
  }
}
```

Notes:
- Prefer `Test-Path` + `Remove-Item` loops over `if exist` (cmd.exe) or `&&` (Unix shells).
- For cross-platform workflows, consider adding a package.json script that uses Node/TS logic to perform deletion, or guard Task scripts per-platform.

## Cross-Platform Considerations

### NPM/PNPM Scripts

**Use package.json scripts for cross-platform compatibility:**
```json
{
  "scripts": {
    "build:shared": "cd packages/shared && npm run build",
    "build:all": "npm run build:shared && npm run build:client"
  }
}
```

**Then execute:**
```powershell
# ✅ CORRECT - Works on all platforms
npm run build:all
```

### Path Separators

**PowerShell Path Handling:**
```powershell
# ✅ CORRECT - PowerShell handles both
cd packages\client
cd packages/client  # Also works

# ✅ BEST PRACTICE - Use backslashes in PowerShell
cd packages\client
```

## Development Workflow Patterns

### Monorepo Development

**❌ INCORRECT:**
```powershell
cd packages\shared && pnpm build && cd ..\client && pnpm dev
```

**✅ CORRECT:**
```powershell
# Sequential approach:
cd packages\shared
pnpm build
cd ..\client
pnpm dev

# Or use workspace commands:
pnpm --filter @app/shared build
pnpm --filter @app/client dev
```

### Testing and Building

**❌ INCORRECT:**
```powershell
pnpm test && pnpm build && pnpm start
```

**✅ CORRECT:**
```powershell
pnpm test
if ($LASTEXITCODE -eq 0) {
    pnpm build
    if ($LASTEXITCODE -eq 0) {
        pnpm start
    }
}
```

## Error Prevention Checklist

Before executing commands in PowerShell, verify:

- [ ] No `&&` operators used for command chaining
- [ ] Each command is on a separate line or properly separated
- [ ] Directory creation uses individual `mkdir` commands
- [ ] Path separators are appropriate for Windows
- [ ] Error handling is implemented if conditional execution is needed

## Common Mistake Patterns to Avoid

### 1. Build Order Dependencies
**❌ INCORRECT:**
```powershell
pnpm --filter @app/shared build && pnpm --filter @app/client build
```

**✅ CORRECT:**
```powershell
pnpm --filter @app/shared build
pnpm --filter @app/client build
```

### 2. Environment Setup
**❌ INCORRECT:**
```powershell
mkdir project && cd project && npm init
```

**✅ CORRECT:**
```powershell
mkdir project
cd project
npm init
```

### 3. Development Server Management
**❌ INCORRECT:**
```powershell
cd packages\server && npm run dev && cd ..\client && npm run dev
```

**✅ CORRECT:**
```powershell
# Use concurrently or separate terminals:
pnpm dev  # If configured with concurrently

# Or separate terminals:
# Terminal 1:
cd packages\server
npm run dev

# Terminal 2:
cd packages\client
npm run dev
```

## Success Metrics

Successful PowerShell command execution should achieve:
- ✅ No command chaining syntax errors
- ✅ Proper sequential command execution
- ✅ Appropriate error handling for critical operations
- ✅ Cross-platform compatibility through package.json scripts
- ✅ Clear and readable command sequences

## Integration with Development Tools

### VSCode Terminal
- Use PowerShell as default terminal in Windows
- Configure proper execution policies if needed
- Use integrated terminal for consistent environment

### Package Managers
- Prefer PNPM workspace commands over manual directory navigation
- Use package.json scripts for complex command sequences
- Implement proper build order dependencies

This rule ensures consistent and error-free command execution in PowerShell environments, preventing the recurring syntax errors that have been observed in development workflows.
