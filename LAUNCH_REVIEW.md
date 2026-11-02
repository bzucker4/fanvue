# Bundle Audit launch review

Reviewed PR #2 head `d4c126f4870ea98f2be62c7663b1dc4bb50768e2`, not just main. Bundle Audit branding is unchanged. This is a code review, not Fanvue approval or live-account validation.

## Local fixes

- Live audit execution now verifies Fanvue entitlement, using the same restricted development/test bypass as import. The UI provides a connection/plan recovery path when access cannot be verified.
- Payment hydration cannot resolve against an unpaid send or another buyer's purchase. Unscoped message events remain unresolved rather than being matched to an arbitrary fan.
- Empty message pages claiming more history and repeated cursors cannot silently mark history complete. Reaching the page guard marks the import incomplete.
- Updating an existing purchase replaces its attachment rows in a single atomic Prisma nested update.
- Server Action trusted origins use the configured public host instead of trusting every trycloudflare.com tenant.
- README distinguishes API subscription probes from signed Events-tab tests and discloses manual webhook reconciliation.
- Added a PostgreSQL-backed CI workflow to run migrations, all tests, type checking, and production build on Node 22.

## Verification

- 52 tests passed across eight non-database suites, including new pagination, hydration, and audit-access regressions.
- Prisma client generation and TypeScript checks passed after installing dependencies.
- Production build passed locally; runtime used Node 24.22.1, not the required production Node 22. CI targets Node 22.
- Database integration tests were not run locally: no PostgreSQL service was configured. New CI has not been executed on GitHub.
- No Fanvue credentials, live purchase imports, webhook delivery, subscription reads, or charges were used.
- No new visual browser QA was performed. Existing PR screenshot/Playwright claims are not independently verified here.

## Second-pass hardening

- Purchase/SentOffer keys and imported message ownership are recipient-scoped. Added a versioned migration; historical records potentially lost by the old schema require reimport.
- Rotating refresh tokens use a PostgreSQL row lock and bounded transaction, serializing refresh across processes. Added a database concurrency regression test.
- Import completeness uses a revision guard, incremented for imports and webhook invalidation. Reconciliation considers only pending records captured before scanning; newer signals remain incomplete.
- Payment-pending coalescing includes buyer and invoice identity.
- Purchased offers are removed from the unpaid-send table on import.
- Explicit workspace erasure deletes attached request contact/detail records transactionally before deleting the workspace.
- API and token fetches have 15-second timeouts; invalid token expiry is rejected.

## Remaining validation and operational risks

1. Database migration, recipient isolation, refresh concurrency and revision-guard integration tests are included but not executed locally. An attempted temporary PostgreSQL setup was blocked by the runtime's inability to create or switch operating-system users. Run the new PostgreSQL 16 CI workflow before merging.
2. No automatic background import is implemented. Webhooks invalidate coverage and queue reconciliation; the creator must use Reconcile missed updates. Do not advertise automatic real-time freshness.
3. Previously orphaned deletion requests, expired OAuth attempts, unassociated webhook IDs and backups still need a documented retention/cleanup policy chosen by the operator.
4. No live Fanvue integration, multi-buyer broadcast, OAuth refresh, billing lifecycle, or failure recovery was exercised. Schema defenses do not prove API assumptions.
5. Migration deploy/reimport, final legal disclosures, real support contacts, hosting configuration and reviewer access remain launch requirements.

## Fanvue listing requirements mapping

Official reference: https://api.fanvue.com/docs/app-store/listing-requirements

| Requirement | Review finding |
| --- | --- |
| 2.3 accurate listing | Copy appropriately describes manual links and limited PPV photo history. Validate configured price/limits and review actual listing screenshots. |
| 2.4 naming | Bundle Audit retained; no competing-platform name introduced. Name availability was not checked. |
| 2.5 reliability | Improved pagination, hydration, atomic updates, and audit access; database concurrency and live failure checks remain. |
| 2.6 support | Support/security/operator values remain owner-supplied placeholders. |
| 2.7 accuracy | Four result states, preview exclusion and separate reversals are present; recipient scoping and revision guards added; live behavior remains unverified. |
| 3 payments | Fanvue-only checkout and entitlement path exist; real plan configuration and lifecycle validation remain. |
| 4 useful/original app | Implemented purchase-aware audit workflow, not just a landing page. Originality/approval is Fanvue's decision. |
| 4 UI quality | @fanvue/ui is used; fresh visual QA and real preview-asset inspection remain. |
| 5 privacy/security | Encrypted tokens and scoped queries present; final disclosures, retention, concurrent refresh and live checks remain. |
| 6 integration/URL | Requires owned HTTPS domain, configured OAuth and live API validation; homepage includes store link. |

## Owner setup

- Configure owned HTTPS origin, Fanvue OAuth app and read scopes; use separate development and production credentials.
- Configure Fanvue app/plan UUIDs and actual pricing. Test subscription activation, cancellation/expiry and unknown status without initiating unauthorized charges.
- Replace SUPPORT_EMAIL, SECURITY_EMAIL, APP_OWNER_NAME with actual values.
- Finalize privacy/terms, retention, subprocessors and operator details before submission.
- Verify OAuth, existing direct and multi-buyer broadcast purchases, previews, reversible duplicate links, signed webhooks and recovery on dedicated accounts.

## GitHub delivery limitation

Public reads work. Branch creation returned HTTP 403 Resource not accessible by integration after write permission was reportedly enabled. These changes are local and were not pushed or merged. The patch is based on PR #2's head, not main; apply it to that exact revision or rebase carefully.
