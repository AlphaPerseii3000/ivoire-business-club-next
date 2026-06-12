# IBC Playwright E2E tests

These tests target the deployed IBC site by default and can also run against a local Next.js server.

## Targets

- Production default: `https://ivoire-business-club.com`
- Override target: `BASE_URL=https://your-host npm run test:e2e`
- Local target: `npm run test:e2e:local` (expects `http://localhost:3000`)

## Required accounts

Create durable test accounts on the target environment. Do not seed or truncate the production database from Playwright.

- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`: role `ADMIN`, tier `BOSS`, subscription `ACTIVE`
- `E2E_AFFRANCHI_EMAIL` / `E2E_AFFRANCHI_PASSWORD`: role `MEMBER`, tier `AFFRANCHI`
- `E2E_GRANDFRERE_EMAIL` / `E2E_GRANDFRERE_PASSWORD`: role `MEMBER`, tier `GRAND_FRERE`, subscription `ACTIVE`
- `E2E_BOSS_EMAIL` / `E2E_BOSS_PASSWORD`: role `MEMBER`, tier `BOSS`, subscription `ACTIVE`
- Optional `E2E_CANCELLED_EMAIL` / `E2E_CANCELLED_PASSWORD`: inactive subscription for premium-blocked dashboard coverage
- Optional `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD`: alias for the default authenticated member fixture

## Optional fixture records

Use stable IDs for non-mutating production assertions:

- `E2E_BOSS_OPPORTUNITY_ID`: verified opportunity requiring tier `BOSS`
- `E2E_VERIFIED_OPPORTUNITY_ID`: verified opportunity visible to eligible members
- `E2E_PENDING_OPPORTUNITY_ID`: pending opportunity visible to admins/authors
- `E2E_REJECTED_OPPORTUNITY_ID`: rejected opportunity for visibility checks
- `E2E_OPPORTUNITY_WITH_DOCUMENT_ID` and `E2E_PRIVATE_DOCUMENT_ID`: private document permission checks
- `E2E_PENDING_SUBSCRIPTION_ID`: pending subscription row in admin subscriptions
- `E2E_BOSS_SENSITIVE_TEXT`: text that must never appear in the DOM for gated AFFRANCHI access

## Production safety

Mutating tests are disabled by default. Enable them only on local/staging, or after approving idempotent production records:

- `E2E_ENABLE_SIGNUP_CREATE=1`
- `E2E_CREATE_OPPORTUNITY=1`
- `E2E_UPLOAD_DOCUMENT=1`
- `E2E_SUBMIT_TRANSFER=1`

## Running

```bash
cp e2e/.env.test.example e2e/.env.test
# export variables from your shell or CI secret store
npm run test:e2e
npm run test:e2e:local
npx playwright test --list
```

The tests use `data-testid` selectors where routes/forms need stable locators and fall back to accessible names for content that is intentionally user-facing.
