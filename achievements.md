# Attrition Achievements Log

## 2025-09-02 - Cline Dev
Core systems are stabilizing with idempotent queues across structures, defenses, units, and research; energy and capacity parity via shared helpers; and a Base Events Summary surfacing per‑base construction queues and research timers. The interactive universe map and compact UI table standards are in place, with focused unit/E2E tests validating energy gating, ETA parity, idempotency, and map click parity—establishing a solid foundation for upcoming UX polish and gameplay tuning.

## 2025-09-05 - Cline Dev
Implemented desktop cache version checking and targeted invalidation: on bootstrap, the Electron main process compares the stored bootstrap_version with the incoming version and clears only versioned caches (catalogs, profile) on mismatch while preserving event queues. Added structured logs and a perf metric (“cache_invalidate”), extended tests, and updated Phase 4 documentation for security/data integrity.
