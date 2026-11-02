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

- OAuth 2.0 with PKCE at `https://auth.fanvue.com/oauth2/auth`, token exchange with `client_secret_basic` at `https://auth.fanvue.com/oauth2/token`. Refresh tokens are rotated and stored before they are used again.
- Scopes: `read:self`, `read:chat`, `read:media`, `read:creator`, plus `openid`, `offline_access`, and `offline`. No write scopes.
- Purchase backfill uses `GET /chats/{userUuid}/messages` with `markAsRead=false` and `beforeMessageUuid`. Fanvue documents that per-chat history includes broadcast messages. `POST /chats/messages/batch` is not used, because that bulk read excludes mass messages.
- A missing `pagination.hasMore` stops that chat and marks coverage incomplete instead of guessing.
- `purchasedAt` on a priced message is the purchase timestamp. `mediaPreviewUuid` is excluded from paid attachments.
- Media metadata is stored as ids, type, and status. Signed variant URLs are resolved for the current thumbnail view and are not written to the database. Media files are not downloaded for fingerprinting.
- Webhooks: unsigned `fanvue.webhook.verification` returns 200. Every other delivery must pass `X-Fanvue-Signature` (HMAC-SHA256 over `{timestamp}.{rawBody}`, 300 second tolerance, multiple `v0` MACs during rotation). Envelope events are deduped on `id`. Unknown topics are stored and acknowledged so the endpoint is not failed shut.
- `creator.payment.succeeded` with `source: "message"` schedules a per-chat read. The event has a message id, not media ids, so the app does not invent attachments. Other payment sources are noted as outside this photo audit.
- `creator.message.sent` is not a purchase. `creator.refund.created` and dispute events create reversal rows and do not delete the purchase.
- API calls send `X-Fanvue-API-Version: 2025-06-26`, keep at most 5 requests in flight, and retry `429` responses using `Retry-After`.
- Live import and live audit require `GET /apps/{appUuid}/subscription/me` to report an active Fanvue subscription. The pay link is the documented App Store deeplink `https://www.fanvue.com/app-store/details/{appUuid}?plan={planUuid}`. There is no external checkout.

## Setup

Requirements: Node.js 22, PostgreSQL 16.

```bash
cp .env.example .env
# Fill SESSION_SECRET (32+ characters) and TOKEN_ENCRYPTION_KEY (32 bytes, base64).
# Generate a key with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 and choose “Open the sample audit”. The demo needs `DATABASE_URL` and `SESSION_SECRET` only.

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
5. `GET /chats` is documented with `page` and `size`. `pagination.hasMore` is documented for messages. A short chat page ends the list. A message page without `hasMore` is incomplete. Is there a cursor for the chat list that should replace page numbers?
6. No get-message-by-uuid route was used. `startDate` is exclusive and can miss a message sent before `paid_at`, so reconciliation walks per-chat history. Is there a supported single-message read?
7. `creator.message.mass_sent` describes the send, not each fan. Per-fan broadcast purchases are taken from the per-chat copy’s `purchasedAt`. Confirm that the per-chat message uuid matches the mass-message uuid when a webhook has to be hydrated.
8. `subscription/me` returns at most 100 managed creators and omits a creator whose subscription could not be read. This version connects the authorizing user from `GET /users/me` and does not switch agency creators. Should agency staff be in scope?
9. A free Fanvue plan that reports `hasActiveSubscription: true` unlocks live import. The owner must configure the actual paid plan in Fanvue.
10. Homepage store link is `https://www.fanvue.com/app-store`. Listing deeplinks use `https://www.fanvue.com/app-store/details/{appUuid}`. Confirm the index URL is the required store link before review.
11. Chat list reads are assumed to have no unread side effect. Only message reads set `markAsRead=false`, because that default is documented as `true`.
12. Retention, the legal entity, support mail, security mail, and the privacy and terms text still need the owner and counsel. Deletion inside the app is immediate for that workspace and does not delete data inside Fanvue.
13. Age verification can return 403 with `ageVerificationUrl` on media reads. The import records that gap. It is not yet confirmed whether message history is blocked by the same check in every region.
