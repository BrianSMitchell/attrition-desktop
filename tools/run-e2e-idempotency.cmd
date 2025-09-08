@echo off
REM Set credentials for this run only (do not persist)
set "TEST_EMAIL=test@test.com"
set "TEST_PASSWORD=summer22"

REM Run just the two idempotency specs
npx playwright test e2e/idempotency.structures.spec.ts e2e/idempotency.research.spec.ts
