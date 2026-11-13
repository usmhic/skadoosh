# Identity verification

skaddosh is for original work made by real people. Verification proves that a person is behind an
account, without skaddosh ever seeing their documents. The provider comparison is in
[RESEARCH.md](RESEARCH.md#8-identity-verification).

## When it's needed

Verification is only required for actions that earn or move value:

| Action | Gate |
| --- | --- |
| Publishing a project | `projects.update` when it publishes |
| Selling licences (activating an offer) | `licenses.setOffers` |
| Buying Commercial or Exclusive rights | `licenses.buy` (Personal licences don't need it) |
| Starting a revenue share with a contributor | `contributors.respond` when the split is above 0 |
| Sending Kudos to a wallet or bringing them back | `chain.status` eligibility (see [CHAIN.md](CHAIN.md)) |

Exploring, reading, giving Kudos, backing, and credit-only collaboration never need it.
`assertVerified` throws `PRECONDITION_FAILED` with a friendly sentence. On web, `ActionError` adds a
"Verify now" link to `/welcome?step=verify`. When no provider is configured, every gate is open, so
local development and small self-hosted instances keep working.

## Flow

1. The member chooses **Verify** in onboarding (`/welcome`), on the Studio "Needs you" card, or on
   the mobile Verify screen.
2. `identity.start` creates a Veriff session and returns its hosted URL. `vendorData` is a random
   UUID, so Veriff never receives our user id or email. The callback is
   `/welcome?step=verify&returned=1`. Mobile opens the URL in the system browser
   (`expo-web-browser`).
3. Veriff checks the ID document and runs a liveness selfie in its own accessible, localised flow.
4. Veriff `POST`s the decision to `/api/identity/veriff`. The route checks `X-HMAC-SIGNATURE`
   (hex HMAC-SHA256 of the raw body with `VERIFF_SHARED_SECRET`) and `X-AUTH-CLIENT` in constant
   time, then applies the decision idempotently. Events that aren't decisions are acknowledged and ignored.
5. The member's status becomes `verified` (or `rejected` or `unverified` to retry). Pages poll
   `identity.status` while it's `pending`. A verified member keeps their status, even if a later retry fails.

In the Veriff dashboard, set the decision webhook URL to `https://<host>/api/identity/veriff`.

## What we keep, and what we don't

| Kept | Where | Why |
| --- | --- | --- |
| Status (`unverified`, `pending`, `verified`, `rejected`) and the verified date | `user` | Gating and the Verified mark |
| ISO country of the issuing document | `user.verified_country`, `identity_verification.country` | Jurisdiction rules for on-chain Kudos |
| Provider name and session id, reason code, timestamps | `identity_verification` | Support, audit, and matching webhooks |

**Never received or stored:** document images, selfies, document numbers, names or dates of birth
from the document, or addresses. Webhook payloads aren't logged. Nothing about verification is
written on-chain. The profile only shows a small Verified mark.

Retention:

- `identity_verification` rows are deleted with the account (`ON DELETE CASCADE`).
- In Veriff, set media retention to the shortest period your compliance needs allow. Veriff is the
  controller of the media it captures for this purpose. Mention it in your privacy notice as a
  processor and sub-processor.
- Verification happens under GDPR Article 6(1)(b) and (f): it's needed for the creator features the
  member asks for, and to prevent fraud. Biometric matching happens only at Veriff, with explicit consent
  inside its flow.

## Accessibility and reach

- Veriff's hosted flow supports screen readers, more than 45 languages, and documents from over 190
  countries. Members who can't complete it can contact support. After a video check, an operator can
  record the decision with a one-off script that calls `applyDecision`. That still stores no documents.
- The flow works in mobile browsers. The native app hands off to the system browser rather than
  embedding a camera SDK, which keeps the app small and avoids handling images.

## Configuration

| Variable | Meaning |
| --- | --- |
| `IDENTITY_PROVIDER` | `veriff`, `mock`, or empty (verification off) |
| `VERIFF_API_KEY` | Public API key (`X-AUTH-CLIENT`) |
| `VERIFF_SHARED_SECRET` | HMAC secret for requests and webhooks. Server-only. |
| `VERIFF_BASE_URL` | For example `https://stationapi.veriff.com` |

The `mock` provider is for development and demos only. It sends the member to
`/welcome/verify-mock`, where they choose an outcome. It is refused when `NODE_ENV=production`.

## Swapping providers

The provider interface is three functions in `packages/api/src/lib/identity.ts`:
`startVerification`, a signature check, and a decision parser that feeds `applyDecision`. To add
Didit or Sumsub, implement those three and a webhook route. The schema and gates stay the same.
