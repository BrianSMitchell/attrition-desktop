---
description: Standard practice for using existing test accounts during development and testing. Avoids unnecessary registrations and ensures consistent test coverage.
author: Cline
version: 1.2
tags: ["auth", "login", "testing", "workflow", "credentials"]
globs: ["packages/client/src/components/auth/**/*.tsx", "packages/client/src/stores/authStore.ts", "packages/server/src/routes/auth.ts"]
---

# Test Login Credentials Usage Rule

## Objective
Use a stable, pre-existing test account for all local development, debugging, and end-to-end validation to prevent duplicate users and keep test data consistent.

## Primary Test Account (do not store passwords here)
- Email: **test@test.com**
- Note: Do not store passwords in the repository. During Phase 6, the password used ("summer22") was provided out-of-band and must never be committed.

Secondary accounts discovered (do not store passwords):
- Email: calmncollect@proton.me (username: calmncollect)
- Email: klipche@gmail.com (username: klipche)

Passwords are intentionally not stored in the repository. If a password is needed, request it from the owner or use a private vault.

## Verification Workflow
1. Confirm the account exists in the DB:
   - Command:  
     `npx --yes ts-node packages/server/src/scripts/listUsers.ts`
   - Script path: `packages/server/src/scripts/listUsers.ts`
2. If the account is present:
   - Use the known test password from the owner/vault to login.
3. If the account is missing or password is unknown:
   - Do NOT create a new account without explicit request.
   - Ask for the test account password or for approval to create a temporary account.

## Client Behavior
- Login form: use the Primary Test Account email/username.
- Avoid registering new accounts unless the task explicitly requires it.

## Server Considerations
- No code changes needed in `routes/auth.ts` to follow this rule.
- Keep DB stable for repeatable tests.
- If DB was recently cleaned, re-confirm availability with the `listUsers` script.

## E2E / Playwright Usage

- Use the Primary Test Account for browser automation (do not create ad hoc users).
- Provide the test password via an environment secret (never commit credentials):
  - Recommended env var name: `TEST_PASSWORD`
  - In Playwright tests, reference with `process.env.TEST_PASSWORD`
- CI setup: inject `TEST_PASSWORD` using your CI secrets manager; do not echo to logs.
- If the account is missing in a fresh DB:
  - Run the verification workflow (list users) and request re-seeding or temporary access from the owner.
  - Do not register a new user in automated E2E unless explicitly approved.
- Example (Playwright snippet):
  ```ts
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD!);
  await page.click('button:has-text("Login")');
  ```

## Rationale
- Prevents noisy test data and user duplication.
- Keeps test scenarios consistent across sessions.
- Speeds up reproducibility of issues and validations.

## Notes
- This rule is non-secret and can be committed.
- Passwords must remain outside the repo (owner-provided or secure vault).
- For browser automation or QA scripts, programmatically use the Primary Test Account once the password is available via secure channel.
