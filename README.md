# Bundle Audit

Bundle Audit helps a Fanvue creator check a proposed PPV photo bundle against purchases already on record, including a photo that was uploaded more than once under different media IDs.

It is an independent app. It is not affiliated with, endorsed by, or produced by Fanvue.

Three records stay separate:

- **Upload** — one Fanvue media ID.
- **Content identity** — uploads a creator has confirmed are the same photo. Suggestions do not count, and confirming one pair does not confirm a chain of other suggestions.
- **Purchase** — a fan bought a priced chat message whose paid attachments include that content. A free preview is stored beside the purchase and is not a paid attachment. A priced message with no `purchasedAt` was sent, not purchased. A refund or dispute is a separate record and is not treated as proof the fan never received the photo.

An item result is one of:

- Confirmed purchase overlap
- Possible duplicate requiring review
- No known purchase overlap
- Incomplete or unsupported history

“No known purchase overlap” is not a claim that a fan has never seen the photo. The audit shows coverage and the last synchronization time.

## Demo

The sample workspace is labeled and stored separately from any live creator. It uses still-life illustrations, not Fanvue media.

Jordan Hale bought a direct PPV message containing the stoneware vase (A), the linen notebook (B), and the brass lamp (C). The cotton swatch on that message is the free preview. The notebook was uploaded again as B2. A proposed bundle named “Spring still life” contains B2, the lamp (C), and the oak bowl (D).

Before you confirm the duplicate, B2 is only a possible match and the lamp is a confirmed overlap. After you confirm B and B2 are the same photo, the audit flags B2 and the lamp, with no known purchase match for the bowl.

The sample also includes a broadcast purchase of a postcard with a separate refund, a priced olive sprig that was sent and not purchased, and a pressed fern that is only suggested as similar to B2. Confirming the notebook does not confirm the fern.

Missing Fanvue credentials never fill a live workspace with this sample.

## Screens

