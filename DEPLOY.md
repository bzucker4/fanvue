# Deploying Bundle Audit on Vercel

Do these in order. Nothing here is verified against a live Fanvue account yet.

## Free testing setup (Vercel Hobby + Neon free)

Use this to test end to end with a dedicated Fanvue test account at no cost. It is **not** a launch setup: Vercel Hobby is limited to personal, non-commercial use, and serverless time limits can cut off long imports. Check the current Vercel and Neon free-tier terms before relying on them. Move to an always-on host before submitting to Fanvue.

1. **Database:** create a free Neon project (neon.tech, or Vercel Marketplace), in a US region close to your Vercel functions. Copy the **direct** (non-pooled) connection string and use it as `DATABASE_URL`. The Prisma schema has no separate migration URL, and `prisma migrate deploy` can fail through Neon's pooler. Direct connections are fine at test scale; revisit pooling (a `directUrl` in the schema) before real traffic.
2. **Vercel project `bundle-audit`:** already created with Node 22.x, the production-only migration build command, and Vercel Auth on previews only (so the production URL is public for webhooks and OAuth). Confirm under Settings, Git that it is connected to `bzucker4/fanvue`; connect it if not.
3. **Env vars (Production):** the table in step 3 below. `SUPPORT_EMAIL`, `SECURITY_EMAIL` and `APP_OWNER_NAME` are already set. Still to add: `DATABASE_URL`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, the Fanvue values, and `APP_ORIGIN`.
4. **First deploy, then `APP_ORIGIN`:** the project's `*.vercel.app` address is not known until it deploys. Deploy once, read the production URL under Domains, set `APP_ORIGIN` to it (no trailing slash), register `{APP_ORIGIN}/api/oauth/callback` in the Fanvue Developer Area, and redeploy.
5. **Fill the privacy page:** once the Neon project exists, replace the database-region bracket on `/legal/privacy`.

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
| `CRON_SECRET` | `openssl rand -base64 32`. Authorizes the daily cleanup of abandoned sign-in attempts (`vercel.json`). Vercel sends it automatically. |
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
- Abandoned OAuth sign-in attempts are deleted daily by a Vercel Cron job (`vercel.json`, needs `CRON_SECRET`). Retention for orphaned deletion requests, webhook ids, and backups still needs an owner-approved policy.
- Name availability for "Bundle Audit" has not been checked.
