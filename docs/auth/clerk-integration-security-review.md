# Security Review: Clerk Integration Plan

Date: 2026-03-04
Target: `docs/auth/clerk-integration-plan.md`
Reviewer mode: security best-practices review (frontend React/TypeScript + backend API patterns)

## Executive Summary

The plan is strong on core authentication and ownership scoping, but it has several security gaps that should be addressed before implementation starts. The highest-risk issues are missing upload abuse controls and a risky trust assumption around internal functions. There are also privacy and origin-validation hardening gaps that can lead to data-retention and origin-bypass problems if implemented loosely.

## Findings

### SEC-001
- Severity: High
- Rule ID: EXPRESS-UPLOAD-001 / DoS hardening baseline
- Location: `docs/auth/clerk-integration-plan.md:207`, `docs/auth/clerk-integration-plan.md:214`
- Evidence:
  - Upload action requires auth and CORS checks, but no explicit constraints for file size, file type allowlist, content-type verification, upload count/rate limits, or malware scanning/quarantine.
- Impact:
  - Authenticated attackers can still abuse storage and compute with oversized or malicious files, causing cost spikes, degradation, or unsafe file handling paths downstream.
- Fix:
  - Add explicit upload policy requirements: max file size, MIME+magic-byte validation, allowed extensions, per-user rate limits/quotas, and safe storage/serving rules.
- Mitigation:
  - Add monitoring/alerts on upload volume and storage growth; enforce conservative defaults in all environments.
- False positive notes:
  - If these controls are already enforced elsewhere, document that dependency in this plan.

### SEC-002
- Severity: High
- Rule ID: REACT-AUTHZ-001 / server-side authz must not rely on path assumptions
- Location: `docs/auth/clerk-integration-plan.md:204`, `docs/auth/clerk-integration-plan.md:205`
- Evidence:
  - The plan states internal message-listing can remain internal “if threadId is only obtained via owned thread paths.”
- Impact:
  - This is a confused-deputy risk: if any future internal caller passes an untrusted or cross-user `threadId`, internal functions can leak data without direct ownership checks.
- Fix:
  - Require explicit ownership checks in all internal read paths too, or require `userId` in internal function signatures and assert thread ownership at function boundary.
- Mitigation:
  - Add tests for cross-user misuse through internal call chains, not just public endpoints.
- False positive notes:
  - Risk is lower if all internal entrypoints are provably constrained today, but this is brittle over time.

### SEC-003
- Severity: Medium
- Rule ID: Data lifecycle/privacy completeness
- Location: `docs/auth/clerk-integration-plan.md:97`, `docs/auth/clerk-integration-plan.md:307`, `docs/auth/clerk-integration-plan.md:312`
- Evidence:
  - Webhook-based deletion for `user.deleted` is deferred to follow-up while the plan acknowledges direct Clerk deletion leaves Convex data behind.
- Impact:
  - User data can persist after account deletion, creating privacy/compliance exposure and potential trust issues.
- Fix:
  - Move `user.deleted` webhook handling into the implementation MVP (same milestone as account deletion mutation), with retries/idempotency.
- Mitigation:
  - Add periodic orphaned-data cleanup job keyed by missing Clerk users until webhook path is live.
- False positive notes:
  - Lower risk if Clerk hosted UI deletion is fully disabled until webhook cleanup exists.

### SEC-004
- Severity: Medium
- Rule ID: CORS-001 / origin allowlist precision
- Location: `docs/auth/clerk-integration-plan.md:210`, `docs/auth/clerk-integration-plan.md:212`, `docs/auth/clerk-integration-plan.md:317`
- Evidence:
  - Plan allows broad patterns (`http://localhost:*`, `https://*.netlify.app`) without defining strict canonicalization and exact-match logic.
- Impact:
  - Naive wildcard/regex matching can permit unintended origins, weakening cross-origin protections for upload endpoints.
- Fix:
  - Define exact CORS matching strategy: parse `Origin`, normalize, then compare against explicit allowlist entries per environment (and exact preview domain list where feasible).
- Mitigation:
  - Log rejected origins and alert on unusual accepted origins to catch misconfiguration early.
- False positive notes:
  - Risk depends on implementation quality; this finding is preventative and should be resolved in the plan.

## Positive Security Coverage Already Present

- Default-deny auth posture across app routes (`docs/auth/clerk-integration-plan.md:14`, `docs/auth/clerk-integration-plan.md:70`).
- Strong per-user ownership model and index-first query strategy (`docs/auth/clerk-integration-plan.md:82`, `docs/auth/clerk-integration-plan.md:83`, `docs/auth/clerk-integration-plan.md:84`).
- Explicit authorization test requirements across unauthenticated and cross-user scenarios (`docs/auth/clerk-integration-plan.md:20`, `docs/auth/clerk-integration-plan.md:90`).

## Recommended Next Actions

1. Update the plan to include upload security controls as hard requirements (size/type/rate/quotas/serving policy).
2. Remove “trusted path” assumptions for internal functions; require ownership checks in internal call boundaries.
3. Promote Clerk `user.deleted` webhook cleanup into initial delivery scope.
4. Specify exact CORS allowlist algorithm and environment-specific origin inventory.