- `/` overview, with a link to the [Fanvue App Store](https://www.fanvue.com/app-store)
- `/connect` Fanvue connection, or the labeled demo
- `/workspace/connection` import status, coverage, and purchase evidence
- `/workspace/library` media library and duplicate-review queue
- `/workspace/bundles` bundle builder, audience, and audit
- `/workspace/settings` support and data deletion
- `/legal/privacy`, `/legal/terms`, `/support`, `/security`

Privacy, terms, support, and the security contact include a banner where the owner and counsel still have to finish the text. `support@example.com`, `security@example.com`, and `[App owner legal name]` are placeholders.

## Live Fanvue behavior

Documented behavior this app follows (checked against https://api.fanvue.com/docs/llms.txt and the guides linked there):

- OAuth 2.0 with PKCE at `https://auth.fanvue.com/oauth2/auth`, token exchange with `client_secret_basic` at `https://auth.fanvue.com/oauth2/token`. This is the hand-written confidential-client flow from Fanvue’s implementation guide. The Builder SDK is optional and is not used. Refresh tokens are rotated and stored before they are used again.
- Scopes: `read:self`, `read:chat`, `read:media`, `read:creator`, plus `openid`, `offline_access`, and `offline`. No write scopes.
- Purchase backfill uses the unversioned `GET /chats/{userUuid}/messages` with `markAsRead=false` and `beforeMessageUuid`. Fanvue documents that this per-chat history includes broadcast messages. The `/v1` message route removes those parameters and `pagination.hasMore`, so message reads stay on the unversioned route. `POST /chats/messages/batch` is not used, because that bulk read excludes mass messages.
- Chat and media lists use `GET /v1/chats` and `GET /v1/media`. Both walk `nextCursor` and stop when it is null. A missing cursor marks that list incomplete. Variant URLs are not requested on the media import.
- A missing `pagination.hasMore` stops that chat and marks coverage incomplete instead of guessing.
- `purchasedAt` on a priced message is the purchase timestamp. `mediaPreviewUuid` is excluded from paid attachments.
- Media metadata is stored as ids, type, and status. Signed variant URLs are resolved for the current thumbnail view and are not written to the database. Media files are not downloaded for fingerprinting.
- Webhooks: unsigned `fanvue.webhook.verification` returns 200. Every other delivery must pass `X-Fanvue-Signature` (HMAC-SHA256 over `{timestamp}.{rawBody}`, 300 second tolerance, multiple `v0` MACs during rotation). Envelope events are deduped on `id`. Unknown topics are stored and acknowledged so the endpoint is not failed shut.
- `creator.payment.succeeded` with `source: "message"` schedules a per-chat read. The event has a message id, not media ids, so the app does not invent attachments. Other payment sources are noted as outside this photo audit.
- `creator.message.sent` is not a purchase. `creator.refund.created` and dispute events create reversal rows and do not delete the purchase.
- API calls send `X-Fanvue-API-Version: 2025-06-26`, keep at most 5 requests in flight, and retry `429` responses using `Retry-After`.
- Paid live import requires `GET /apps/{appUuid}/subscription/me` to report an active Fanvue subscription. The pay link is the documented App Store deeplink `https://www.fanvue.com/app-store/details/{appUuid}?plan={planUuid}`. There is no external checkout. `FANVUE_VALIDATION_IMPORT=true` is ignored unless `NODE_ENV` is `development` or `test` and the connected Fanvue user id is listed in `FANVUE_VALIDATION_CREATOR_IDS`. `npm start` sets production and ignores the flag. Other creators still need a Fanvue plan. The workspace is labeled as a validation import. Demo purchases are not used.

## Setup

Requirements: Node.js 22, PostgreSQL 16.

```bash
cp .env.example .env
# SESSION_SECRET: at least 32 characters. Use 32 random bytes as hex:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# TOKEN_ENCRYPTION_KEY: standard base64 that decodes to exactly 32 bytes:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 and choose “Open the sample audit”. The demo needs `DATABASE_URL` and `SESSION_SECRET` only.

## Run and deploy

This repository has no Dockerfile or host config. It runs as a Node.js process in front of PostgreSQL.

Local development:

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

`npm run dev` sets `NODE_ENV=development`, which is the only app runtime that can honor the validation allowlist.

Production on a Node host, with PostgreSQL reachable through `DATABASE_URL` and secrets set in the host, not in git:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
npm start
```

`npm start` sets `NODE_ENV=production`. Put TLS in front of the process. Fanvue must be able to reach `https://<your-origin>/api/webhooks/fanvue`. Do not commit `.env`.

## Validate one connected account

Fanvue has no sandbox. Every call hits the live API, and this app does not send messages or start a charge. The credentials below were empty in the environment that built this revision, so OAuth, import, and webhook delivery were not executed against Fanvue. The steps are what a test creator account needs.

1. In the Fanvue Developer Area, create an app. API-only is enough to authorize and call the API. Choose off-platform, with your public HTTPS origin, when you want an App Store listing and Fanvue billing. Keep a separate app for production.
2. On Authentication, enable `read:self`, `read:chat`, `read:media`, and `read:creator`. Add the redirect URI exactly: `{APP_ORIGIN}/api/oauth/callback`. Copy the client id and the client secret once.
3. Register a second Fanvue account as the test creator. Authorize that account, not the account that owns the app. Do not put a password into Bundle Audit.
4. Put the client id, client secret, `APP_ORIGIN`, `TOKEN_ENCRYPTION_KEY`, and `SESSION_SECRET` in `.env`. Leave `FANVUE_APP_UUID` empty until the app has billing, or set it together with `FANVUE_PLAN_UUID`.
5. Run `npm run dev` with `FANVUE_VALIDATION_IMPORT=true`. Connect the test creator first. Copy the Fanvue user id shown on the connection screen into `FANVUE_VALIDATION_CREATOR_IDS`, then restart the dev server. `npm start` ignores this bypass. Any other connected creator still needs an active Fanvue plan. The flag does not load the sample story.
6. Open `/connect` and choose Continue to Fanvue. Accept the four read scopes. The callback stores encrypted tokens and opens `/workspace/connection`.
7. The purchased PPV has to already exist in that creator’s chats. Create it in Fanvue’s own UI if you need one. This app has no `write:chat` scope and will not send it. Import purchase history. A successful import lists the fan, the paid attachments, the free preview, and whether broadcasts were included.
8. In the library, confirm a duplicate only when you know two media ids are the same photo. Suggestions are not created automatically. Build a bundle from the reuploaded photo plus another purchased photo and one new photo, select the fan who bought the original, and open the audit. Confirmed overlap should cite the message id, price, and purchase time. The new photo should say no known purchase only when coverage is complete.
9. Webhooks need a public HTTPS URL `{APP_ORIGIN}/api/webhooks/fanvue` and `FANVUE_WEBHOOK_SECRET` from the Events tab. Subscribe to `creator.payment.succeeded`, `creator.refund.created`, `creator.dispute.flagged`, `creator.dispute.created`, `creator.message.received`, `creator.message.sent`, and `creator.message.mass_sent`. A local process is not reachable by Fanvue until you give it a public HTTPS origin. Use the Events tab test delivery after you have authorized the app. Reconciliation is “Reconcile missed updates”, which walks per-chat history again. `startDate` is not used as the only catch-up, because it filters on send time and can miss a later purchase of an older message.

`npm test` covers this path with fixtures shaped like the documented message, payment, and mass-message payloads. That is not a substitute for steps 6 through 9 on a real account.

Live mode also needs:

| Variable | Purpose |
| --- | --- |
| `FANVUE_CLIENT_ID` | OAuth client id |
| `FANVUE_CLIENT_SECRET` | OAuth client secret. Server only. Shown once in the Developer Area. |
| `APP_ORIGIN` | Public origin, no trailing slash. Production must be HTTPS. |
| `FANVUE_REDIRECT_URI` | Optional. Defaults to `{APP_ORIGIN}/api/oauth/callback`. Register that exact URI. |
| `TOKEN_ENCRYPTION_KEY` | Encrypts access tokens, refresh tokens, and the PKCE verifier. |
| `FANVUE_APP_UUID` | Enables subscription checks and the listing link. |
| `FANVUE_PLAN_UUID` | Active pricing-plan id for the App Store deeplink. |
| `FANVUE_WEBHOOK_SECRET` | Per-app signing secret from the Events tab. |
| `FANVUE_SCOPES` | Optional override. Defaults to the four read scopes above. |
| `FANVUE_VALIDATION_IMPORT` | Optional. `true` only while `NODE_ENV` is `development` or `test`. Ignored by `npm start`. |
| `FANVUE_VALIDATION_CREATOR_IDS` | Required for that bypass. Comma-separated Fanvue user uuids. Other creators are not included. |
| `SUPPORT_EMAIL` | Public support address. Replace the example. |
| `SECURITY_EMAIL` | Vulnerability contact. Replace the example. |
| `APP_OWNER_NAME` | Legal name of the operator. Replace the placeholder. |

Register the webhook URL `{APP_ORIGIN}/api/webhooks/fanvue` for `creator.payment.succeeded`, `creator.refund.created`, `creator.dispute.flagged`, `creator.dispute.created`, `creator.message.received`, `creator.message.sent`, and `creator.message.mass_sent`. Those creator events need the scopes above on the creator’s grant.

A suggested App Manifest fragment is in `fanvue/app-manifest.example.json`. Check it against the current manifest schema before hosting it. The owner still has to set the real redirect URI and app URL.

Paid plans are created in the Fanvue Developer Area. This repository does not set a price.

## Tests

```bash
npm test
npm run typecheck
```

The database isolation test uses `DATABASE_URL` and deletes only the workspaces it creates.

## Scope of this version

Photo bundles and purchased PPV chat photo attachments only. Read-only. No sending, deletion of Fanvue files, video matching, cross-platform fan matching, or training on creator data.

## Open questions

These were not settled by the documentation used for this build. The app fails closed where a guess would change an audit result.

1. No documented content hash or perceptual hash was found on media reads. Duplicate linking stays manual until Fanvue documents a permitted fingerprint. Is on-demand thumbnail display, without storing the URL or the file, acceptable?
2. `GET /insights/earnings` records message purchases, but the insights guide does not show media UUIDs on those rows. This app treats per-chat `purchasedAt` plus `mediaUuids` as the attachment source. Is that the supported historical source?
3. `creator.payment.succeeded` with `source: "media"` has no media ids here. It is recorded as unsupported rather than mapped to a chat attachment. Is that source ever a chat PPV?
4. Message webhooks include `media_uuids` “including its preview” but do not name the preview uuid and do not include `purchasedAt`. The app will not infer either from the webhook.
5. Chat and media lists now follow the documented `/v1` cursor (`nextCursor`). Message history stays on the unversioned route because `/v1/chats/{userUuid}/messages` removes `markAsRead`, `beforeMessageUuid`, `startDate`, and `pagination.hasMore`, and its guide does not say whether broadcasts and unread behavior are unchanged. Is the v1 message route a safe replacement for a read-only backfill?
6. No get-message-by-uuid route was used. `startDate` is exclusive and can miss a message sent before `paid_at`, so reconciliation walks per-chat history. Is there a supported single-message read?
7. `creator.message.mass_sent` describes the send, not each fan. Per-fan broadcast purchases are taken from the per-chat copy’s `purchasedAt`. Confirm that the per-chat message uuid matches the mass-message uuid when a webhook has to be hydrated.
8. `subscription/me` returns at most 100 managed creators and omits a creator whose subscription could not be read. This version connects the authorizing user from `GET /users/me` and does not switch agency creators. Should agency staff be in scope?
9. A free Fanvue plan that reports `hasActiveSubscription: true` unlocks live import. The owner must configure the actual paid plan in Fanvue.
10. Homepage store link is `https://www.fanvue.com/app-store`. Listing deeplinks use `https://www.fanvue.com/app-store/details/{appUuid}`. Confirm the index URL is the required store link before review.
11. Chat list reads are assumed to have no unread side effect. Only message reads set `markAsRead=false`, because that default is documented as `true`.
12. Retention, the legal entity, support mail, security mail, and the privacy and terms text still need the owner and counsel. Deletion inside the app is immediate for that workspace and does not delete data inside Fanvue.
13. Age verification can return 403 with `ageVerificationUrl` on media reads. The import records that gap. It is not yet confirmed whether message history is blocked by the same check in every region.
