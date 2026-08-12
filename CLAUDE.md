# Treasury — shared expense app

Monorepo: `backend/` (Express + MongoDB, TypeScript), `frontend/` (React + MUI,
TypeScript), `e2e/` (Playwright, run from repo root). Root `package.json` only
holds the Playwright suite and test scripts — `backend/` and `frontend/` have
their own dependencies (`npm run install:all` installs all three).

## Running tests

All test commands drive `docker-compose.test.yml`, a stack fully separate from
`docker-compose.yml` (dev). **Never run dev and test stacks at the same time**
— use the scripts below, not raw `docker compose` commands, so the right
Compose project is always targeted.

- `npm run test:unit` — frontend unit tests
- `npm run test:backend` — backend integration tests
- `npm run test:e2e` — full Playwright suite against the dockerized stack
- `npm run test:clean` — tear down the test stack (containers + volumes)

CI (`.github/workflows/tests.yml`) runs all three on every push and PR. Run
`test:e2e` locally before pushing any change to visible copy, labels, roles,
or DOM structure in `frontend/src` — see next section for why.

## e2e tests are text-locator based

`e2e/*.spec.ts` finds elements via `getByRole(..., { name: /.../ })` and
similar, matching on the *visible text/accessible name*, not test IDs or
classes. Any change to button labels, headings, or link text in
`frontend/src` can silently break these locators even when the feature still
works correctly. When you change copy in a component under test, grep
`e2e/` for the old string and update the matching locator in the same change.

## Auth rate limiting

`backend/src/routes/authRoutes.ts` and `backend/src/app.ts` both rate-limit
requests, and both read `NODE_ENV` to loosen limits under test. If you add or
change a rate limiter, gate it the same way, or the e2e suite (which shares
one IP across all specs) will start failing with misleading "element not
found" errors instead of visible 429s.

## Memory

Session history, past incidents, and their root causes are kept in this
Claude Code project's memory files, not here — check memory before assuming
something is undocumented.
