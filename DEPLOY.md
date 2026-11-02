# Deploying Bundle Audit on Vercel

Do these in order. Nothing here is verified against a live Fanvue account yet.

## 1. Database

Vercel does not host PostgreSQL itself. Add one from the Vercel Marketplace (Neon, Supabase, etc.) or use any PostgreSQL 16 host. Copy its connection string for `DATABASE_URL`. Fill the provider and region into the privacy page ("Sharing and service providers").

## 2. Vercel project

- Import `bzucker4/fanvue`. Framework: Next.js. Node.js version: **22.x** (Project Settings, General).
- Build command: `if [ "$VERCEL_ENV" = "production" ]; then npx prisma migrate deploy; fi && npm run build`. Production builds apply migrations, including `20261102140000_recipient_scoped_messages`, before building. Preview builds skip migrations, so a Preview deployment can never change the production database.
- Preview deployments need their own `DATABASE_URL` (a separate database or branch) and separate Fanvue credentials. Never copy the production `DATABASE_URL` into Preview.
- Add a custom production domain you own. It must be HTTPS.

## 3. Environment variables

Set these for **Production**. Preview/Development get separate values: their own database and their own Fanvue credentials.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | from step 1 |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `TOKEN_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `APP_ORIGIN` | `https://your-domain` (no trailing slash). Also the only trusted Server Action origin. |
| `FANVUE_CLIENT_ID`, `FANVUE_CLIENT_SECRET` | Fanvue Developer Area |
| `FANVUE_APP_UUID`, `FANVUE_PLAN_UUID` | Fanvue Developer Area, after you create the app and plan |
| `FANVUE_WEBHOOK_SECRET` | Events tab, per app |
| `SUPPORT_EMAIL` | `atlascreative95@gmail.com` |
| `SECURITY_EMAIL` | `atlascreative95@gmail.com` |
| `APP_OWNER_NAME` | `Brian Zucker` |

Generate the two secrets yourself and paste them straight into Vercel. Do not commit them or share them in chat. Leave `FANVUE_VALIDATION_IMPORT` unset in production (it is ignored there anyway). Changing `TOKEN_ENCRYPTION_KEY` later makes stored tokens unreadable, so creators would need to reconnect.

## 4. Fanvue Developer Area

1. Register the OAuth redirect URL exactly: `https://your-domain/api/oauth/callback`.
2. Scopes: `read:self read:chat read:media read:creator` (plus the system scopes the app adds).
3. Create the pricing plan (price and limits are yours to set) and copy its UUID.
4. Webhook endpoint: `https://your-domain/api/webhooks/fanvue`. Subscribe to `creator.payment.succeeded`, `creator.refund.created`, `creator.dispute.flagged`, `creator.dispute.created`, `creator.message.received`, `creator.message.sent`, `creator.message.mass_sent`.

## 5. Verify on a dedicated test account (before submission)

- OAuth connect and token refresh.
- A direct PPV purchase and a multi-buyer broadcast purchase, including previews.
- Signed Events-tab test event is accepted and creates no purchase.
- Plan states: active, cancelled/expired, unknown. Do not start unauthorized charges.
- After a webhook, **Reconcile missed updates** brings coverage back to complete. Imports are manual; do not advertise real-time sync.
- Workspace erasure.

## Known risks to settle before launch

- **Import length on Vercel.** `runLiveImport` runs inside a Server Action with no `maxDuration` set. A creator with a long chat history may hit the function time limit. Test with a large account, and raise the limit on the page that submits the import (Next.js route segment config) or move imports to a background job.
- **Existing creators must reimport** history after the migration deploys.
- **Legal pages** (`/legal/privacy`, `/legal/terms`) are a first draft with `[bracketed]` items for counsel: governing law, liability cap, retention periods, legal bases, effective date, database provider.
- Retention for orphaned deletion requests, expired OAuth attempts, webhook ids, and backups still needs an owner-approved policy.
- Name availability for "Bundle Audit" has not been checked.
